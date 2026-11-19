# Backend: API de búsqueda

API en Python con FastAPI sobre Cosmos DB for NoSQL. Lee los libros y las páginas que carga el [pipeline](../pipeline/README.md); no escribe nada en Azure.

| Archivo | Qué hace |
|---|---|
| `app/main.py` | Endpoints y arranque con prueba de conexión (fail-fast) |
| `app/db.py` | Conexión única a Cosmos y a Blob (patrón Singleton), `ping` y enlace temporal al PDF |
| `app/consultas.py` | Consultas a Cosmos, siempre con parámetros |
| `app/config.py` | Lee la configuración de variables de entorno (`.env`) |

## Preparación (una vez)

```powershell
cd backend
uv venv .venv --python 3.14
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
Copy-Item .env.example .env
```

Sin `uv`: `python -m venv .venv` y `.venv\Scripts\pip install -r requirements.txt` (en Linux o macOS, `.venv/bin/...`).

**Azure:** `az login`. La cuenta necesita `Cosmos DB Built-in Data Contributor` (o `Data Reader`) en Cosmos y `Storage Blob Data Contributor` en la cuenta de almacenamiento (para firmar el enlace al PDF). No se usan llaves. `.env` no se sube a git.

## Uso

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Para que la [app móvil](../mobile/README.md) la alcance desde un teléfono en la misma red, agrega `--host 0.0.0.0 --port 8000`.

`EQUIPO` (en `.env`) lleva los bloques de IDs de cada integrante, igual que la pestaña `Bloques` de la hoja de registro; si cambia el reparto, hay que cambiarla también aquí.

Al arrancar, la API lee los dos contenedores de Cosmos y cuenta los libros. Si la cuenta no responde o falta el rol, termina con error y no atiende peticiones.

Documentación interactiva para probar los endpoints: <http://127.0.0.1:8000/docs>

## Endpoints

| Endpoint | Qué devuelve |
|---|---|
| `GET /salud` | Prueba de conexión activa a Cosmos, número de libros y `conexion` (identificador del cliente único, hora de creación y proceso) |
| `GET /libros` | Búsqueda por metadatos: `iglesia`, `tipo`, `idioma`, `anio_desde`, `anio_hasta`, `titulo`, `autor`, `capitulo`, `estado`. Paginación con `limite` y `desde`; `hayMas` indica si hay otra página |
| `GET /filtros` | Valores existentes de iglesia, tipo e idioma, y el rango de años, para armar los filtros de la app |
| `GET /admin/progreso` | Libros subidos, procesados, con error y páginas por integrante, frente a la meta de su bloque (`EQUIPO`) |
| `GET /libros/{id}` | Detalle del libro, con `portadaUrl` |
| `GET /libros/{id}/paginas/{numero}` | Texto de una página |
| `GET /libros/{id}/pdf` | Enlace temporal de solo lectura al PDF (SAS de 15 minutos) |
| `GET /buscar` | Texto completo en las páginas: `q` (todas las palabras), `idioma` (`es` o `en`), `libro`, `iglesia`, `tipo`, `anio_desde`, `anio_hasta`, `limite`, `desde`. Ordena por relevancia, devuelve un fragmento y `hayMas` |

Ejemplos:

```
/libros?iglesia=Iglesia Católica&anio_desde=1900&anio_hasta=1910
/libros?capitulo=bautismo
/buscar?q=oración&tipo=Catecismos y doctrina
/buscar?q=gracia divina&libro=LIB-0002
```

## Equivalencias con MongoDB

| MongoDB | Aquí (Cosmos DB for NoSQL) |
|---|---|
| `MongoClient` único | `Conexion` en `app/db.py`: un solo `CosmosClient` por proceso |
| Comando `ping` | `Conexion.ping()`: lee los contenedores y hace una consulta mínima |
| `$elemMatch` sobre un arreglo | `EXISTS(SELECT VALUE cap FROM cap IN c.capitulos WHERE ...)`, en el filtro `capitulo` de `/libros` |
| Índice de texto | Índice de texto completo de `paginas` (`FullTextContainsAll` y `ORDER BY RANK FullTextScore`) |
| `upsert=True` | `upsert_item` y lotes `upsert`, en el pipeline |
