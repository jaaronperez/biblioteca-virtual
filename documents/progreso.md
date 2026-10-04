# Progreso del proyecto

Última actualización: 2026-10-04

Contexto y cronograma: [contexto-proyecto.md](contexto-proyecto.md) · Stack: [stack-tecnologico.md](stack-tecnologico.md) · Pipeline: [pipeline.md](pipeline.md) · Modelo de datos: [modelo-datos.md](modelo-datos.md)

## Estado por fase

| Fase | Semanas | Hito | Estado |
|---|---|---|---|
| 1. Arquitectura y logística | 1-2 | Arquitectura diseñada y escaneo arrancado | En curso |
| 2. Pipeline de datos y backend | 3-4 | API funcional y procesamiento automático | Pendiente |
| 3. Desarrollo de interfaz | 5-6 | Frontend integrado con la base de datos | Pendiente |
| 4. Pruebas, optimización y cierre | 7-8 | Sistema en producción y BD poblada | Pendiente |

## Checklist

### Fase 1: Arquitectura y logística

- [x] Definir la nube y la base de datos: Azure, Cosmos DB for NoSQL
- [x] Documentar contexto del proyecto y stack provisional
- [ ] Diseñar el modelo de datos NoSQL (libros, capítulos, páginas). Borrador en `modelo-datos.md` (2026-10-04): contenedores `libros` y `paginas`, partition keys, índices y búsqueda de texto completo. El autor y los años ya están en la hoja (2026-10-04). Faltan capítulos, descripción y la carga de metadatos de la hoja a Cosmos
- [x] Crear la cuenta de Cosmos DB con nivel gratuito (`bibliotecavirtual-cosmos`, West US, límite de 1000 RU/s; creada el 2026-10-04 y verificada con `az`)
- [x] En la cuenta de Cosmos, activar la función `Nuevas funciones para búsqueda de texto completo` (la del español, en vista previa). Activada por el usuario el 2026-10-04; la cuenta muestra la capacidad `EnableNoSQLFullTextSearchPreviewFeatures`
- [x] Crear en Cosmos la base de datos `biblioteca` (1000 RU/s manuales compartidos) y los contenedores `libros` (`/id`) y `paginas` (`/bookId`, con texto completo en `es-ES` y `en-US` desde su creación). Creados y verificados con `az` el 2026-10-04
- [x] Probar la búsqueda de texto completo en español en el Explorador de datos (2026-10-04): la consulta con `bautismo` devolvió una página de prueba cuyo texto decía `bautismos`, así que el español busca por raíz
- [ ] Borrar el documento de prueba `LIB-9999-p0001` del contenedor `paginas` y probar la ruta en inglés (`textoEn`)
- [x] Cuenta de Azure for Students
- [x] Crear el Blob Storage para los libros escaneados
- [x] Documentar la configuración del Blob Storage (ver `stack-tecnologico.md`)
- [x] Decidir que el contenedor `libros-escaneados` sea privado (decidido y aplicado el 2026-10-03)
- [x] Definir la estructura del almacenamiento: dos contenedores, `libros-escaneados` (privado, `LIB-0001.pdf`) y `portadas` (lectura pública, `LIB-0001.jpg`). Ver `stack-tecnologico.md`
- [x] Pasar `libros-escaneados` a privado en Azure (aplicado y verificado el 2026-10-03)
- [x] Crear el contenedor `portadas` con lectura pública en Azure (creado y verificado el 2026-10-03)
- [ ] Pendiente en Azure: activar soft delete de blobs (7 días)
- [x] Asignar al usuario el rol Storage Blob Data Contributor (verificado con `az` el 2026-10-03: el listado del contenedor con `--auth-mode login` funciona)
- [ ] Definir la estrategia de escaneo y el reparto de los 3000 libros. Reparto decidido: 4 personas con bloques de 750 IDs. El flujo está en `pipeline.md` y varios puntos siguen sin confirmar
- [ ] Definir la subida en lote (Bulk Upload). Hay una especificación del script en `pipeline.md`
- [x] Crear la hoja de registro en Google Sheets (pestañas `Registro` con los 3000 IDs, `Bloques`, `Resumen`, `Guía` y `Listas`). Verificada con Drive el 2026-10-03 y con el conector de Sheets el 2026-10-04: fila fija, filtro y desplegables correctos. Las reglas de color llegaron como tipo número y podrían no pintar los estados de texto (por comprobar)
- [ ] Compartir la hoja de registro con los otros 3 integrantes (permiso de edición)
- [ ] Proteger la columna ID de la hoja de registro y borrar el `.xlsx` duplicado que quedó en Drive
- [ ] Crear en Drive las carpetas compartidas `por-subir/` y `subidos/`
- [x] Crear la estructura vacía de `pipeline/subida/` (commit `f95f0ac`)

### Fase 2: Pipeline de datos y backend

- [ ] Elegir la herramienta de OCR
- [ ] Servicio que reciba los libros, los suba al Storage y dispare el OCR (estructura creada en `pipeline/subida/`; `subir_lotes.py` aún está vacío)
- [ ] Generar la miniatura de portada (página 1 del PDF) y guardarla en `portadas`
- [ ] Guardar el texto extraído en Cosmos DB, indexado por palabras clave
- [ ] Endpoints de búsqueda avanzada (fecha, iglesia, tipo de libro, palabras clave)

### Fase 3: Desarrollo de interfaz

- [x] Crear el proyecto base de la app móvil en `mobile/` (Expo SDK 57 con expo-router y TypeScript, npm, Node 24). Es solo la plantilla: aún no se ha probado en dispositivo ni tiene pantallas propias
- [ ] Interfaz adaptable a móviles y accesible
- [ ] Buscador con filtros dinámicos
- [ ] Módulo de administración con el progreso de los escaneos

### Fase 4: Pruebas, optimización y cierre

- [ ] Pruebas de carga en la base NoSQL
- [ ] Optimización de índices de búsqueda
- [ ] Presentación final y entrega del repositorio

## Avance de escaneo

Meta: 3000 libros (~375 por semana por equipo).

| Semana | Libros escaneados | Acumulado |
|---|---|---|
| 1 | 0 | 0 / 3000 |

> Actualizar con el conteo real. La pestaña `Resumen` de la hoja de registro lleva el mismo conteo.

## Decisiones abiertas

- [x] ~~Formato de entrega del escaneo: un PDF por libro o una carpeta de imágenes por libro~~ → Resuelto 2026-10-03: un PDF por libro, nombrado por ID. Ver `stack-tecnologico.md`.
- [x] ~~Origen de la portada que muestra la app móvil~~ → Resuelto 2026-10-03: miniatura que el pipeline genera desde la página 1 del PDF, guardada como blob en el contenedor `portadas`. Ver `stack-tecnologico.md`.
- [x] ~~Alcance de los libros: impresos o manuscritos~~ → Resuelto 2026-10-04: todos los libros serán impresos. El tipo `Registros parroquiales` ya se quitó de la lista de la hoja (2026-10-04).
- [ ] OCR (Azure AI Document Intelligence está descartado). Los libros son impresos y están en español e inglés (decidido el 2026-10-04)
- [ ] App de escaneo del celular (se probará con un libro piloto)
- [ ] Servicio de la carpeta compartida de escaneo: la hoja ya está en Google Drive, falta confirmarlo para `por-subir/` y comprobar que quien sube pueda mover los archivos de los demás
- [ ] Quién sube los lotes a Azure (hoy solo el usuario tiene el rol de datos del Blob)
- [ ] Alcance de la primera versión de `subir_lotes.py`: modo de reemplazos, validación del PDF con `pypdf` y marcado automático de `subido` en la hoja
- [ ] Libros digitales de Internet Archive: ~~qué estado les corresponde~~ (resuelto 2026-10-04: `escaneado`, ver `pipeline.md`), si cuentan en el avance de escaneo y dónde se guarda el identificador de archive.org de cada libro (el usuario pidió quitarlo de `Notas`, así que hoy no queda registrado en la hoja). Hoy se descargan a `~/libros-escaneados/` y se suben a mano a la carpeta `libros-escaneados` de Drive; falta decidir si esa carpeta reemplaza a `por-subir/` y cómo llegan a Azure
- [ ] Quién crea el registro de cada libro en Cosmos (hoy nadie; propuesta: script aparte que lee la hoja)
- [ ] Modelo de datos: capítulos, `descripcion`, cómo llegan los metadatos de la hoja a Cosmos y verificar la búsqueda de texto completo en español al crear la cuenta (ver `modelo-datos.md`)
- [ ] Backend: lenguaje, framework y hosting de la API
- [ ] Disparador del pipeline (por ejemplo Azure Functions)
- [x] ~~Frontend / app móvil~~ → Resuelto 2026-10-03 para la app móvil: Expo, SDK 57. Ver `stack-tecnologico.md`.
- [ ] Autenticación
- [ ] Control de versiones y CI/CD

## Bloqueos

Ninguno por ahora. (Resuelto el 2026-10-03: el usuario ya tiene el rol Storage Blob Data Contributor.)

## Registro

- 2026-10-03: se revisó el PowerPoint y se creó la documentación inicial (`contexto-proyecto.md`, `stack-tecnologico.md`, `progreso.md`). Se decidió Cosmos DB for NoSQL como base de datos y se descartó Document Intelligence para el OCR.
- 2026-10-03: ya se tiene la cuenta de Azure for Students y el Blob Storage creado. Se creó `pipeline.md` vacío.
- 2026-10-03: se instaló Azure CLI y se inició sesión. Se verificó que existe la cuenta `bibliotecadigital` con el contenedor `libros-escaneados` (región `mexicocentral`). Se detectó que el contenedor tiene acceso público a blobs.
- 2026-10-03: surgió la duda de si quien escanea con el celular entrega un PDF o una carpeta de imágenes por libro. Se registró como decisión abierta con recomendación de PDF único por libro; falta confirmarla.
- 2026-10-03: surgió la duda de dónde sale la portada que muestra la app móvil. Se propuso generarla desde la página 1 del PDF. Se aclaró que el plan solo guarda el libro escaneado en Blob, así que la decisión abierta quedó con dos opciones de almacenamiento (blob aparte o miniatura en Cosmos).
- 2026-10-03: se revisó con `az` la configuración del Blob. Soft delete y versionado están apagados, no hay política de ciclo de vida ni CORS, y Cosmos DB aún no existe en el grupo de recursos. No se pudo listar el contenido del contenedor por falta de rol de datos (ver Bloqueos). Se actualizó `stack-tecnologico.md`.
- 2026-10-03: se decidió cómo se almacenan los libros escaneados en Azure: un PDF por libro con nombre por ID, dos contenedores (`libros-escaneados` privado y `portadas` con lectura pública), portada generada desde la página 1 del PDF y estructura plana. Se actualizó `stack-tecnologico.md`. Los cambios en Azure (pasar a privado, crear `portadas`, soft delete, rol) quedan como pendientes: aún no se aplicó ninguno.
- 2026-10-03: se pasó `libros-escaneados` a privado y se verificó con `az` (nivel de acceso `None`). El comando `az storage container-rm update --public-access off` respondió sin error pero no aplicó el cambio; se aplicó con `az rest` (PATCH al contenedor). El acceso público a nivel de cuenta sigue habilitado a propósito, para `portadas`. Quedan pendientes crear `portadas`, activar soft delete y asignar el rol de datos.
- 2026-10-03: se creó el contenedor `portadas` con nivel de acceso `Blob` (lectura pública de cada archivo, sin listado) y se verificó con `az`. `libros-escaneados` sigue privado. Quedan pendientes activar soft delete y asignar el rol de datos.
- 2026-10-03: se decidió usar Expo para la app móvil, en su última versión estable (SDK 57, `expo@57.0.26`, verificada en npm). Se actualizó `stack-tecnologico.md`.
- 2026-10-03: el usuario creó el proyecto base de la app en `mobile/` (Expo ~57.0.26, expo-router, React 19.2.3, React Native 0.86.3, TypeScript, npm con `package-lock.json`). El repo git es único, en la raíz. Se agregó `.nvmrc` (Node 24) en `mobile/` y se creó el `.gitignore` de la raíz (el de `mobile/` lo generó la plantilla). Aún no se ha commiteado nada.
- 2026-10-03: se verificó con `az` que el usuario ya tiene el rol Storage Blob Data Contributor y que el listado de `libros-escaneados` funciona con `--auth-mode login`. El contenedor tiene 1 blob, `Video Game - The Blackstreets.jpeg` (5.8 MB), que parece una prueba y no sigue el esquema `LIB-0001.pdf`; no se tocó. Soft delete sigue desactivado (pendiente).
- 2026-10-03: se hizo el commit `f95f0ac` con la app Expo en `mobile/`, la estructura vacía de `pipeline/subida/` y la documentación hasta esa fecha.
- 2026-10-03: se definió el flujo de quien escanea y se describió en `pipeline.md`: 4 personas con bloques de 750 IDs, PDF nombrado por ID, carpetas `por-subir/` y `subidos/` en Drive y especificación de `subir_lotes.py`. Todavía es un borrador con puntos por confirmar (ver Decisiones abiertas).
- 2026-10-03: se creó la hoja de registro en Google Sheets. Se generó con `openpyxl` fuera del repo, se subió a Drive y se convirtió a hoja de Google. Drive confirmó las 4 pestañas y los totales (3000 libros, 750 por persona). Los desplegables y los colores no se pudieron comprobar con el conector. Esta sesión no puede editar celdas, porque el conector de Drive solo trabaja con archivos enteros. Quedan pendientes compartirla, proteger la columna ID y crear las carpetas `por-subir/` y `subidos/`. Se actualizaron `pipeline.md` y `stack-tecnologico.md`.
- 2026-10-04: se conectó el conector de Google Sheets, así que la hoja de registro ya se puede editar desde las sesiones de trabajo (celdas, formatos, pestañas). Con él se verificó la hoja: la fila de encabezado fija, el filtro de `A1:J3001`, el desplegable de Estado con sus 6 valores y la validación de Páginas están bien. Las 6 reglas de color llegaron como "es igual a" de tipo número y podrían no funcionar con texto; falta comprobarlo. Se actualizó `stack-tecnologico.md`.
- 2026-10-04: prueba de descarga desde Internet Archive. Se bajaron 5 libros de dominio público (anteriores a 1926, en español, sin restricción de préstamo) a `~/libros-escaneados/`, fuera del repo, con el nombre de su ID: `LIB-0001.pdf` a `LIB-0005.pdf`, del bloque de Jonathan. Se comprobó que abren y se contaron las páginas (344, 354, 190, 220 y 242). En la hoja de registro se llenaron título, iglesia, fecha, tipo, fecha, páginas y notas (primero con el identificador de archive.org; el usuario pidió quitarlo y quedó solo la ubicación local). `Estado` se dejó primero en `pendiente`, porque los PDF aún no están en `por-subir/` de Drive; a pedido del usuario se pasaron a `escaneado` y se ajustó la definición de ese estado en la pestaña `Guía` y en `pipeline.md` ("listo para subir", también para libros descargados de Internet Archive). No se tocó la tabla de avance de escaneo.
- 2026-10-04: el usuario subió a mano los 5 PDF a la carpeta `libros-escaneados` de su Drive (no a `por-subir/`, que sigue sin crearse). Se verificó con el conector de Drive que los 5 están con el nombre `LIB-000N.pdf` y el mismo tamaño en bytes que los locales. Se actualizó `Notas` en la hoja ("En la carpeta libros-escaneados de Drive."). El estado sigue en `escaneado`.
- 2026-10-04: a pedido del usuario se agregó la columna `Autor` a la hoja de registro, después de `Título`. Se pasó el autor de los libros LIB-0001 a LIB-0004 de su título a la nueva columna; LIB-0005 quedó sin autor porque su título no lo traía. Se agregó la fila `Autor` al ejemplo de la pestaña `Guía`. Se verificó que el filtro, el desplegable, los colores y las fórmulas del `Resumen` se desplazaron bien (3000 libros, 5 escaneados, 1,350 páginas). Se actualizaron `pipeline.md` y `modelo-datos.md`. Quedó anotado que nadie crea hoy el registro del libro en Cosmos y que las listas de `Tipo` e `Iglesia` están en revisión.
- 2026-10-04: siguiendo la recomendación del usuario ("lo que más me recomiendes para cumplir con la actividad"), se asumió que los libros son impresos y que "iglesia" es la denominación, y se aplicó en la hoja de registro: pestaña nueva `Listas` con 12 tipos y 10 iglesias, desplegables de lista cerrada en `Tipo` e `Iglesia`, y columnas `Año desde` y `Año hasta` calculadas con fórmula a partir de `Fecha`. Los tipos de los libros LIB-0001 a LIB-0005 se pasaron a la lista nueva. Se agregaron filas al ejemplo de `Guía`. Se verificó que filtro, colores, validaciones y `Resumen` siguen bien, y que las fórmulas de años dan los valores esperados con `1950 a 1955`, `12/03/1950` y un texto sin año; con `1950-55` el año final sale como 1950. Se actualizaron `pipeline.md` y `modelo-datos.md`. Los supuestos quedan por confirmar.
- 2026-10-04: el usuario compartió el PowerPoint original y se revisó completo, incluido el texto de los diagramas SmartArt de las diapositivas 8 y 9. Coincide con `contexto-proyecto.md`: los criterios de evaluación son 40%, 20%, 10% y 10% (suman 80%) y la diapositiva 9 pide la pantalla "Detalles del libro (título, autor, descripción, etc.)". La actividad no menciona la descripción en el modelo de datos, solo en la interfaz. Se actualizó el pendiente de `descripcion` en `modelo-datos.md` y se agregó a `contexto-proyecto.md` la institución (Universidad Tecnológica Metropolitana, por el logo de la diapositiva 8), que era lo único del PowerPoint que faltaba.
- 2026-10-04: el usuario decidió que todos los libros serán impresos. Queda resuelta la decisión de alcance: el OCR puede ser uno gratuito para texto impreso, sin reconocimiento de escritura a mano, y no se manejan registros parroquiales con datos personales. Se actualizaron `pipeline.md`, `modelo-datos.md` y `stack-tecnologico.md`. Pendiente quitar `Registros parroquiales` de la lista de `Tipo` en la hoja y definir los idiomas de los libros.
- 2026-10-04: se quitó `Registros parroquiales` de la lista `Tipo` en la pestaña `Listas` (quedan 11 tipos). Se comprobó que ninguna fila lo usaba. Se cambió el ejemplo de la pestaña `Guía`, que lo usaba, por un libro impreso (`Meditaciones para cada día del año`, tipo `Espiritualidad y devoción`). El usuario decidió que los idiomas de los libros son español e inglés. Se actualizaron `pipeline.md`, `modelo-datos.md` y `stack-tecnologico.md`. Queda pendiente decidir si se agrega una columna `Idioma` a la hoja.
- 2026-10-04: a pedido del usuario se agregó la columna `Idioma` a la hoja de registro, después de `Tipo`, con desplegable de `Español` e `Inglés`. Los 5 libros de prueba quedaron como `Español`. Se agregó la fila `Idioma` al ejemplo de `Guía`. Se verificó que el filtro (ahora hasta la columna N), los desplegables, los colores y el `Resumen` siguen bien. En el modelo de datos se agregó el campo `idioma` a `libros` y a `paginas`, y se propuso guardar el texto de cada página en `textoEs` o `textoEn` según el idioma, con una ruta de texto completo por idioma. Los ejemplos de `modelo-datos.md`, que seguían mostrando un libro de bautismos, se cambiaron por un libro impreso. Se actualizaron `pipeline.md`, `modelo-datos.md` y `stack-tecnologico.md`.
- 2026-10-04: se prepararon los pasos para crear Cosmos DB, sin crear nada. Con `az` se verificó que la suscripción está activa, que `Microsoft.DocumentDB` está `NotRegistered`, que no hay cuentas de Cosmos y que el nombre `bibliotecavirtual-cosmos` está libre; no se pudo comprobar si `mexicocentral` admite Cosmos (la consulta de regiones falló con `subscriptionQuotaId is null`). En la documentación de Microsoft se confirmó que el nivel gratuito da 1000 RU/s y 25 GB y que no existe en serverless, y que la búsqueda de texto completo en español está en vista previa y exige activar dos funciones en la cuenta. Se actualizaron `modelo-datos.md` y `stack-tecnologico.md`.
- 2026-10-04: el usuario creó desde el portal la cuenta `bibliotecavirtual-cosmos` (Azure Cosmos DB for NoSQL). Se verificó con `az`: estado `Succeeded`, nivel gratuito activado, límite de 1000 RU/s, respaldo periódico, sin zonas ni escrituras multirregión, redes públicas y acceso por llaves habilitado. La región es West US (no `mexicocentral`) y el proveedor `Microsoft.DocumentDB` quedó registrado. En Características aparece `Nuevas funciones para búsqueda de texto completo` en Off, y no aparece la función `Full-Text & Hybrid Search for NoSQL API`, que probablemente ya es de uso general. Falta activar la primera y crear la base de datos y los contenedores. Se actualizaron `stack-tecnologico.md` y `progreso.md`.
- 2026-10-04: se creó la base de datos y los contenedores de Cosmos con `az`. El portal no ofrecía rendimiento compartido al crear la base y la primera `biblioteca` había quedado sin rendimiento; el usuario la borró (estaba vacía) y se recreó con `--throughput 1000` (manual, 1000 RU/s compartidos, sin autoscale). Se crearon `libros` (`/id`) y `paginas` (`/bookId`) con la política de texto completo (`es-ES` en `/textoEs` y `en-US` en `/textoEn`) y la de indexación de `modelo-datos.md`. Se verificó con `az` que las políticas quedaron guardadas, que ningún contenedor tiene rendimiento propio y que la base tiene 1000 RU/s manuales. Falta probar consultas con datos. Se actualizaron `stack-tecnologico.md` y `modelo-datos.md`.
- 2026-10-04: el usuario probó la búsqueda en el Explorador de datos. Insertó en `paginas` el documento `LIB-9999-p0001` con `textoEs` "Los bautismos se celebraban el domingo después de la misa mayor" y ejecutó `SELECT c.id FROM c WHERE FullTextContains(c.textoEs, "bautismo")`. Devolvió ese documento, así que la búsqueda de texto completo en español funciona y reconoce la raíz de la palabra. Primero había pegado el documento por error en la pestaña de `libros`; lo descartó sin guardar. Quedan por borrar el documento de prueba y por probar el inglés. Se actualizaron `progreso.md` y `modelo-datos.md`.
- 2026-10-04: a raíz de la pregunta de quién crea el registro de cada página después del OCR, se describió en `pipeline.md` el procesamiento de un libro (`pipeline/ocr/procesar_libro.py`, propuesta): el propio script del OCR lee el libro en `libros`, escribe una página por documento en `paginas` con upsert y actualiza el libro al final. Cosmos no dispara nada por sí solo. Depende de que el registro del libro ya exista en `libros`, que sigue sin responsable.
- 2026-10-04: se escribió el borrador del modelo de datos en `modelo-datos.md`, con las recomendaciones que el usuario aceptó: contenedores `libros` (partition key `/id`) y `paginas` (partition key `/bookId`), filtros copiados a cada página, nombre del blob en lugar de URL, fecha como texto más años numéricos, y búsqueda de texto completo en español sobre `texto`. Se reemplazó la sección de modelo de `stack-tecnologico.md` por un resumen con enlace. Los puntos sin responder quedaron como decisión abierta. Nada se ha probado, porque la cuenta de Cosmos DB aún no existe.
