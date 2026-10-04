# Pipeline de digitalización

Describe el camino de un libro desde que se escanea hasta que está en Azure. Ver el stack en [stack-tecnologico.md](stack-tecnologico.md) y el avance en [progreso.md](progreso.md).

> Estado: **borrador**. Están confirmados el nombre del PDF, los bloques de IDs por persona y los estados de la hoja de registro. El resto del flujo es una propuesta. El OCR y Cosmos DB siguen pendientes.

## Reparto y nombres

- Escanean **4 personas**, con un bloque de 750 IDs cada una: `LIB-0001` a `LIB-0750`, `LIB-0751` a `LIB-1500`, `LIB-1501` a `LIB-2250` y `LIB-2251` a `LIB-3000`. Quién tiene cada bloque está en la pestaña `Bloques` de la hoja de registro.
- El ID lo asigna la **hoja de registro** antes de escanear. Nadie lleva su propia cuenta.
- El PDF se llama igual que el ID: `LIB-0770.pdf`. Formato `^LIB-\d{4}\.pdf$`: prefijo en mayúsculas, un guion, 4 dígitos, sin espacios ni sufijos como `final` o `v2`.
- Un PDF es un libro completo. Cada tomo es un libro y lleva su propio ID.
- La portada es la primera página. Se escanea todo, incluidas las hojas en blanco y la contraportada.

## Hoja de registro

Hoja de Google Sheets con cinco pestañas: `Registro` (los 3000 IDs con título, autor, iglesia, fecha, año desde, año hasta, tipo, idioma, responsable, estado, fecha de escaneo, páginas y notas), `Bloques`, `Resumen` (avance por estado y por persona), `Guía` y `Listas` (los valores permitidos de `Tipo` e `Iglesia`). El responsable de cada fila se calcula solo a partir del bloque, y `Año desde` y `Año hasta` salen de la `Fecha`. `Tipo` e `Iglesia` son desplegables de lista cerrada.

Las listas parten de una decisión y un supuesto. Decidido el 2026-10-04: todos los libros son impresos. Supuesto por confirmar: "iglesia" es la denominación (por ejemplo `Iglesia Católica`) y no la parroquia. `Tipo` tiene 11 valores, incluido `Otro`. Con la decisión de libros impresos se quitó de la lista el tipo `Registros parroquiales` (2026-10-04). Idiomas de los libros: español e inglés (decidido el 2026-10-04). El idioma de cada libro se elige en la columna `Idioma` (desplegable de `Español` e `Inglés`) y decide con qué modelo lee el OCR: `spa` para español y `eng` para inglés.

Estados y quién los cambia:

| Estado | Significado | Quién lo cambia |
|---|---|---|
| `pendiente` | Libro sin escanear. Valor por defecto. | Nadie |
| `en curso` | Se está escaneando. | Quien escanea |
| `escaneado` | El PDF ya está listo para subir: en `por-subir/` de Drive, o descargado de Internet Archive si es un libro digital. | Quien escanea |
| `subido` | El PDF ya está en Azure. | Quien sube los lotes |
| `verificado` | Se comprobó que el PDF abre y tiene todas las páginas. | Quien sube los lotes |
| `con problema` | Libro dañado o incompleto. Se explica en Notas y no se sube. | Quien escanea |

## Flujo de quien escanea (propuesta)

1. Toma el siguiente ID `pendiente` de su bloque y marca `en curso`.
2. Llena título, autor (si el libro lo tiene), iglesia, fecha, tipo e idioma, y etiqueta el libro físico con el ID. El autor va en su propia columna, no dentro del título.
3. Escanea en orden con la app del celular, empezando por la portada, y revisa las páginas dentro de la app.
4. Guarda el documento con el nombre exacto `LIB-0770`, que se exporta como PDF.
5. Exporta el PDF a la carpeta compartida `por-subir/` de Drive y comprueba que apareció con ese nombre.
6. Actualiza la hoja: páginas, fecha de escaneo y estado `escaneado`.
7. El PDF se queda en el celular hasta que el libro pase a `verificado`.

## Subida de lotes: `pipeline/subida/subir_lotes.py` (propuesta)

Lo corre quien sube los lotes, desde su PC. Está en Python (API de Drive, `azure-storage-blob` y `azure-identity`; se autentica en Azure con `az login`). Por ahora la carpeta solo tiene los archivos vacíos.

1. Se conecta a Azure y a Drive. Si falla, se detiene antes de tocar nada.
2. Lista `por-subir/` y los blobs que ya existen en `libros-escaneados`.
3. Por cada archivo valida el nombre y que el PDF abra y tenga páginas.
4. Si el blob ya existe con el mismo tamaño, solo lo mueve a `subidos/`. Si existe con otro tamaño, lo reporta como conflicto y no lo sobrescribe.
5. Si no existe, lo descarga a una carpeta temporal fuera del repo, lo sube sin sobrescribir, confirma que existe y pesa lo mismo, y lo mueve de `por-subir/` a `subidos/`.
6. Imprime y guarda un reporte: subidos, ya existentes, rechazados, conflictos y errores.
7. Al terminar, dispara el OCR para los libros recién subidos (opción `--sin-ocr` para desactivarlo). Hasta que el OCR y Cosmos estén definidos, este paso queda apagado.

Garantías: nunca sobrescribe un blob, no mueve un archivo sin confirmar antes que está en Blob, correrlo dos veces no duplica nada, un archivo con error no frena a los demás, nunca borra nada en Drive y no imprime secretos. Opciones previstas: `--dry-run` y `--limit N`. El PDF local se conserva hasta que el OCR termine bien.

## Procesamiento de un libro: `pipeline/ocr/procesar_libro.py` (propuesta)

Lo llama `subir_lotes.py` al terminar la subida, o se corre a mano con el ID del libro. Todavía no existe. Cosmos DB no dispara nada por sí solo: el propio script escribe las páginas.

1. Recibe el ID (por ejemplo `LIB-0770`) y lee el documento del libro en `libros`, por su `id`, para saber el idioma y copiar iglesia, tipo y años. Si el documento no existe, se detiene y lo reporta.
2. Abre el PDF (la copia local o una descarga de Blob) y lo separa en páginas.
3. Por cada página, extrae el texto con el OCR en el idioma del libro (`spa` o `eng`) y arma el documento de `paginas`: `id` `LIB-0770-p0001`, `bookId`, `numero`, `idioma`, `textoEs` o `textoEn`, los filtros copiados y el objeto `ocr`.
4. Escribe las páginas en Cosmos con upsert, en lotes de hasta 100 operaciones (todas comparten la partición `bookId`, así que cada lote es atómico; verificar el límite). Repetir el proceso no duplica nada, porque el `id` es determinista.
5. Si el libro tiene ahora menos páginas que antes (reescaneo), borra las páginas sobrantes.
6. Genera la miniatura de la página 1 y la sube a `portadas`.
7. Solo al final actualiza `libros`: `numPaginas`, `portada` y `estado` en `procesado`. Si algo falla, el `estado` queda en `error` y el motivo se registra.

Depende de que el registro del libro ya exista en `libros`, y hoy nadie lo crea (ver Pendiente por definir).

## Pendiente por definir

- [ ] App de escaneo del celular (probar con un libro piloto: ajustes, nombre del archivo exportado y límite de páginas por documento)
- [ ] Servicio de la carpeta compartida (Drive u OneDrive) y permisos para que quien sube pueda mover los archivos de los demás
- [ ] Quién sube los lotes a Azure
- [ ] Alcance de la primera versión del script: modo de reemplazos, validación con `pypdf` y marcado automático de `subido` en la hoja
- [ ] Quién crea el registro de cada libro en Cosmos DB. Hoy nadie: la actividad solo describe la subida y el OCR. Propuesta: un script aparte (por ejemplo `cargar_libros.py`) que lee la hoja, valida los datos y crea o actualiza el documento del libro, antes de que corra el OCR
- [ ] Revisar las listas de `Tipo` e `Iglesia` después de los primeros 100 libros (cuántos cayeron en `Otro`)
- [ ] OCR, dónde corre y cómo se dispara (ver `stack-tecnologico.md`)
