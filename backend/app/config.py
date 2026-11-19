"""Configuración de la API: todo sale de variables de entorno (backend/.env).

No hay endpoints, cuentas ni llaves escritos en el código. Si falta una variable
obligatoria, la API no arranca.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _obligatoria(nombre: str) -> str:
    valor = os.environ.get(nombre, "").strip()
    if not valor:
        raise SystemExit(f"Falta la variable de entorno {nombre}. Copia .env.example a .env y llénala.")
    return valor


@dataclass(frozen=True)
class Bloque:
    """Bloque de IDs que le toca escanear a un integrante (LIB-<desde> a LIB-<hasta>)."""

    nombre: str
    desde: int
    hasta: int


def _equipo(texto: str) -> tuple[Bloque, ...]:
    """Lee `Nombre:desde-hasta;Nombre:desde-hasta` (los bloques de la hoja de registro)."""
    bloques = []
    for parte in filter(None, (p.strip() for p in texto.split(";"))):
        try:
            nombre, rango = parte.rsplit(":", 1)
            desde, hasta = (int(n) for n in rango.split("-"))
        except ValueError:
            raise SystemExit(f"EQUIPO mal escrito en «{parte}». Formato: Nombre:1-750;Nombre:751-1500") from None
        bloques.append(Bloque(nombre.strip(), desde, hasta))
    return tuple(bloques)


@dataclass(frozen=True)
class Config:
    cosmos_endpoint: str
    cosmos_db: str
    cosmos_key: str | None
    cuenta_storage: str
    contenedor_pdf: str
    contenedor_portadas: str
    sas_minutos: int
    equipo: tuple[Bloque, ...]


def cargar() -> Config:
    return Config(
        cosmos_endpoint=_obligatoria("COSMOS_ENDPOINT"),
        cosmos_db=_obligatoria("COSMOS_DB"),
        cosmos_key=os.environ.get("COSMOS_KEY", "").strip() or None,
        cuenta_storage=_obligatoria("STORAGE_ACCOUNT"),
        contenedor_pdf=_obligatoria("CONTENEDOR_PDF"),
        contenedor_portadas=_obligatoria("CONTENEDOR_PORTADAS"),
        sas_minutos=int(os.environ.get("SAS_MINUTOS", "15")),
        equipo=_equipo(_obligatoria("EQUIPO")),
    )
