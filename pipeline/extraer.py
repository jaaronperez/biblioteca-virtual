"""Extracción de texto página por página y miniatura de la portada.

Si la página trae capa de texto (por ejemplo los PDF de Internet Archive) se usa
directo con PyMuPDF. Si no, se pasa la página por Tesseract a 300 dpi.

El texto se guarda en <carpeta>/paginas.jsonl, una línea por página, ya con la
forma del documento de Cosmos. Si el proceso se corta, al volver a correrlo
continúa desde la última página guardada (siempre que el PDF sea el mismo).
"""

import io
import json
import logging
from pathlib import Path

import pymupdf

from azure_api import md5_archivo
from config import CAMPO_TEXTO_POR_IDIOMA, TESSERACT_POR_IDIOMA

log = logging.getLogger(__name__)

MIN_CARACTERES_CAPA = 20  # menos que esto se considera página sin capa de texto
DPI_OCR = 300
ANCHO_PORTADA = 500
FILTROS_COPIADOS = ("iglesia", "tipo", "anioDesde", "anioHasta")


def contar_paginas(pdf: Path) -> int:
    """Abre el PDF y devuelve el número de páginas. Lanza error si no abre o está vacío."""
    with pymupdf.open(pdf) as doc:
        if doc.needs_pass:
            raise ValueError("el PDF está protegido con contraseña")
        if doc.page_count == 0:
            raise ValueError("el PDF no tiene páginas")
        return doc.page_count


def extraer_texto(pdf: Path, carpeta: Path, libro: dict, forzar_ocr: bool = False) -> Path:
    """Escribe paginas.jsonl con una línea por página y devuelve su ruta."""
    idioma = libro["idioma"]
    campo_texto = CAMPO_TEXTO_POR_IDIOMA[idioma]
    salida = carpeta / "paginas.jsonl"
    meta_ruta = carpeta / "meta.json"
    carpeta.mkdir(parents=True, exist_ok=True)

    meta ={"md5": md5_archivo(pdf), "idioma": idioma, "forzarOcr": forzar_ocr}
    hechas = 0
    if salida.exists() and meta_ruta.exists() and json.loads(meta_ruta.read_text()) == meta:
        hechas = _paginas_validas(salida)
    else:
        salida.unlink(missing_ok=True)
    meta_ruta.write_text(json.dumps(meta))

    with pymupdf.open(pdf) as doc, salida.open("a", encoding="utf-8") as f:
        total = doc.page_count
        if hechas:
            log.info("%s: retomando en la página %d de %d", libro["id"], hechas + 1, total)
        for i in range(hechas, total):
            numero = i + 1
            texto, ocr = _texto_pagina(doc[i], idioma, forzar_ocr)
            pagina = {
                "id": f"{libro['id']}-p{numero:04d}",
                "bookId": libro["id"],
                "numero": numero,
                "idioma": idioma,
                campo_texto: texto,
                **{k: libro.get(k) for k in FILTROS_COPIADOS},
                "ocr": ocr,
            }
            f.write(json.dumps(pagina, ensure_ascii=False) + "\n")
            f.flush()
            if numero % 25 == 0 or numero == total:
                log.info("%s: %d/%d páginas", libro["id"], numero, total)
    return salida


def leer_paginas(jsonl: Path) -> list[dict]:
    with jsonl.open(encoding="utf-8") as f:
        return [json.loads(linea) for linea in f if linea.strip()]


def generar_portada(pdf: Path, destino: Path) -> Path:
    """Miniatura JPEG de la página 1, de ANCHO_PORTADA px de ancho."""
    with pymupdf.open(pdf) as doc:
        pagina = doc[0]
        zoom = ANCHO_PORTADA / pagina.rect.width
        pix = pagina.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        pix.save(destino, jpg_quality=85)
    return destino


def _paginas_validas(jsonl: Path) -> int:
    """Cuenta las líneas completas y recorta una última línea a medio escribir."""
    lineas = jsonl.read_text(encoding="utf-8").splitlines(keepends=True)
    validas = []
    for linea in lineas:
        try:
            json.loads(linea)
        except json.JSONDecodeError:
            break
        if not linea.endswith("\n"):
            break
        validas.append(linea)
    if len(validas) != len(lineas):
        jsonl.write_text("".join(validas), encoding="utf-8")
    return len(validas)


def _texto_pagina(pagina: "pymupdf.Page", idioma: str, forzar_ocr: bool) -> tuple[str, dict]:
    if not forzar_ocr:
        texto = pagina.get_text("text").strip()
        if sum(not c.isspace() for c in texto) >= MIN_CARACTERES_CAPA:
            return texto, {"motor": "pdf-texto", "idioma": None, "confianza": None}
    return _ocr_tesseract(pagina, TESSERACT_POR_IDIOMA[idioma])


def _ocr_tesseract(pagina: "pymupdf.Page", lang: str) -> tuple[str, dict]:
    import pytesseract
    from PIL import Image

    pix = pagina.get_pixmap(dpi=DPI_OCR, colorspace=pymupdf.csGRAY, alpha=False)
    imagen = Image.open(io.BytesIO(pix.tobytes("png")))
    datos = pytesseract.image_to_data(imagen, lang=lang, output_type=pytesseract.Output.DICT)

    # Rearma el texto por párrafos y líneas, y promedia la confianza de las palabras
    lineas: dict[tuple, list[str]] = {}
    confianzas = []
    for j, palabra in enumerate(datos["text"]):
        conf = float(datos["conf"][j])
        if conf < 0 or not palabra.strip():
            continue
        clave = (datos["block_num"][j], datos["par_num"][j], datos["line_num"][j])
        lineas.setdefault(clave, []).append(palabra)
        confianzas.append(conf)
    partes, parrafo_anterior = [], None
    for (bloque, parrafo, _), palabras in lineas.items():
        if parrafo_anterior is not None and (bloque, parrafo) != parrafo_anterior:
            partes.append("")
        partes.append(" ".join(palabras))
        parrafo_anterior = (bloque, parrafo)
    confianza = round(sum(confianzas) / len(confianzas) / 100, 3) if confianzas else None
    return "\n".join(partes), {"motor": "tesseract", "idioma": lang, "confianza": confianza}
