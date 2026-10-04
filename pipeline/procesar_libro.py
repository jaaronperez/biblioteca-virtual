"""Pasos 8 a 12 del flujo: texto, portada, páginas en Cosmos y cierre del libro.

Lo llama subir_lotes.py después de subir cada libro, y también se corre a mano
para reintentar o reprocesar un libro que ya está en Blob y en Cosmos `libros`:

    python procesar_libro.py LIB-0001 LIB-0002
    python procesar_libro.py --pendientes       # todos los libros en `subido` o `error`
    python procesar_libro.py LIB-0001 --forzar-ocr

Ver documents/pipeline.md.
"""

import argparse
import logging
import shutil
from collections import Counter
from dataclasses import dataclass, field

import config
import extraer
from azure_api import Azure

log = logging.getLogger("procesar_libro")


@dataclass
class ResultadoTexto:
    id: str
    ok: bool
    motivo: str = ""
    paginas: int = 0
    motores: dict = field(default_factory=dict)


def procesar(libro_id: str, cfg: config.Config, forzar_ocr: bool = False, azure: Azure | None = None) -> ResultadoTexto:
    azure = azure or Azure(cfg)
    libro = azure.leer_libro(libro_id)
    if libro is None:
        return ResultadoTexto(libro_id, False, "no existe en Cosmos `libros` (súbelo con subir_lotes.py)")

    carpeta = cfg.dir_trabajo / libro_id
    pdf = carpeta / libro["pdf"]
    try:
        carpeta.mkdir(parents=True, exist_ok=True)
        if not pdf.exists():
            log.info("%s: descargando el PDF de Blob", libro_id)
            azure.descargar_pdf(libro["pdf"], pdf)

        # 8. Texto página por página
        jsonl = extraer.extraer_texto(pdf, carpeta, libro, forzar_ocr)
        paginas = extraer.leer_paginas(jsonl)
        portada = extraer.generar_portada(pdf, carpeta / f"{libro_id}.jpg")

        # 9. Portada
        azure.subir_portada(portada, portada.name)

        # 10. Páginas en Cosmos
        azure.guardar_paginas(libro_id, paginas)
        borradas = azure.borrar_paginas_sobrantes(libro_id, len(paginas))
        if borradas:
            log.info("%s: se borraron %d páginas sobrantes de un procesamiento anterior", libro_id, borradas)

        # 11. Cerrar el libro
        libro.update(numPaginas=len(paginas), portada=portada.name, estado="procesado")
        libro.pop("error", None)
        azure.guardar_libro(libro)
    except Exception as e:
        motivo = f"{type(e).__name__}: {e}"[:500]
        log.error("%s: %s (se conserva %s)", libro_id, motivo, carpeta)
        libro.update(estado="error", error=motivo)
        try:
            azure.guardar_libro(libro)
        except Exception as e2:
            log.error("%s: tampoco se pudo marcar el error en Cosmos: %s", libro_id, e2)
        return ResultadoTexto(libro_id, False, motivo)

    # 12. Limpiar
    shutil.rmtree(carpeta, ignore_errors=True)
    motores = dict(Counter(p["ocr"]["motor"] for p in paginas))
    log.info("%s: procesado (%d páginas, %s)", libro_id, len(paginas), motores)
    return ResultadoTexto(libro_id, True, paginas=len(paginas), motores=motores)


def procesar_en_proceso(libro_id: str, cfg: config.Config, forzar_ocr: bool) -> ResultadoTexto:
    """Punto de entrada para ProcessPoolExecutor: cada proceso abre sus propios clientes."""
    configurar_log()
    return procesar(libro_id, cfg, forzar_ocr)


def configurar_log() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    for ruidoso in ("azure", "urllib3", "googleapiclient"):
        logging.getLogger(ruidoso).setLevel(logging.WARNING)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("ids", nargs="*", help="IDs de libro, por ejemplo LIB-0001")
    parser.add_argument("--pendientes", action="store_true", help="procesa los libros en `subido` o `error`")
    parser.add_argument("--forzar-ocr", action="store_true", help="pasa todas las páginas por Tesseract")
    args = parser.parse_args()
    configurar_log()

    cfg = config.cargar()
    azure = Azure(cfg)
    ids = list(args.ids)
    if args.pendientes:
        ids += [i for i, e in sorted(azure.estados_libros().items()) if e in ("subido", "error") and i not in ids]
    if not ids:
        parser.error("indica uno o más IDs, o --pendientes")

    resultados = [procesar(i, cfg, args.forzar_ocr, azure) for i in ids]
    fallidos = [r for r in resultados if not r.ok]
    print(f"\nProcesados: {len(resultados) - len(fallidos)}  Con error: {len(fallidos)}")
    for r in fallidos:
        print(f"  {r.id}: {r.motivo}")
    raise SystemExit(1 if fallidos else 0)


if __name__ == "__main__":
    main()
