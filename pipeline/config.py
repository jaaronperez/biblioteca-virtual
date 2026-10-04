"""Configuración del pipeline.

Se lee de ~/.config/biblioteca-virtual/config.toml (fuera del repo). En la misma
carpeta viven credentials.json y token.json de Google. La ruta se puede cambiar
con la variable de entorno BIBLIOTECA_CONFIG_DIR.
"""

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path

DIR_CONFIG = Path(os.environ.get("BIBLIOTECA_CONFIG_DIR", "~/.config/biblioteca-virtual")).expanduser()

# Estados de la hoja de registro (ver documents/pipeline.md)
ESTADOS_HOJA_SUBIBLES = {"escaneado", "subido", "verificado"}
IDIOMAS_HOJA = {"Español": "es", "Inglés": "en"}
# Modelo de Tesseract y campo de texto de Cosmos por idioma
TESSERACT_POR_IDIOMA = {"es": "spa", "en": "eng"}
CAMPO_TEXTO_POR_IDIOMA = {"es": "textoEs", "en": "textoEn"}


@dataclass(frozen=True)
class Config:
    hoja_id: str
    hoja_pestana: str
    carpeta_por_subir: str
    carpeta_subidos: str
    cuenta_storage: str
    contenedor_pdf: str
    contenedor_portadas: str
    cosmos_endpoint: str
    cosmos_db: str
    dir_trabajo: Path

    @property
    def credenciales_google(self) -> Path:
        return DIR_CONFIG / "credentials.json"

    @property
    def token_google(self) -> Path:
        return DIR_CONFIG / "token.json"

    @property
    def dir_reportes(self) -> Path:
        return self.dir_trabajo / "reportes"


def cargar() -> Config:
    ruta = DIR_CONFIG / "config.toml"
    if not ruta.exists():
        raise SystemExit(
            f"No existe {ruta}. Copia pipeline/config.example.toml ahí y llena los IDs de Drive."
        )
    with ruta.open("rb") as f:
        datos = tomllib.load(f)
    g, az, local = datos["google"], datos["azure"], datos.get("local", {})
    return Config(
        hoja_id=g["hoja_id"],
        hoja_pestana=g.get("pestana", "Registro"),
        carpeta_por_subir=g.get("carpeta_por_subir", ""),
        carpeta_subidos=g.get("carpeta_subidos", ""),
        cuenta_storage=az["cuenta_storage"],
        contenedor_pdf=az.get("contenedor_pdf", "libros-escaneados"),
        contenedor_portadas=az.get("contenedor_portadas", "portadas"),
        cosmos_endpoint=az["cosmos_endpoint"],
        cosmos_db=az.get("cosmos_db", "biblioteca"),
        dir_trabajo=Path(local.get("dir_trabajo", "~/biblioteca-trabajo")).expanduser(),
    )
