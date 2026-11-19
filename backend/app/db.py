"""Conexión única a Cosmos DB y a Blob Storage (patrón Singleton).

`Conexion()` devuelve siempre la misma instancia: un solo CosmosClient y un solo
BlobServiceClient para todo el proceso, que reutilizan sus conexiones TCP entre
peticiones. Crear un cliente por petición abriría conexiones nuevas cada vez.
"""

import os
import threading
from datetime import datetime, timedelta, timezone

from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobSasPermissions, BlobServiceClient, generate_blob_sas

from . import config


class Conexion:
    _instancia: "Conexion | None" = None
    _candado = threading.Lock()

    def __new__(cls) -> "Conexion":
        if cls._instancia is None:
            with cls._candado:
                if cls._instancia is None:  # otro hilo pudo crearla mientras se esperaba
                    instancia = super().__new__(cls)
                    instancia._conectar()
                    cls._instancia = instancia
        return cls._instancia

    def _conectar(self) -> None:
        self.cfg = config.cargar()
        azure = DefaultAzureCredential(exclude_interactive_browser_credential=True)
        self.cosmos = CosmosClient(self.cfg.cosmos_endpoint, credential=self.cfg.cosmos_key or azure)
        self.db = self.cosmos.get_database_client(self.cfg.cosmos_db)
        self.libros = self.db.get_container_client("libros")
        self.paginas = self.db.get_container_client("paginas")
        self.url_blob = f"https://{self.cfg.cuenta_storage}.blob.core.windows.net"
        self.blob = BlobServiceClient(self.url_blob, credential=azure)
        self.creada = datetime.now(timezone.utc)

    def ping(self) -> dict:
        """Prueba de conexión activa: red, firewall y rol de datos.

        Cosmos DB for NoSQL no tiene un comando `ping`; lo equivalente es leer los
        metadatos de los dos contenedores y hacer una consulta mínima. Lanza una
        excepción si la cuenta no responde o si la identidad no tiene permisos.
        """
        for contenedor in (self.libros, self.paginas):
            contenedor.read()
        libros = list(self.libros.query_items("SELECT VALUE COUNT(1) FROM c", enable_cross_partition_query=True))
        return {
            "cosmos": "ok",
            "baseDeDatos": self.cfg.cosmos_db,
            "libros": libros[0],
            # Identifica al cliente único: todas las peticiones deben ver el mismo valor
            "conexion": {
                "instancia": f"{id(self.cosmos):x}",
                "creada": self.creada.isoformat(),
                "proceso": os.getpid(),
            },
        }

    def url_portada(self, nombre: str | None) -> str | None:
        """El contenedor de portadas es de lectura pública: basta la URL directa."""
        return f"{self.url_blob}/{self.cfg.contenedor_portadas}/{nombre}" if nombre else None

    def url_pdf_temporal(self, nombre: str) -> tuple[str, datetime]:
        """Enlace de solo lectura al PDF (contenedor privado), firmado con la identidad de Azure."""
        ahora = datetime.now(timezone.utc)
        vence = ahora + timedelta(minutes=self.cfg.sas_minutos)
        llave = self.blob.get_user_delegation_key(ahora - timedelta(minutes=5), vence)
        sas = generate_blob_sas(
            account_name=self.cfg.cuenta_storage,
            container_name=self.cfg.contenedor_pdf,
            blob_name=nombre,
            user_delegation_key=llave,
            permission=BlobSasPermissions(read=True),
            expiry=vence,
        )
        return f"{self.url_blob}/{self.cfg.contenedor_pdf}/{nombre}?{sas}", vence
