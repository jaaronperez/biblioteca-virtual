# Stack tecnológico

Define las tecnologías del proyecto Biblioteca Virtual Eclesiástica. Ver contexto y cronograma en [contexto-proyecto.md](contexto-proyecto.md).

> Estado: **provisional**. Por ahora solo está definida la parte de Azure. Backend y frontend/móvil están pendientes.

## Nube: Microsoft Azure

| Componente | Servicio | Uso |
|---|---|---|
| Almacenamiento de archivos | **Azure Blob Storage** | Guarda los libros escaneados (PDF/imágenes). Ya creado. |
| Base de datos NoSQL | **Azure Cosmos DB for NoSQL** | Metadatos de libros y texto extraído por página, con índices para búsqueda. |

## Recursos creados en Azure

Suscripción: Azure for Students. Grupo de recursos: `biblioteca-virtual` (región `mexicocentral`). Verificado con `az` el 2026-10-03.

| Recurso | Valor |
|---|---|
| Cuenta de almacenamiento | `bibliotecadigital` (StorageV2, Standard_LRS, nivel Hot) |
| Contenedor | `libros-escaneados` |
| Seguridad | Solo HTTPS, TLS mínimo 1.2, acceso por llaves compartidas habilitado |
| Namespace jerárquico (Data Lake) | Deshabilitado |
| Protección de datos | Soft delete de blobs y de contenedores deshabilitado; versionado no habilitado |
| Ciclo de vida y CORS | Sin política de ciclo de vida y sin reglas CORS |
| Otros recursos del grupo | Ninguno. La cuenta de Cosmos DB aún no existe |

**Atención, acceso público:** la cuenta permite acceso público a blobs y el contenedor `libros-escaneados` tiene nivel de acceso `Blob`. Cualquiera con la URL de un libro puede descargarlo sin autenticarse. Si no es intencional, cambiarlo a privado y servir los libros desde la API (por ejemplo con SAS temporales).

## Decisión: Cosmos DB for NoSQL

- Servicio NoSQL nativo de Azure, basado en JSON, que coincide con el modelo de datos del proyecto (libro, capítulos, páginas).
- Escala y responde rápido, lo que apoya el criterio de evaluación de arquitectura NoSQL y nube (40%).
- Se integra directo con Blob Storage y el resto de Azure.
- Incluye búsqueda de texto completo integrada. Verificar disponibilidad en la región y SDK elegidos antes de depender de ella.

**Descartado como base principal:** Azure AI Search. Es un buscador, no una base de datos. Se puede añadir más adelante como complemento si la búsqueda no alcanza.

## Modelo de datos (borrador)

- Un documento **por página**, no por libro (límite de 2 MB por documento en Cosmos DB y búsqueda más precisa).
- Colección `libros`: metadatos (título, iglesia, fecha, tipo de libro, URL del blob).
- Colección `paginas`: texto del OCR, número de página y `bookId`.
- Partition key de `paginas`: `bookId`, para que abrir un libro lea una sola partición.
- Indexar los campos de filtro (fecha, iglesia, tipo) y excluir de la indexación lo que no se consulte.

## Capacidad y costo

- Suscripción: **Azure for Students**. Tiene un crédito limitado y algunos servicios o regiones pueden estar restringidos. Antes de crear Cosmos DB, confirmar que la suscripción permita serverless o free tier.
- Usar **serverless** o **free tier** (1000 RU/s y 25 GB gratis). Son excluyentes entre sí: se elige uno al crear la cuenta.
- Estimación: 3000 libros × ~300 páginas ≈ 900 mil documentos. Verificar el consumo de RU en las pruebas de carga (Fase 4).

## Flujo previsto

1. Se sube el libro escaneado a **Blob Storage** (subida en lote).
2. Se dispara el OCR (herramienta por definir).
3. El texto extraído se guarda en **Cosmos DB**, indexado.
4. La API consulta Cosmos DB y devuelve resultados con el enlace al blob.

## Pendiente por definir

- [ ] OCR (herramienta o servicio; Azure AI Document Intelligence queda descartado)
- [ ] Backend (lenguaje, framework, hosting de la API)
- [ ] Disparador del pipeline (por ejemplo Azure Functions)
- [ ] Frontend / app móvil
- [ ] Autenticación
- [ ] Control de versiones y CI/CD
