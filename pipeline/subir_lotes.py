"""Sube los libros de por-subir/ a Azure, extrae el texto y lo guarda en Cosmos.

Flujo completo en documents/pipeline.md. Resumen por libro:
  1-2. Valida el nombre y la fila de la hoja de registro
  3.   Compara el MD5 de Drive con el del blob (duplicados y conflictos)
  4.   Descarga a la carpeta de trabajo y valida el PDF
  5.   Sube a libros-escaneados sin sobrescribir
  6.   Crea o actualiza el libro en Cosmos `libros` (estado `subido`)
  7.   Mueve el archivo a subidos/ y marca `subido` en la hoja
  8-12. procesar_libro.py: texto, portada, páginas y estado `procesado`

Ejemplos:
    python subir_lotes.py --dry-run
    python subir_lotes.py --solo LIB-0001
    python subir_lotes.py --limit 20 --workers 8
"""

import argparse
import csv
import logging
import re
from concurrent.futures import ProcessPoolExecutor, as_completed
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import config
import extraer
import google_api
import procesar_libro
from azure_api import Azure, ConflictoBlob, InfoBlob, md5_archivo

log = logging.getLogger("subir_lotes")

PATRON_NOMBRE = re.compile(r"^LIB-\d{4}\.pdf$")


@dataclass
class Resultado:
    archivo: str
    id: str = ""
    resultado: str = ""  # procesado, subido, ya existente, conflicto, rechazado, error (o "se ..." en dry-run)
    motivo: str = ""
    advertencias: list[str] = field(default_factory=list)
    paginas: int = 0
    motores: str = ""
    pasa_a_texto: bool = False


class Lote:
    def __init__(self, cfg: config.Config, args: argparse.Namespace):
        self.cfg = cfg
        self.args = args

        # 0. Conexiones: si alguna falla, se detiene antes de tocar nada
        log.info("Conectando a Google y a Azure")
        creds = google_api.credenciales(cfg)
        self.drive = google_api.Drive(creds)
        self.hoja = google_api.Hoja(creds, cfg.hoja_id, cfg.hoja_pestana)
        self.azure = Azure(cfg)

        self.archivos = self.drive.listar(cfg.carpeta_por_subir)
        self.filas = self.hoja.leer()
        self.blobs = self.azure.listar_pdfs()
        self.estados = self.azure.estados_libros()
        self.repetidos = {n for n, c in Counter(a.nombre for a in self.archivos).items() if c > 1}
        log.info(
            "por-subir/: %d archivos · hoja: %d filas · blobs PDF: %d · libros en Cosmos: %d",
            len(self.archivos), len(self.filas), len(self.blobs), len(self.estados),
        )

    def candidatos(self) -> list[google_api.ArchivoDrive]:
        archivos = self.archivos
        if self.args.solo:
            solo = {f"{i.strip()}.pdf" for i in self.args.solo.split(",")}
            archivos = [a for a in archivos if a.nombre in solo]
        if self.args.limit:
            archivos = archivos[: self.args.limit]
        return archivos

    def preparar(self, archivo: google_api.ArchivoDrive) -> Resultado:
        """Pasos 1 a 7 para un archivo. Nunca lanza: los errores quedan en el resultado."""
        r = Resultado(archivo=archivo.nombre)

        # 1. Nombre
        if not PATRON_NOMBRE.match(archivo.nombre):
            return self._fin(r, "rechazado", "el nombre no cumple LIB-0000.pdf")
        r.id = archivo.nombre.removesuffix(".pdf")
        if archivo.nombre in self.repetidos:
            return self._fin(r, "conflicto", "hay más de un archivo con este nombre en por-subir/")

        # 2. Fila de la hoja
        fila = self.filas.get(r.id)
        if fila is None:
            return self._fin(r, "rechazado", "el ID no está en la hoja de registro")
        if fila.get("Estado") not in config.ESTADOS_HOJA_SUBIBLES:
            return self._fin(r, "rechazado", f"estado '{fila.get('Estado')}' en la hoja (debe ser escaneado)")
        faltan = [c for c in ("Título", "Iglesia", "Tipo", "Idioma") if not fila.get(c)]
        if faltan:
            return self._fin(r, "rechazado", f"faltan datos en la hoja: {', '.join(faltan)}")
        if fila.get("Idioma") not in config.IDIOMAS_HOJA:
            return self._fin(r, "rechazado", f"idioma '{fila.get('Idioma')}' no válido")

        # 3. Duplicados: MD5 de Drive contra el del blob
        if not archivo.md5:
            return self._fin(r, "rechazado", "Drive no da el MD5 del archivo (¿no es un PDF?)")
        blob: InfoBlob | None = self.blobs.get(archivo.nombre)
        estado_cosmos = self.estados.get(r.id)
        subir = blob is None
        if blob is not None:
            if blob.md5 != archivo.md5:
                motivo = "el blob existe sin MD5" if blob.md5 is None else "el blob existe con otro contenido (MD5 distinto)"
                return self._fin(r, "conflicto", motivo)
            if estado_cosmos == "procesado":
                if self.args.dry_run:
                    return self._fin(r, "se movería (ya existente)")
                try:
                    self.drive.mover(archivo.id, self.cfg.carpeta_por_subir, self.cfg.carpeta_subidos)
                except Exception as e:
                    return self._fin(r, "error", f"no se pudo mover a subidos/: {e}")
                return self._fin(r, "ya existente", "ya estaba en Blob y procesado; se movió a subidos/")
            r.advertencias.append("ya estaba en Blob sin procesar: se retoma")

        if self.args.dry_run:
            return self._fin(r, "se subiría" if subir else "se retomaría")

        try:
            # 4. Descargar y validar
            carpeta = self.cfg.dir_trabajo / r.id
            pdf = carpeta / archivo.nombre
            if not (pdf.exists() and md5_archivo(pdf) == archivo.md5):
                log.info("%s: descargando de Drive", r.id)
                self.drive.descargar(archivo.id, pdf)
                if md5_archivo(pdf) != archivo.md5:
                    return self._fin(r, "error", "el MD5 descargado no coincide con el de Drive")
            try:
                r.paginas = extraer.contar_paginas(pdf)
            except Exception as e:
                return self._fin(r, "rechazado", f"el PDF no es válido: {e}")
            paginas_hoja = fila.get("Páginas").replace(",", "").replace(".", "")
            if paginas_hoja.isdigit() and int(paginas_hoja) != r.paginas:
                r.advertencias.append(f"la hoja dice {paginas_hoja} páginas y el PDF tiene {r.paginas}")

            # 5. Subir sin sobrescribir
            if subir:
                log.info("%s: subiendo a %s", r.id, self.cfg.contenedor_pdf)
                self.azure.subir_pdf(pdf, archivo.nombre, archivo.md5)

            # 6. Registro del libro en Cosmos, antes de mover: si falla, el archivo
            #    sigue en por-subir/ y la siguiente corrida lo retoma
            self.azure.guardar_libro(self._documento_libro(r.id, fila, archivo.nombre))

            # 7. Mover a subidos/
            self.drive.mover(archivo.id, self.cfg.carpeta_por_subir, self.cfg.carpeta_subidos)
        except ConflictoBlob as e:
            return self._fin(r, "conflicto", str(e))
        except Exception as e:
            return self._fin(r, "error", f"{type(e).__name__}: {e}"[:500])

        # Marcar en la hoja. Si falla, el libro ya está a salvo: solo se advierte
        if fila.get("Estado") == "escaneado":
            try:
                self.hoja.escribir(fila, "Estado", "subido")
            except Exception as e:
                r.advertencias.append(f"no se pudo marcar `subido` en la hoja: {e}")

        r.pasa_a_texto = True
        return self._fin(r, "subido")

    def _documento_libro(self, libro_id: str, fila: google_api.FilaLibro, nombre_pdf: str) -> dict:
        # Conserva los campos que no vienen de la hoja (capitulos, descripcion, portada...)
        doc = self.azure.leer_libro(libro_id) or {"id": libro_id, "capitulos": []}
        doc.update(
            titulo=fila.get("Título"),
            autor=fila.get("Autor") or None,
            iglesia=fila.get("Iglesia"),
            tipo=fila.get("Tipo"),
            idioma=config.IDIOMAS_HOJA[fila.get("Idioma")],
            fecha=fila.get("Fecha") or None,
            anioDesde=_entero(fila.get("Año desde")),
            anioHasta=_entero(fila.get("Año hasta")),
            pdf=nombre_pdf,
            estado="subido",
        )
        doc.pop("error", None)
        return doc

    @staticmethod
    def _fin(r: Resultado, resultado: str, motivo: str = "") -> Resultado:
        r.resultado, r.motivo = resultado, motivo
        nivel = logging.WARNING if resultado in ("rechazado", "conflicto", "error") else logging.INFO
        log.log(nivel, "%s: %s%s", r.id or r.archivo, resultado, f" ({motivo})" if motivo else "")
        for a in r.advertencias:
            log.warning("%s: advertencia: %s", r.id, a)
        return r


def extraer_textos(resultados: list[Resultado], cfg: config.Config, args) -> None:
    """Pasos 8 a 12, en paralelo: un libro por proceso."""
    pendientes = {r.id: r for r in resultados if r.pasa_a_texto}
    if not pendientes:
        return
    log.info("Extrayendo el texto de %d libros con %d procesos", len(pendientes), args.workers)
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futuros = {
            pool.submit(procesar_libro.procesar_en_proceso, libro_id, cfg, args.forzar_ocr): libro_id
            for libro_id in pendientes
        }
        for futuro in as_completed(futuros):
            r = pendientes[futuros[futuro]]
            try:
                t = futuro.result()
            except Exception as e:
                r.resultado, r.motivo = "error", f"{type(e).__name__}: {e}"[:500]
                continue
            if t.ok:
                r.resultado, r.paginas = "procesado", t.paginas
                r.motores = ", ".join(f"{m}: {n}" for m, n in t.motores.items())
            else:
                r.resultado, r.motivo = "error", t.motivo


def guardar_reporte(resultados: list[Resultado], cfg: config.Config, dry_run: bool) -> Path:
    cfg.dir_reportes.mkdir(parents=True, exist_ok=True)
    sufijo = "_dry-run" if dry_run else ""
    ruta = cfg.dir_reportes / f"{datetime.now():%Y-%m-%d_%H%M%S}{sufijo}.csv"
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["archivo", "id", "resultado", "motivo", "advertencias", "paginas", "extraccion"])
        for r in resultados:
            w.writerow([r.archivo, r.id, r.resultado, r.motivo, " | ".join(r.advertencias), r.paginas or "", r.motores])
    return ruta


def _entero(valor: str) -> int | None:
    valor = (valor or "").strip()
    return int(valor) if valor.isdigit() else None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="valida y muestra qué haría, sin cambiar nada")
    parser.add_argument("--limit", type=int, help="procesa como máximo N archivos")
    parser.add_argument("--solo", help="solo estos IDs, separados por coma: LIB-0001,LIB-0002")
    parser.add_argument("--workers", type=int, default=4, help="libros en paralelo al extraer el texto (4)")
    parser.add_argument("--forzar-ocr", action="store_true", help="pasa todas las páginas por Tesseract")
    parser.add_argument("--sin-texto", action="store_true", help="solo sube y registra; el texto después con procesar_libro.py")
    args = parser.parse_args()
    procesar_libro.configurar_log()

    cfg = config.cargar()
    if not cfg.carpeta_por_subir or not cfg.carpeta_subidos:
        raise SystemExit("Faltan carpeta_por_subir y carpeta_subidos en config.toml")
    if args.dry_run:
        log.info("Modo dry-run: no se descarga, sube, mueve ni escribe nada")

    lote = Lote(cfg, args)
    resultados = [lote.preparar(a) for a in lote.candidatos()]
    if not args.dry_run and not args.sin_texto:
        extraer_textos(resultados, cfg, args)

    ruta = guardar_reporte(resultados, cfg, args.dry_run)
    conteo = Counter(r.resultado for r in resultados)
    print("\nResumen: " + (", ".join(f"{k}: {v}" for k, v in sorted(conteo.items())) or "no había archivos"))
    print(f"Reporte: {ruta}")
    raise SystemExit(1 if conteo["error"] else 0)


if __name__ == "__main__":
    main()
