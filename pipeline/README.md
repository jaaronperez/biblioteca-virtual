# Pipeline de subida y procesamiento

Sube los PDF de `por-subir/` (Drive) a Blob Storage, extrae el texto de cada página y lo guarda en Cosmos DB. El flujo completo, con diagramas, está en [`documents/pipeline.md`](../documents/pipeline.md).

| Archivo | Qué hace |
|---|---|
| `subir_lotes.py` | Script principal: pasos 1 a 7 por libro y luego el texto en paralelo |
| `procesar_libro.py` | Pasos 8 a 12 (texto, portada, páginas, estado `procesado`). También se corre solo para reintentar |
| `extraer.py` | Texto por página (capa del PDF o Tesseract) y miniatura de la portada |
| `azure_api.py` | Blob Storage y Cosmos DB |
| `google_api.py` | Drive y hoja de registro |
| `config.py` | Lee `~/.config/biblioteca-virtual/config.toml` |

## Preparación (una vez)

1. **Python y dependencias**

   ```bash
   cd pipeline
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

2. **Tesseract** con español e inglés (solo hace falta para páginas sin capa de texto):

   ```bash
   sudo dnf install tesseract tesseract-langpack-spa tesseract-langpack-eng   # Fedora
   sudo apt install tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng         # Ubuntu/Debian
   ```

3. **Azure:** `az login`. La cuenta necesita los roles `Storage Blob Data Contributor` en la cuenta de almacenamiento y `Cosmos DB Built-in Data Contributor` en Cosmos. No se usan llaves.

4. **Google:** un cliente OAuth de escritorio.
   1. En [Google Cloud Console](https://console.cloud.google.com/), crea un proyecto (por ejemplo `biblioteca-virtual`).
   2. En *APIs y servicios → Biblioteca*, activa **Google Drive API** y **Google Sheets API**.
   3. En *Pantalla de consentimiento de OAuth*, elige tipo **Externo** y agrega tu correo como **usuario de prueba**.
   4. En *Credenciales → Crear credenciales → ID de cliente de OAuth*, elige el tipo **App de escritorio** y descarga el JSON.
   5. Guárdalo como `~/.config/biblioteca-virtual/credentials.json`. La primera vez que corras un script se abrirá el navegador para autorizar, y el token queda en `token.json`, en la misma carpeta. Con la app en modo de prueba, el token vence cada 7 días: si falla la autenticación, borra `token.json`.

5. **Configuración**

   ```bash
   mkdir -p ~/.config/biblioteca-virtual
   cp config.example.toml ~/.config/biblioteca-virtual/config.toml
   ```

   Llena `carpeta_por_subir` y `carpeta_subidos` con los IDs de las carpetas de Drive (la última parte de la URL de cada carpeta).

`credentials.json`, `token.json` y `config.toml` viven fuera del repo y no se suben a git.

## Uso

```bash
cd pipeline
.venv/bin/python subir_lotes.py --dry-run              # muestra qué haría, sin cambiar nada
.venv/bin/python subir_lotes.py --solo LIB-0001        # un solo libro
.venv/bin/python subir_lotes.py --limit 20 --workers 8 # hasta 20 libros, 8 en paralelo
.venv/bin/python subir_lotes.py --sin-texto            # solo subir y registrar

.venv/bin/python procesar_libro.py LIB-0001            # rehacer el texto de un libro
.venv/bin/python procesar_libro.py --pendientes        # todos los libros en `subido` o `error`
```

Cada corrida deja un reporte CSV en `~/biblioteca-trabajo/reportes/`. El texto temporal de cada libro queda en `~/biblioteca-trabajo/LIB-XXXX/paginas.jsonl` hasta que el libro se procesa bien. Si falla, la carpeta se conserva y el siguiente intento continúa desde la última página.

## Resultados posibles

| Resultado | Significado |
|---|---|
| `procesado` | Subido, con texto y portada, y movido a `subidos/` |
| `subido` | Subido y registrado, sin texto todavía (`--sin-texto`) |
| `ya existente` | Ya estaba en Blob y procesado: solo se movió a `subidos/` |
| `conflicto` | El blob existe con otro contenido, o hay dos archivos con el mismo nombre. No se toca nada |
| `rechazado` | El nombre, la fila de la hoja o el PDF no son válidos. El motivo va en el reporte |
| `error` | Falló un paso. El archivo sigue en `por-subir/`, o el libro queda en `error` en Cosmos para `procesar_libro.py` |
