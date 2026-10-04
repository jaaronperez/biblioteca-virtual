# Progreso del proyecto

Última actualización: 2026-10-03 (más tarde)

Contexto y cronograma: [contexto-proyecto.md](contexto-proyecto.md) · Stack: [stack-tecnologico.md](stack-tecnologico.md)

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
- [ ] Diseñar el modelo de datos NoSQL (libros, capítulos, páginas)
- [ ] Crear la cuenta de Cosmos DB (elegir serverless o free tier)
- [x] Cuenta de Azure for Students
- [x] Crear el Blob Storage para los libros escaneados
- [x] Documentar la configuración del Blob Storage (ver `stack-tecnologico.md`)
- [ ] Decidir si el contenedor `libros-escaneados` debe ser privado (hoy tiene acceso público a blobs)
- [ ] Definir la estructura de carpetas dentro del contenedor (propuesta pendiente de confirmar: nombres planos por ID, metadatos en Cosmos)
- [ ] Definir la estrategia de escaneo y el reparto de los 3000 libros
- [ ] Definir la subida en lote (Bulk Upload)

### Fase 2: Pipeline de datos y backend

- [ ] Elegir la herramienta de OCR
- [ ] Servicio que reciba los libros, los suba al Storage y dispare el OCR
- [ ] Guardar el texto extraído en Cosmos DB, indexado por palabras clave
- [ ] Endpoints de búsqueda avanzada (fecha, iglesia, tipo de libro, palabras clave)

### Fase 3: Desarrollo de interfaz

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

> Actualizar con el conteo real.

## Decisiones abiertas

- [ ] Formato de entrega del escaneo: un PDF por libro o una carpeta de imágenes por libro (recomendación: un PDF por libro, nombrado por ID; pendiente de confirmar)
- [ ] Origen de la portada que muestra la app móvil. En ambos casos el pipeline la genera desde la página 1 del PDF. Dónde guardarla: (a) como blob aparte y enlazada con `portadaUrl` en `libros` (hoy Blob solo contempla el libro escaneado, esto sería un tipo de archivo nuevo), o (b) miniatura pequeña dentro del documento de `libros` en Cosmos, sin blobs extra. Pendiente de decidir.
- [ ] OCR (Azure AI Document Intelligence está descartado)
- [ ] Backend: lenguaje, framework y hosting de la API
- [ ] Disparador del pipeline (por ejemplo Azure Functions)
- [ ] Frontend / app móvil
- [ ] Autenticación
- [ ] Control de versiones y CI/CD

## Bloqueos

- Falta un rol de datos en el Blob: el usuario es Owner de la suscripción pero no tiene un rol como Storage Blob Data Contributor. Con `--auth-mode login` no se pueden listar ni subir blobs (el listado dio error de permisos). Se resuelve asignando el rol (pendiente de confirmar) o usando llaves.

## Registro

- 2026-10-03: se revisó el PowerPoint y se creó la documentación inicial (`contexto-proyecto.md`, `stack-tecnologico.md`, `progreso.md`). Se decidió Cosmos DB for NoSQL como base de datos y se descartó Document Intelligence para el OCR.
- 2026-10-03: ya se tiene la cuenta de Azure for Students y el Blob Storage creado. Se creó `pipeline.md` vacío.
- 2026-10-03: se instaló Azure CLI y se inició sesión. Se verificó que existe la cuenta `bibliotecadigital` con el contenedor `libros-escaneados` (región `mexicocentral`). Se detectó que el contenedor tiene acceso público a blobs.
- 2026-10-03: surgió la duda de si quien escanea con el celular entrega un PDF o una carpeta de imágenes por libro. Se registró como decisión abierta con recomendación de PDF único por libro; falta confirmarla.
- 2026-10-03: surgió la duda de dónde sale la portada que muestra la app móvil. Se propuso generarla desde la página 1 del PDF. Se aclaró que el plan solo guarda el libro escaneado en Blob, así que la decisión abierta quedó con dos opciones de almacenamiento (blob aparte o miniatura en Cosmos).
- 2026-10-03: se revisó con `az` la configuración del Blob. Soft delete y versionado están apagados, no hay política de ciclo de vida ni CORS, y Cosmos DB aún no existe en el grupo de recursos. No se pudo listar el contenido del contenedor por falta de rol de datos (ver Bloqueos). Se actualizó `stack-tecnologico.md`.
