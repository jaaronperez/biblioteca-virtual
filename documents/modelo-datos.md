# Modelo de datos

Modelo NoSQL del proyecto Biblioteca Virtual Eclesiástica sobre **Azure Cosmos DB for NoSQL**. Ver el stack en [stack-tecnologico.md](stack-tecnologico.md) y el flujo de los libros en [pipeline.md](pipeline.md).

> Estado: **borrador**. Las decisiones de la tabla siguen la recomendación que el usuario aceptó el 2026-10-04. Lo que está en "Pendiente por definir" sigue abierto. La cuenta, la base de datos `biblioteca` y los dos contenedores se crearon el 2026-10-04 con las políticas de este documento y se verificaron con `az`, y el mismo día una consulta de prueba en español con `FullTextContains` funcionó: buscar `bautismo` encontró una página cuyo texto decía `bautismos`. Falta probar el inglés y el costo en RU con datos reales.

## Estructura en Cosmos DB

Cuenta de Cosmos DB, una base de datos y dos contenedores: `libros` y `paginas`. Un contenedor de Cosmos es el equivalente a una tabla o colección y no es lo mismo que un contenedor de Blob Storage (`libros-escaneados` y `portadas`). Algunas decisiones se toman por contenedor al crearlo, como la partition key y la política de texto completo.

## Contenedor `libros`

Un documento por libro. Partition key: `/id`.

| Campo | Descripción |
|---|---|
| `id` | ID del libro, formato `LIB-0001`. Es el mismo del PDF, de la portada y de la hoja de registro. |
| `titulo` | Título del libro, sin el autor. |
| `autor` | Autor, de la columna `Autor` de la hoja de registro. Opcional. |
| `iglesia` | Denominación a la que pertenece (por ejemplo `Iglesia Católica`), de una lista cerrada. |
| `tipo` | Tipo de libro, de una lista cerrada de 11 valores (pestaña `Listas` de la hoja de registro). |
| `idioma` | Idioma principal del libro: `es` o `en`. En la hoja se elige `Español` o `Inglés`. Decide el modelo del OCR y el campo de texto de cada página. |
| `fecha` | Fecha como se escribió en la hoja, en texto libre (por ejemplo `1950 a 1955`). |
| `anioDesde`, `anioHasta` | Año inicial y final como números, para filtrar por rango. La hoja de registro los calcula a partir de `fecha`. |
| `descripcion` | Opcional. La app la muestra en el detalle del libro (ver "Pendiente por definir"). |
| `capitulos` | Arreglo opcional de capítulos: título, página inicial y página final. |
| `pdf` | Nombre del blob en `libros-escaneados` (por ejemplo `LIB-0001.pdf`). |
| `portada` | Nombre del blob en `portadas` (por ejemplo `LIB-0001.jpg`). |
| `numPaginas` | Número de páginas del PDF. |
| `estado` | `subido` (el PDF ya está en Azure), `procesado` (OCR y portada listos) o `error`. |

Ejemplo (valores de relleno):

```json
{
  "id": "LIB-0770",
  "titulo": "Meditaciones para cada día del año",
  "autor": "Anónimo",
  "iglesia": "Iglesia Católica",
  "tipo": "Espiritualidad y devoción",
  "idioma": "es",
  "fecha": "1905",
  "anioDesde": 1905,
  "anioHasta": 1905,
  "capitulos": [],
  "pdf": "LIB-0770.pdf",
  "portada": "LIB-0770.jpg",
  "numPaginas": 312,
  "estado": "procesado"
}
```

## Contenedor `paginas`

Un documento por página del libro. Partition key: `/bookId`.

| Campo | Descripción |
|---|---|
| `id` | ID único de la página: el ID del libro más el número (por ejemplo `LIB-0770-p0001`). Es determinista, para poder repetir el procesamiento sin duplicar. |
| `bookId` | ID del libro. Partition key: abrir un libro lee una sola partición. |
| `numero` | Número de página dentro del PDF. |
| `idioma` | Idioma del libro (`es` o `en`), copiado de `libros`. |
| `textoEs` o `textoEn` | Texto extraído por el OCR. Cada página usa **uno solo** de los dos campos, según su idioma. Son dos campos porque el índice de texto completo de Cosmos define el idioma por ruta (propuesta, verificar al crear la cuenta). |
| `iglesia`, `tipo`, `anioDesde`, `anioHasta` | Copia de los datos del libro, para filtrar sin cruzar contenedores. |
| `ocr` | Objeto con `motor`, `idioma` (el modelo que se usó, por ejemplo `spa` o `eng`) y `confianza` de la página, para encontrar las páginas mal leídas. |

Ejemplo (valores de relleno):

```json
{
  "id": "LIB-0770-p0001",
  "bookId": "LIB-0770",
  "numero": 1,
  "idioma": "es",
  "textoEs": "texto que extrajo el OCR",
  "iglesia": "Iglesia Católica",
  "tipo": "Espiritualidad y devoción",
  "anioDesde": 1905,
  "anioHasta": 1905,
  "ocr": { "motor": "tesseract", "idioma": "spa", "confianza": 0.91 }
}
```

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Un documento por página | Sí | Límite de 2 MB por documento y búsqueda más precisa. Una página pesa unos pocos KB. |
| Partition key de `libros` | `/id` | Son unos 3000 documentos pequeños. El valor de la partition key no se puede cambiar en un documento ya creado, así que no puede ser un dato corregible como la iglesia. |
| Partition key de `paginas` | `/bookId` | La búsqueda dentro de un libro consulta una sola partición. |
| Filtros copiados a cada página | Sí | Cosmos no cruza contenedores. Con los filtros en la página, la búsqueda por palabra y filtros es una sola consulta. Cuesta unos MB de espacio. Si se corrige un dato del libro, hay que actualizar sus páginas. |
| Nombre del blob, no URL | Sí | Un cambio de cuenta o de acceso no rompe los datos. La API arma el enlace o la SAS. |
| Fecha | Texto más `anioDesde` y `anioHasta` | Los números permiten filtrar por rango. |
| Estado en Cosmos | `subido`, `procesado` o `error` | Los estados anteriores al PDF viven solo en la hoja de registro. Cosmos solo tiene los libros ya subidos. |
| Capítulos | Arreglo opcional dentro de `libros` | El OCR no los detecta. Un contenedor aparte sería exagerado. |
| Alcance de los libros | Todos son impresos (decidido el 2026-10-04) | El OCR gratuito rinde bien con texto impreso. Los manuscritos pedirían reconocimiento de escritura a mano, y los registros parroquiales traen datos personales. |
| Idiomas | Español e inglés (decidido el 2026-10-04) | Tesseract tiene modelos para ambos y la búsqueda de texto completo de Cosmos DB soporta los dos idiomas. |
| Campo `idioma` en `libros` y `paginas` | Sí (decidido el 2026-10-04) | Le dice al OCR con qué modelo leer (`es` con `spa`, `en` con `eng`) y a qué campo de texto va cada página. Sale de la columna `Idioma` de la hoja. |
| Texto por idioma | Dos campos, `textoEs` y `textoEn` (propuesta) | El índice de texto completo define el idioma por ruta, así que cada idioma necesita su propio campo. |

## Búsqueda e indexación

La búsqueda por palabras clave usa la búsqueda de texto completo de Cosmos DB, en español (`es-ES`) y en inglés (`en-US`), cada idioma en su propia ruta de texto. No es automática: hay que definirla al crear el contenedor `paginas`, y conviene tratarla como definitiva. El latín no está soportado. Según la documentación de Microsoft (verificada el 2026-10-04), solo el inglés está disponible de forma general: el español y los demás idiomas están en vista previa temprana. Hay que activar en la cuenta las funciones `Full-Text & Hybrid Search for NoSQL API` y `New features for full-text search`, pueden no estar disponibles en todas las regiones, y la eliminación de palabras vacías solo existe para inglés.

Política de texto completo (forma aproximada, verificar al crear el contenedor):

```json
{
  "defaultLanguage": "es-ES",
  "fullTextPaths": [
    { "path": "/textoEs", "language": "es-ES" },
    { "path": "/textoEn", "language": "en-US" }
  ]
}
```

Política de indexación de `paginas`: dejar la indexación automática para los campos pequeños (filtros, `numero`, `idioma`), excluir de ella los campos de texto largos e indexar esos campos solo con el índice de texto completo. Un índice normal sobre un texto largo no sirve y gasta espacio y RU. Se prefiere excluir solo esos dos campos, y no `/*` entero, porque es el patrón que muestra la documentación de Microsoft junto al índice de texto completo.

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [{ "path": "/*" }],
  "excludedPaths": [
    { "path": "/textoEs/*" }, { "path": "/textoEn/*" }, { "path": "/\"_etag\"/?" }
  ],
  "fullTextIndexes": [{ "path": "/textoEs" }, { "path": "/textoEn" }]
}
```

`libros` usa la indexación automática por defecto, porque son pocos documentos.

Consultas de ejemplo (ilustrativas, sin probar):

```sql
-- Dentro de un libro en español (una sola partición)
SELECT c.numero FROM c
WHERE c.bookId = "LIB-0770" AND FullTextContains(c.textoEs, "bautismo")

-- Búsqueda avanzada en libros en español (varias particiones)
SELECT TOP 20 c.bookId, c.numero FROM c
WHERE c.idioma = "es"
  AND c.iglesia = "Iglesia Católica"
  AND c.anioDesde <= 1955 AND c.anioHasta >= 1950
  AND FullTextContains(c.textoEs, "bautismo")
ORDER BY RANK FullTextScore(c.textoEs, "bautismo")
```

Para buscar en los dos idiomas a la vez habría que combinar una consulta por campo, y no se ha probado cómo se ordena el resultado. La búsqueda avanzada recorre varias particiones, y su costo en RU se mide en las pruebas de carga de la Fase 4. Para tolerar los errores del OCR, `FullTextContains` acepta búsqueda aproximada con una distancia de hasta 2 ediciones, por ejemplo `FullTextContains(c.textoEs, {"term": "bautismo", "distance": 1})`.

## Pendiente por definir

- [ ] Capítulos: si los libros los tienen y quién los captura. Opción: proponerlos a partir del índice del libro con el OCR, como una etapa posterior que una persona revisa. Lo mismo vale para el `autor`. Se probaría primero con los 5 libros de prueba
- [ ] `descripcion`: el OCR no la puede extraer del texto. La actividad espera una descripción en la pantalla "Detalles del libro (título, autor, descripción, etc.)" (diapositiva 9). Propuesta: una descripción básica armada con los datos del libro (autor, año, tipo y páginas), para que la pantalla nunca quede vacía, y texto escrito a mano para unos pocos libros destacados. Opciones posteriores: un resumen generado por un modelo de lenguaje y marcado como automático, o metadatos de un catálogo externo para los libros que vienen de Internet Archive
- [ ] Confirmar que `iglesia` es la denominación. Si luego hace falta la parroquia o el templo, agregar un campo opcional
- [ ] Cómo llegan los metadatos de la hoja a Cosmos: exportar la hoja y cargarla con un script, o que el script lea la hoja por la API de Sheets. El script debe leer las columnas por el nombre del encabezado, no por la letra, y convertir `Español` e `Inglés` en `es` y `en`
- [ ] Verificar al crear la cuenta de Cosmos (región, suscripción, serverless o nivel gratuito) que la búsqueda de texto completo funcione en español y en inglés. Ya se comprobó que `paginas` acepta las dos rutas de texto en el mismo contenedor (`es-ES` y `en-US`); el español ya se probó con un documento (2026-10-04) y falta probar el inglés. Plan B: un arreglo `palabras` por página con las palabras normalizadas, indexado de forma normal
- [ ] Búsqueda con dos campos de texto: la API debe elegir `textoEs` o `textoEn` según el idioma de la búsqueda, y para buscar en los dos a la vez combinar ambos con `OR`. Falta probar esa consulta y cómo se ordenan los resultados entre dos campos (con un documento en inglés de prueba)
- [ ] Libros con los dos idiomas: hoy cada libro tiene un idioma principal. Si hay libros mezclados, decidir con qué modelo del OCR se leen (por ejemplo `spa+eng`) y en qué campo se guarda el texto
- [ ] Herramienta de OCR y sus valores para el objeto `ocr`
