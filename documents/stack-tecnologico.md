# Stack tecnológico

Define las tecnologías del proyecto Biblioteca Virtual Eclesiástica. Ver contexto y cronograma en [contexto-proyecto.md](contexto-proyecto.md).

> Estado: **provisional**. Por ahora están definidas la parte de Azure, la estructura del almacenamiento y la app móvil (Expo). El backend está pendiente.

## Nube: Microsoft Azure

| Componente | Servicio | Uso |
|---|---|---|
| Almacenamiento de archivos | **Azure Blob Storage** | Guarda el PDF de cada libro y la miniatura de su portada, en dos contenedores. Cuenta y contenedores creados. |
| Base de datos NoSQL | **Azure Cosmos DB for NoSQL** | Metadatos de libros y texto extraído por página, con índices para búsqueda. |

## Recursos creados en Azure

Suscripción: Azure for Students. Grupo de recursos: `biblioteca-virtual` (región `mexicocentral`). Verificado con `az` el 2026-10-03.

| Recurso | Valor |
|---|---|
| Cuenta de almacenamiento | `bibliotecadigital` (StorageV2, Standard_LRS, nivel Hot) |
| Contenedores | `libros-escaneados` (acceso privado desde 2026-10-03) y `portadas` (lectura pública de blobs, creado el 2026-10-03) |
| Seguridad | Solo HTTPS, TLS mínimo 1.2, acceso por llaves compartidas habilitado |
| Namespace jerárquico (Data Lake) | Deshabilitado |
| Protección de datos | Soft delete de blobs y de contenedores deshabilitado; versionado no habilitado |
| Ciclo de vida y CORS | Sin política de ciclo de vida y sin reglas CORS |
| Cosmos DB | Cuenta `bibliotecavirtual-cosmos` (API for NoSQL), creada el 2026-10-04 desde el portal y verificada con `az`: región West US, nivel gratuito, límite de 1000 RU/s para toda la cuenta, respaldo periódico, sin zonas ni escrituras multirregión, acceso por llaves habilitado y redes públicas. Base de datos `biblioteca` con 1000 RU/s manuales compartidos y contenedores `libros` (`/id`) y `paginas` (`/bookId`, con texto completo en `es-ES` y `en-US`), creados el 2026-10-04 |

**Acceso:** desde 2026-10-03 el contenedor `libros-escaneados` es privado (verificado con `az`). Los PDF solo se pueden abrir con una SAS temporal que entregará la API. La cuenta sigue permitiendo acceso público a blobs a nivel de cuenta, a propósito: el contenedor `portadas` lo necesita. No desactivarlo a nivel de cuenta.

## Estructura del almacenamiento (decidida)

| Contenedor | Contenido | Nombre del blob | Acceso | Estado |
|---|---|---|---|---|
| `libros-escaneados` | PDF del libro | `LIB-0001.pdf` | Privado (la API entrega SAS temporales) | Existe y es privado (aplicado el 2026-10-03) |
| `portadas` | Miniatura de la portada (JPEG, ~400 a 600 px de ancho) | `LIB-0001.jpg` | Lectura pública | Existe (creado el 2026-10-03) |

Se usan dos contenedores porque el nivel de acceso se define por contenedor: así los PDF son privados y las portadas se cargan por URL directa y se cachean en la app móvil.

- **Un PDF por libro**, no una carpeta de imágenes. Las apps de escaneo del celular lo exportan directo y evita ordenar cientos de imágenes por libro.
- **Nombre por ID** (`LIB-0001`), no por título. Estructura plana: sin carpetas por iglesia ni por fecha, porque esos datos viven en Cosmos y pueden corregirse sin mover archivos.
- **La portada es la página 1 del PDF.** El pipeline genera la miniatura; quien escanea no sube nada extra, pero debe dejar la portada como primera página.
- Si algún libro resulta sensible, las portadas también pasarían a privado y se servirían con SAS.
- **Protección prevista:** activar soft delete de blobs (7 días). Versionado y política de ciclo de vida no hacen falta por ahora. Aún no está aplicado.

## Decisión: Cosmos DB for NoSQL

- Servicio NoSQL nativo de Azure, basado en JSON, que coincide con el modelo de datos del proyecto (libro, capítulos, páginas).
- Escala y responde rápido, lo que apoya el criterio de evaluación de arquitectura NoSQL y nube (40%).
- Se integra directo con Blob Storage y el resto de Azure.
- Incluye búsqueda de texto completo integrada. Verificar disponibilidad en la región y SDK elegidos antes de depender de ella.

**Descartado como base principal:** Azure AI Search. Es un buscador, no una base de datos. Se puede añadir más adelante como complemento si la búsqueda no alcanza.

## Modelo de datos (borrador)

El detalle está en [modelo-datos.md](modelo-datos.md). En resumen:

- Dos contenedores de Cosmos: `libros` (partition key `/id`) y `paginas` (partition key `/bookId`), con un documento por página.
- En Cosmos se guarda el **nombre** del PDF y de la portada, no la URL completa.
- Los filtros (iglesia, tipo, idioma y años) se copian a cada página. El texto de cada página va en `textoEs` o `textoEn` según el idioma del libro, con búsqueda de texto completo en español o en inglés.

## Capacidad y costo

- Suscripción: **Azure for Students**. Tiene un crédito limitado y algunos servicios o regiones pueden estar restringidos. Antes de crear Cosmos DB, confirmar que la suscripción permita serverless o free tier.
- Usar **serverless** o **free tier** (1000 RU/s y 25 GB gratis). Son excluyentes entre sí: se elige uno al crear la cuenta. Verificado el 2026-10-04: el nivel gratuito da 1000 RU/s y 25 GB de por vida en la cuenta, se permite una sola cuenta con nivel gratuito por suscripción, hay que activarlo al crearla y no se puede cambiar después. El proveedor `Microsoft.DocumentDB` ya está registrado y la cuenta con nivel gratuito ya se creó (ver "Recursos creados en Azure").
- Estimación: 3000 libros × ~300 páginas ≈ 900 mil documentos. Verificar el consumo de RU en las pruebas de carga (Fase 4).
- Medido el 2026-10-04: reescribir con upsert una página existente (de 1 a 1.8 KB, con texto completo) cuesta 12.95 RU, y contar las páginas de un libro cuesta 2.99 RU. Con 1000 RU/s, escribir 900 mil páginas toma unas 3.5 horas de escritura como mínimo. Es una cota optimista: crear una página nueva probablemente cuesta más que reescribirla.
- El peso de los PDF puede ser grande (cientos de GB para 3000 libros, estimación sin medir). Medirlo y fijar un tamaño máximo por libro antes de escanear en masa.

## Flujo previsto

1. `subir_lotes.py` sube el PDF a `libros-escaneados` con el nombre `LIB-0001.pdf` (subida en lote, sin duplicados) y crea el libro en Cosmos con los datos de la hoja.
2. El mismo script, en la PC de quien sube, extrae el texto y genera la miniatura de la página 1 en `portadas`. No hay disparador en la nube.
3. El texto extraído se guarda en **Cosmos DB**, indexado.
4. La API consulta Cosmos DB y devuelve resultados con la URL de la portada y una SAS temporal para el PDF.

El detalle está en [pipeline.md](pipeline.md).

## Decisión: OCR y disparador (2026-10-04)

- **Dónde corre:** en la PC de quien sube los lotes, dentro de `subir_lotes.py`. Para reintentos se usa `procesar_libro.py`.
- **Herramientas:** si la página ya trae capa de texto (por ejemplo, los PDF de Internet Archive), el texto se toma directo con **PyMuPDF**. Si no, se usa **Tesseract** con `spa` o `eng`. PyMuPDF también genera la miniatura.
- **Por qué:** extraer el texto de unas 900 mil páginas en la nube costaría, según una estimación sin medir, unos 50 a 70 USD del crédito de Azure for Students. En la PC no cuesta nada, y el flujo queda con menos servicios.
- **Descartados por ahora:** Azure Functions, porque Tesseract es un binario del sistema que no se puede instalar en Flex Consumption y Consumption corta a los 10 minutos. También Event Grid con una cola y un Container Apps Job. Esta última opción queda como camino si se pide procesamiento en la nube: el mismo `procesar_libro.py` se empaquetaría en un contenedor.
- **Riesgo:** el criterio de "Arquitectura NoSQL y nube" vale 40%, y con esta decisión el procesamiento no ocurre en la nube.

## App móvil: Expo

**Decidido:** la app móvil se desarrolla con **Expo**, en su última versión estable: **SDK 57** (`expo@57.0.26`, etiqueta `latest` de npm verificada el 2026-10-03).

- **Ubicación:** carpeta `mobile/` dentro del repo único de la raíz (monorepo con documentación y, más adelante, el backend).
- **Plantilla:** expo-router, React 19.2.3, React Native 0.86.3, TypeScript.
- **Gestor de paquetes:** npm (`package-lock.json` versionado). No mezclar con yarn ni pnpm.
- **Node:** 24, fijado en `mobile/.nvmrc` (el equipo usa `nvm use`). Pendiente confirmar que el SDK 57 lo soporta.
- **`.gitignore`:** uno en la raíz (secretos, libros y PDF, Azure, editores) y otro en `mobile/` (reglas de Expo, generado por la plantilla).

## Escaneo y subida de libros

El flujo completo está en [pipeline.md](pipeline.md). Las herramientas:

- **Hoja de registro:** Google Sheets, con los 3000 IDs, los bloques por persona y el avance. Está en el Drive del usuario.
- **Carpeta compartida de escaneo:** Google Drive, con `por-subir/` y `subidos/`. Aún no se crean y falta confirmar el servicio.
- **Scripts de subida y procesamiento:** Python 3.14, en `pipeline/` (`subir_lotes.py` y `procesar_libro.py`, escritos el 2026-10-04 y todavía sin probar de punta a punta). Usan las API de Drive y de Sheets (OAuth de escritorio), `azure-storage-blob`, `azure-cosmos`, `azure-identity`, PyMuPDF y Tesseract (`pytesseract`); las versiones están fijadas en `pipeline/requirements.txt`. Se autentican en Azure con `az login`, sin llaves; en Cosmos usan el rol de datos `Cosmos DB Built-in Data Contributor` (asignado el 2026-10-04). La configuración y las credenciales de Google viven en `~/.config/biblioteca-virtual/`, fuera del repo.
- **App de escaneo del celular:** por definir. Microsoft Lens fue retirada, así que no es opción.
- **Conectores de Claude:** el de Google Drive crea, busca, lee y comparte archivos, y el de Google Sheets (conectado el 2026-10-04) lee y edita celdas, formatos y pestañas de la hoja de registro desde las sesiones de trabajo. Editar la hoja desde el script de subida es aparte: requeriría la API de Sheets con credenciales de Google, que se guardarían fuera del repo (el `.gitignore` aún no ignora `credentials.json` ni `token.json`).

## Pendiente por definir

- [x] ~~OCR~~ → 2026-10-04: Tesseract y PyMuPDF en la PC de quien sube (ver "Decisión: OCR y disparador"). Falta medirlo con el libro piloto
- [ ] Backend (lenguaje, framework, hosting de la API)
- [x] ~~Disparador del pipeline~~ → 2026-10-04: no hay disparador en la nube; el OCR lo corre el propio script de subida
- [ ] App de escaneo del celular (probar con un libro piloto)
- [x] App móvil: Expo, SDK 57 (ver arriba)
- [ ] Autenticación
- [ ] Control de versiones y CI/CD
