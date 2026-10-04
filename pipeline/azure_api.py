"""Acceso a Blob Storage y a Cosmos DB. Se autentica con `az login`, sin llaves."""

import hashlib
from dataclasses import dataclass
from pathlib import Path

from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.cosmos import CosmosClient
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, ContentSettings

from config import Config

# Cosmos permite hasta 100 operaciones y 2 MB por lote transaccional, pero cada
# página cuesta ~13 RU o más (índice de texto completo) y la base tiene 1000 RU/s
# compartidos: un lote de 100 pide más de lo que hay en un segundo. Con 25 queda
# en ~300-600 RU y deja margen a varios procesos escribiendo a la vez.
LOTE_MAX_OPERACIONES = 25
LOTE_MAX_BYTES = 1_500_000
# Reintentos ante 429 (exceso de RU): el SDK espera lo que indica Cosmos.
# Por defecto se rinde a los 9 intentos o 30 s; aquí aguanta hasta 5 minutos.
COSMOS_REINTENTOS = 60
COSMOS_ESPERA_MAX_S = 300

CAMPOS_SISTEMA_COSMOS = ("_rid", "_self", "_etag", "_attachments", "_ts")


class ConflictoBlob(Exception):
    """El blob ya existe: nunca se sobrescribe un PDF."""


@dataclass
class InfoBlob:
    nombre: str
    md5: str | None  # hexadecimal
    tamano: int


def md5_archivo(ruta: Path) -> str:
    h = hashlib.md5()
    with ruta.open("rb") as f:
        for bloque in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(bloque)
    return h.hexdigest()


def _md5_hex(content_md5) -> str | None:
    return bytes(content_md5).hex() if content_md5 else None


class Azure:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        credencial = DefaultAzureCredential(exclude_interactive_browser_credential=True)
        self.blob = BlobServiceClient(
            f"https://{cfg.cuenta_storage}.blob.core.windows.net", credential=credencial
        )
        self.pdfs = self.blob.get_container_client(cfg.contenedor_pdf)
        self.portadas = self.blob.get_container_client(cfg.contenedor_portadas)
        cosmos = CosmosClient(
            cfg.cosmos_endpoint,
            credential=credencial,
            retry_total=COSMOS_REINTENTOS,
            retry_backoff_max=COSMOS_ESPERA_MAX_S,
        )
        db = cosmos.get_database_client(cfg.cosmos_db)
        self.libros = db.get_container_client("libros")
        self.paginas = db.get_container_client("paginas")

    # --- Blob ---

    def listar_pdfs(self) -> dict[str, InfoBlob]:
        return {
            b.name: InfoBlob(b.name, _md5_hex(b.content_settings.content_md5), b.size)
            for b in self.pdfs.list_blobs()
            if b.name.lower().endswith(".pdf")
        }

    def info_pdf(self, nombre: str) -> InfoBlob | None:
        try:
            p = self.pdfs.get_blob_client(nombre).get_blob_properties()
        except ResourceNotFoundError:
            return None
        return InfoBlob(nombre, _md5_hex(p.content_settings.content_md5), p.size)

    def subir_pdf(self, ruta: Path, nombre: str, md5_hex: str) -> None:
        """Sube sin sobrescribir y confirma que el blob quedó con el mismo MD5 y tamaño."""
        ajustes = ContentSettings(
            content_type="application/pdf",
            content_md5=bytearray(bytes.fromhex(md5_hex)),
        )
        try:
            with ruta.open("rb") as f:
                self.pdfs.upload_blob(
                    nombre, f, overwrite=False, content_settings=ajustes, max_concurrency=4
                )
        except ResourceExistsError as e:
            raise ConflictoBlob(f"{nombre} ya existe en {self.cfg.contenedor_pdf}") from e
        info = self.info_pdf(nombre)
        if info is None or info.md5 != md5_hex or info.tamano != ruta.stat().st_size:
            raise RuntimeError(f"La verificación de {nombre} en Blob falló después de subirlo")

    def descargar_pdf(self, nombre: str, destino: Path) -> None:
        destino.parent.mkdir(parents=True, exist_ok=True)
        parcial = destino.with_suffix(destino.suffix + ".part")
        with parcial.open("wb") as f:
            self.pdfs.download_blob(nombre, max_concurrency=4).readinto(f)
        parcial.replace(destino)

    def subir_portada(self, ruta: Path, nombre: str) -> None:
        # La portada se genera del PDF, así que sí se puede reemplazar
        with ruta.open("rb") as f:
            self.portadas.upload_blob(
                nombre,
                f,
                overwrite=True,
                content_settings=ContentSettings(
                    content_type="image/jpeg", cache_control="public, max-age=86400"
                ),
            )

    # --- Cosmos: libros ---

    def leer_libro(self, libro_id: str) -> dict | None:
        try:
            doc = self.libros.read_item(libro_id, partition_key=libro_id)
        except CosmosResourceNotFoundError:
            return None
        return {k: v for k, v in doc.items() if k not in CAMPOS_SISTEMA_COSMOS}

    def estados_libros(self) -> dict[str, str]:
        consulta = "SELECT c.id, c.estado FROM c"
        return {
            d["id"]: d.get("estado", "")
            for d in self.libros.query_items(consulta, enable_cross_partition_query=True)
        }

    def guardar_libro(self, doc: dict) -> None:
        self.libros.upsert_item(doc)

    # --- Cosmos: páginas ---

    def guardar_paginas(self, libro_id: str, paginas: list[dict]) -> None:
        """Upsert en lotes transaccionales de la partición del libro."""
        lote, tamano = [], 0
        for pagina in paginas:
            bytes_pagina = len(str(pagina).encode()) + 200
            if lote and (len(lote) >= LOTE_MAX_OPERACIONES or tamano + bytes_pagina > LOTE_MAX_BYTES):
                self.paginas.execute_item_batch(lote, partition_key=libro_id)
                lote, tamano = [], 0
            lote.append(("upsert", (pagina,)))
            tamano += bytes_pagina
        if lote:
            self.paginas.execute_item_batch(lote, partition_key=libro_id)

    def borrar_paginas_sobrantes(self, libro_id: str, num_paginas: int) -> int:
        sobrantes = list(self.paginas.query_items(
            "SELECT c.id FROM c WHERE c.numero > @n",
            parameters=[{"name": "@n", "value": num_paginas}],
            partition_key=libro_id,
        ))
        for d in sobrantes:
            self.paginas.delete_item(d["id"], partition_key=libro_id)
        return len(sobrantes)
