# Progreso del proyecto

Última actualización: 2026-10-03 (noche)

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
- [x] Decidir que el contenedor `libros-escaneados` sea privado (decidido y aplicado el 2026-10-03)
- [x] Definir la estructura del almacenamiento: dos contenedores, `libros-escaneados` (privado, `LIB-0001.pdf`) y `portadas` (lectura pública, `LIB-0001.jpg`). Ver `stack-tecnologico.md`
- [x] Pasar `libros-escaneados` a privado en Azure (aplicado y verificado el 2026-10-03)
- [x] Crear el contenedor `portadas` con lectura pública en Azure (creado y verificado el 2026-10-03)
- [ ] Pendiente en Azure: activar soft delete de blobs (7 días)
- [x] Asignar al usuario el rol Storage Blob Data Contributor (verificado con `az` el 2026-10-03: el listado del contenedor con `--auth-mode login` funciona)
- [ ] Definir la estrategia de escaneo y el reparto de los 3000 libros
- [ ] Definir la subida en lote (Bulk Upload)

### Fase 2: Pipeline de datos y backend

- [ ] Elegir la herramienta de OCR
- [ ] Servicio que reciba los libros, los suba al Storage y dispare el OCR
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

> Actualizar con el conteo real.

## Decisiones abiertas

- [x] ~~Formato de entrega del escaneo: un PDF por libro o una carpeta de imágenes por libro~~ → Resuelto 2026-10-03: un PDF por libro, nombrado por ID. Ver `stack-tecnologico.md`.
- [x] ~~Origen de la portada que muestra la app móvil~~ → Resuelto 2026-10-03: miniatura que el pipeline genera desde la página 1 del PDF, guardada como blob en el contenedor `portadas`. Ver `stack-tecnologico.md`.
- [ ] OCR (Azure AI Document Intelligence está descartado)
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
