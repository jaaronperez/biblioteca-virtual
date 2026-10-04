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
- [x] Crear en Drive las carpetas `por-subir/` y `subidos/`: el usuario las creó el 2026-10-04 dentro de `biblioteca virtual`, y se verificó con el conector de Drive. Aún no se comparten con el equipo
- [x] Crear la estructura vacía de `pipeline/subida/` (commit `f95f0ac`). Reemplazada el 2026-10-04 por `pipeline/` con los scripts

### Fase 2: Pipeline de datos y backend

- [x] Elegir la herramienta de OCR: Tesseract, o la capa de texto del PDF con PyMuPDF, en la PC de quien sube (2026-10-04, falta medir con el libro piloto)
- [x] Definir el flujo detallado de subida y procesamiento, con diagramas (`pipeline.md`, 2026-10-04)
- [x] Servicio que reciba los libros, los suba al Storage y dispare el OCR: `pipeline/subir_lotes.py` y `procesar_libro.py`, probados de punta a punta con los 5 libros de prueba (2026-10-04)
- [x] Generar la miniatura de portada (página 1 del PDF) y guardarla en `portadas` (las 5 verificadas el 2026-10-04)
- [x] Guardar el texto extraído en Cosmos DB, indexado por palabras clave (1350 páginas; la búsqueda de texto completo con datos reales se verificó el 2026-10-04)
- [ ] Probar el pipeline con un libro escaneado con el celular (todo pasa por Tesseract): tiempo por página y calidad del texto
- [x] Commit de `pipeline/` y de la documentación de esta sesión (2026-10-04)
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
- [x] ~~OCR~~ → Resuelto 2026-10-04: Tesseract y PyMuPDF en la PC de quien sube, dentro de `subir_lotes.py`. Ver `stack-tecnologico.md`.
- [ ] App de escaneo del celular (se probará con un libro piloto)
- [ ] Servicio de la carpeta compartida de escaneo: la hoja ya está en Google Drive, falta confirmarlo para `por-subir/` y comprobar que quien sube pueda mover los archivos de los demás
- [ ] Quién sube los lotes a Azure (hoy solo el usuario tiene el rol de datos del Blob)
- [x] ~~Alcance de la primera versión de `subir_lotes.py`~~ → Resuelto 2026-10-04: valida con PyMuPDF, marca `subido` en la hoja y crea el libro en Cosmos. Sigue abierto el modo de reemplazos (un reescaneo con otro MD5 hoy se reporta como conflicto). Ver `pipeline.md`.
- [ ] Libros digitales de Internet Archive: ~~qué estado les corresponde~~ (resuelto 2026-10-04: `escaneado`, ver `pipeline.md`), si cuentan en el avance de escaneo y dónde se guarda el identificador de archive.org de cada libro (el usuario pidió quitarlo de `Notas`, así que hoy no queda registrado en la hoja). Hoy se descargan a `~/libros-escaneados/` y se suben a mano a la carpeta `libros-escaneados` de Drive; falta decidir si esa carpeta reemplaza a `por-subir/` y cómo llegan a Azure
- [x] ~~Quién crea el registro de cada libro en Cosmos~~ → Resuelto 2026-10-04: `subir_lotes.py`, con los datos de la hoja, al subir el PDF. Ver `pipeline.md` y `modelo-datos.md`.
- [ ] Modelo de datos: capítulos, `descripcion`, cómo llegan los metadatos de la hoja a Cosmos y verificar la búsqueda de texto completo en español al crear la cuenta (ver `modelo-datos.md`)
- [ ] Backend: lenguaje, framework y hosting de la API
- [x] ~~Disparador del pipeline~~ → Resuelto 2026-10-04: no hay disparador en la nube; el script de subida corre el OCR. Ver `stack-tecnologico.md`.
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
- 2026-10-04: se definió cómo se dispara el OCR. Se evaluó Event Grid con una cola y un worker en Container Apps, y se descartó por costo (extraer el texto en la nube gastaría unos 50 a 70 USD del crédito, estimación sin medir). El usuario propuso hacer todo en el script de su PC y se acordó el orden: validar, comprobar duplicados por MD5, subir, mover a `subidos/`, registrar el libro en Cosmos, extraer el texto (capa del PDF o Tesseract) a una carpeta de trabajo local, subir la portada, guardar las páginas y marcar `procesado`. Se escribió el flujo detallado en `pipeline.md`, con dos diagramas Mermaid (vista general y flujo de cada libro) que se comprobaron con `mermaid-cli`. Con esto se resolvieron las decisiones del OCR, del disparador, del alcance del script y de quién crea el registro del libro. Se verificó con `az` que `Microsoft.EventGrid`, `Microsoft.App` y `Microsoft.Web` no están registrados (no se registraron) y que Tesseract no está instalado en la PC. Se actualizaron `pipeline.md`, `stack-tecnologico.md` y `modelo-datos.md` (campo `error` y valores de `ocr.motor`). Los scripts aún no existen.
- 2026-10-04: a pedido del usuario se asignó con `az` el rol `Cosmos DB Built-in Data Contributor` a su cuenta en `bibliotecavirtual-cosmos`, con alcance en toda la cuenta. Se escribieron los scripts en `pipeline/`: `subir_lotes.py`, `procesar_libro.py`, `extraer.py`, `azure_api.py`, `google_api.py`, `config.py`, `config.example.toml`, `README.md` y `requirements.txt`. Se borraron los archivos vacíos de `pipeline/subida/`. Al programarlo se cambió el orden de dos pasos: el libro se registra en Cosmos antes de mover el archivo a `subidos/`, para que un fallo no deje el archivo fuera de `por-subir/` sin registro. Además, la hoja acepta también `subido` y `verificado`. Se actualizó `pipeline.md`. Pruebas hechas: los módulos importan; con `az login`, el script leyó Blob (0 PDF) y Cosmos (0 libros y la página de prueba `LIB-9999-p0001`), así que el rol funciona; con un PDF sintético se probó la extracción por capa de texto, la reanudación tras cortar `paginas.jsonl` y la portada de 500 px; una página en blanco pasó a Tesseract y falló porque no está instalado, conservando las páginas anteriores. No se probó nada que escriba en Drive, en la hoja, en Blob ni en Cosmos. El ID de la hoja ya está en `config.example.toml`.
- 2026-10-04: el usuario instaló Tesseract (5.5.3, con `spa` y `eng`, verificado), guardó `credentials.json` en `~/.config/biblioteca-virtual/`, creó `por-subir/` y `subidos/` dentro de la carpeta `biblioteca virtual` de Drive y movió los 5 PDF a `por-subir/`. Se verificó con el conector de Drive. Se creó `~/.config/biblioteca-virtual/config.toml` con los IDs de las dos carpetas. En la primera autorización OAuth salieron dos errores, y el usuario los resolvió en Google Cloud Console: un 403 `access_denied` (faltaba agregar su correo como usuario de prueba) y luego `accessNotConfigured` (faltaba activar la API de Drive y la de Sheets). Después, `subir_lotes.py --dry-run` funcionó: leyó 5 archivos en `por-subir/`, 3000 filas de la hoja, 0 blobs PDF y 0 libros en Cosmos, y los 5 libros pasaron las validaciones como `se subiría`. Falta la prueba real con `--solo LIB-0001`.
- 2026-10-04: primera corrida real de `subir_lotes.py` con los 5 libros, con 4 procesos en paralelo. LIB-0001, LIB-0002 (354 páginas: 339 desde la capa de texto y 15 con Tesseract) y LIB-0004 (220 páginas: 212 y 8) quedaron `procesado`. LIB-0003 y LIB-0005 quedaron en `error` por 429 (TooManyRequests) de Cosmos al guardar las páginas; su texto ya extraído se conservó en `~/biblioteca-trabajo/`. Causa: lotes de 100 páginas a unos 13 RU cada una (medido) contra 1000 RU/s compartidos por 4 procesos, y el SDK se rinde a los 30 s. Se corrigió `azure_api.py`: lotes de 25 y reintentos ante 429 durante hasta 5 minutos (verificado en el cliente). Falta reintentar los dos libros con `procesar_libro.py --pendientes` y revisar los resultados.
- 2026-10-04: el usuario reintentó LIB-0003 y LIB-0005 con `procesar_libro.py --pendientes` después del arreglo de los 429. La hoja de registro estaba en la papelera de Drive (el conector daba "Permission denied"; no se sabe cómo llegó ahí) y el usuario la restauró. Se verificó de punta a punta, solo con lecturas: los 5 libros están `procesado` en Cosmos y `numPaginas` coincide con las páginas guardadas (344, 354, 190, 220 y 242, en total 1350). Los 5 PDF están en Blob con MD5 y las 5 portadas en `portadas`. `por-subir/` quedó vacía, `subidos/` tiene los 5 PDF, la hoja los marca `subido` y no quedaron carpetas de trabajo. Una búsqueda de texto completo de "oración" con `ORDER BY RANK` devolvió páginas de LIB-0003 y LIB-0002 y costó 14.41 RU. Los 5 libros son de Internet Archive y casi todas sus páginas salieron de la capa de texto, así que Tesseract solo se usó en unas pocas páginas.
- 2026-10-04: se escribió el borrador del modelo de datos en `modelo-datos.md`, con las recomendaciones que el usuario aceptó: contenedores `libros` (partition key `/id`) y `paginas` (partition key `/bookId`), filtros copiados a cada página, nombre del blob en lugar de URL, fecha como texto más años numéricos, y búsqueda de texto completo en español sobre `texto`. Se reemplazó la sección de modelo de `stack-tecnologico.md` por un resumen con enlace. Los puntos sin responder quedaron como decisión abierta. Nada se ha probado, porque la cuenta de Cosmos DB aún no existe.
