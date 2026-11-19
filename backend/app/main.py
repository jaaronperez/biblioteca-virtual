"""API de la Biblioteca Virtual Eclesiástica (FastAPI sobre Cosmos DB for NoSQL)."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Literal

from azure.core.exceptions import AzureError
from fastapi import FastAPI, HTTPException, Path, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import consultas
from .db import Conexion

log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # Fail-fast: si Cosmos no responde o falta el rol de datos, la API no arranca
    try:
        estado = Conexion().ping()
    except Exception as e:
        log.error("No se pudo conectar a Cosmos DB: %s", e)
        raise SystemExit(1) from e
    log.info("Conexión a Cosmos DB verificada: %s", estado)
    yield


app = FastAPI(title="Biblioteca Virtual Eclesiástica", version="0.1.0", lifespan=ciclo_de_vida)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])


@app.exception_handler(AzureError)
async def error_de_azure(request: Request, exc: AzureError):
    log.error("Error de Azure en %s: %s", request.url.path, exc)
    return JSONResponse(status_code=502, content={"detail": "Azure no pudo atender la consulta."})


IdLibro = Annotated[str, Path(pattern=r"^LIB-\d{4}$", description="ID del libro, por ejemplo LIB-0001")]
Anio = Annotated[int | None, Query(ge=0, le=2100)]


@app.get("/salud", summary="Prueba de conexión activa a Cosmos DB")
def salud():
    return Conexion().ping()


@app.get("/libros", summary="Búsqueda por metadatos, con filtros combinables")
def listar_libros(
    iglesia: str | None = None,
    tipo: str | None = None,
    idioma: Literal["es", "en"] | None = None,
    anio_desde: Anio = None,
    anio_hasta: Anio = None,
    titulo: Annotated[str | None, Query(description="Texto contenido en el título")] = None,
    autor: Annotated[str | None, Query(description="Texto contenido en el autor")] = None,
    capitulo: Annotated[
        str | None, Query(description="Texto contenido en el título de algún capítulo (arreglo `capitulos`)")
    ] = None,
    estado: Literal["subido", "procesado", "error"] | None = None,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    desde: Annotated[int, Query(ge=0)] = 0,
):
    libros, hay_mas = consultas.buscar_libros(
        iglesia=iglesia, tipo=tipo, idioma=idioma, anio_desde=anio_desde, anio_hasta=anio_hasta,
        titulo=titulo, autor=autor, capitulo=capitulo, estado=estado, limite=limite, desde=desde,
    )
    return {"cantidad": len(libros), "desde": desde, "hayMas": hay_mas, "libros": libros}


@app.get("/filtros", summary="Valores disponibles para los filtros del buscador")
def filtros():
    return consultas.filtros_disponibles()


@app.get("/admin/progreso", summary="Avance de la digitalización por integrante")
def progreso():
    return {"actualizado": datetime.now(timezone.utc).isoformat(), **consultas.progreso_del_equipo()}


@app.get("/libros/{libro_id}", summary="Detalle de un libro")
def detalle_libro(libro_id: IdLibro):
    libro = consultas.leer_libro(libro_id)
    if libro is None:
        raise HTTPException(404, f"No existe el libro {libro_id}")
    return libro


@app.get("/libros/{libro_id}/paginas/{numero}", summary="Texto de una página")
def pagina(libro_id: IdLibro, numero: Annotated[int, Path(ge=1, le=9999)]):
    doc = consultas.leer_pagina(libro_id, numero)
    if doc is None:
        raise HTTPException(404, f"No existe la página {numero} de {libro_id}")
    return doc


@app.get("/libros/{libro_id}/pdf", summary="Enlace temporal al PDF del libro")
def pdf(libro_id: IdLibro):
    libro = consultas.leer_libro(libro_id)
    if libro is None or not libro.get("pdf"):
        raise HTTPException(404, f"No existe el libro {libro_id}")
    url, vence = Conexion().url_pdf_temporal(libro["pdf"])
    return {"url": url, "vence": vence.isoformat()}


@app.get("/buscar", summary="Búsqueda de texto completo en las páginas, combinada con filtros")
def buscar(
    q: Annotated[str, Query(min_length=2, max_length=100, description="Palabras a buscar (deben estar todas)")],
    idioma: Annotated[Literal["es", "en"], Query(description="Idioma de los libros donde se busca")] = "es",
    libro: Annotated[str | None, Query(pattern=r"^LIB-\d{4}$", description="Buscar solo dentro de un libro")] = None,
    iglesia: str | None = None,
    tipo: str | None = None,
    anio_desde: Anio = None,
    anio_hasta: Anio = None,
    limite: Annotated[int, Query(ge=1, le=50)] = 20,
    desde: Annotated[int, Query(ge=0, le=1000)] = 0,
):
    if not q.split():
        raise HTTPException(422, "La búsqueda está vacía")
    resultados, hay_mas = consultas.buscar_texto(
        q=q, idioma=idioma, libro=libro, iglesia=iglesia, tipo=tipo,
        anio_desde=anio_desde, anio_hasta=anio_hasta, limite=limite, desde=desde,
    )
    return {"cantidad": len(resultados), "desde": desde, "hayMas": hay_mas, "resultados": resultados}
