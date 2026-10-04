"""Acceso a Google Drive (carpetas por-subir/ y subidos/) y a la hoja de registro."""

from dataclasses import dataclass
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from config import Config

# drive completo: hace falta para mover archivos que subieron otras personas
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]


def credenciales(cfg: Config) -> Credentials:
    """Token OAuth guardado fuera del repo. La primera vez abre el navegador."""
    creds = None
    if cfg.token_google.exists():
        creds = Credentials.from_authorized_user_file(str(cfg.token_google), SCOPES)
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception:
            creds = None
    if not creds or not creds.valid:
        if not cfg.credenciales_google.exists():
            raise SystemExit(
                f"Falta {cfg.credenciales_google}: descarga el cliente OAuth de escritorio "
                "de Google Cloud Console (ver pipeline/README.md)."
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(cfg.credenciales_google), SCOPES)
        creds = flow.run_local_server(port=0)
    cfg.token_google.parent.mkdir(parents=True, exist_ok=True)
    cfg.token_google.write_text(creds.to_json())
    cfg.token_google.chmod(0o600)
    return creds


@dataclass
class ArchivoDrive:
    id: str
    nombre: str
    md5: str | None  # hexadecimal; Drive no lo da para documentos de Google
    tamano: int | None


class Drive:
    def __init__(self, creds: Credentials):
        self.api = build("drive", "v3", credentials=creds, cache_discovery=False)

    def listar(self, carpeta_id: str) -> list[ArchivoDrive]:
        archivos, token = [], None
        while True:
            resp = self.api.files().list(
                q=f"'{carpeta_id}' in parents and trashed = false",
                fields="nextPageToken, files(id, name, md5Checksum, size, mimeType)",
                pageSize=1000,
                pageToken=token,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            ).execute()
            for f in resp.get("files", []):
                if f["mimeType"] == "application/vnd.google-apps.folder":
                    continue
                archivos.append(ArchivoDrive(
                    id=f["id"],
                    nombre=f["name"],
                    md5=f.get("md5Checksum"),
                    tamano=int(f["size"]) if "size" in f else None,
                ))
            token = resp.get("nextPageToken")
            if not token:
                return sorted(archivos, key=lambda a: a.nombre)

    def descargar(self, archivo_id: str, destino: Path) -> None:
        destino.parent.mkdir(parents=True, exist_ok=True)
        parcial = destino.with_suffix(destino.suffix + ".part")
        peticion = self.api.files().get_media(fileId=archivo_id, supportsAllDrives=True)
        with parcial.open("wb") as fh:
            descarga = MediaIoBaseDownload(fh, peticion, chunksize=16 * 1024 * 1024)
            terminado = False
            while not terminado:
                _, terminado = descarga.next_chunk()
        parcial.replace(destino)

    def mover(self, archivo_id: str, de: str, a: str) -> None:
        self.api.files().update(
            fileId=archivo_id,
            addParents=a,
            removeParents=de,
            fields="id, parents",
            supportsAllDrives=True,
        ).execute()


@dataclass
class FilaLibro:
    fila: int  # número de fila en la hoja (1 = encabezado)
    datos: dict[str, str]

    def get(self, columna: str) -> str:
        return (self.datos.get(columna) or "").strip()


class Hoja:
    def __init__(self, creds: Credentials, hoja_id: str, pestana: str):
        self.api = build("sheets", "v4", credentials=creds, cache_discovery=False)
        self.hoja_id = hoja_id
        self.pestana = pestana
        self.encabezados: list[str] = []

    def leer(self) -> dict[str, FilaLibro]:
        """Lee la pestaña completa. Las columnas se identifican por su encabezado."""
        resp = self.api.spreadsheets().values().get(
            spreadsheetId=self.hoja_id,
            range=f"{self.pestana}!A1:Z",
            valueRenderOption="FORMATTED_VALUE",
        ).execute()
        filas = resp.get("values", [])
        if not filas:
            raise RuntimeError(f"La pestaña {self.pestana} está vacía")
        self.encabezados = [h.strip() for h in filas[0]]
        for requerido in ("ID", "Título", "Iglesia", "Tipo", "Idioma", "Estado"):
            if requerido not in self.encabezados:
                raise RuntimeError(f"Falta la columna '{requerido}' en la pestaña {self.pestana}")
        libros = {}
        for i, valores in enumerate(filas[1:], start=2):
            datos = dict(zip(self.encabezados, valores))
            libro_id = (datos.get("ID") or "").strip()
            if libro_id:
                libros[libro_id] = FilaLibro(fila=i, datos=datos)
        return libros

    def escribir(self, fila: FilaLibro, columna: str, valor: str) -> None:
        indice = self.encabezados.index(columna)
        celda = f"{self.pestana}!{_letra_columna(indice)}{fila.fila}"
        self.api.spreadsheets().values().update(
            spreadsheetId=self.hoja_id,
            range=celda,
            valueInputOption="RAW",
            body={"values": [[valor]]},
        ).execute()
        fila.datos[columna] = valor


def _letra_columna(indice: int) -> str:
    letras = ""
    indice += 1
    while indice:
        indice, resto = divmod(indice - 1, 26)
        letras = chr(65 + resto) + letras
    return letras
