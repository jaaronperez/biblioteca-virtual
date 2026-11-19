"""Consultas a Cosmos DB. Todos los valores del usuario viajan como parámetros."""

from azure.cosmos.exceptions import CosmosResourceNotFoundError

from .db import Conexion

CAMPOS_LIBRO = (
    "c.id, c.titulo, c.autor, c.iglesia, c.tipo, c.idioma, c.fecha, "
    "c.anioDesde, c.anioHasta, c.numPaginas, c.portada, c.estado"
)
CAMPO_TEXTO = {"es": "textoEs", "en": "textoEn"}
MAX_TERMINOS = 5
LARGO_FRAGMENTO = 240


class Filtros:
    """Arma el WHERE y la lista de parámetros de una consulta."""

    def __init__(self) -> None:
        self.condiciones: list[str] = []
        self.parametros: list[dict] = []

    def agregar(self, condicion: str, **valores) -> None:
        self.condiciones.append(condicion)
        self.parametros += [{"name": f"@{k}", "value": v} for k, v in valores.items()]

    def metadatos(self, iglesia, tipo, anio_desde, anio_hasta) -> None:
        """Filtros que existen igual en `libros` y en `paginas`."""
        if iglesia:
            self.agregar("c.iglesia = @iglesia", iglesia=iglesia)
        if tipo:
            self.agregar("c.tipo = @tipo", tipo=tipo)
        # Rango de años: el libro entra si su periodo se cruza con el pedido
        if anio_desde is not None:
            self.agregar("c.anioHasta >= @anioDesde", anioDesde=anio_desde)
        if anio_hasta is not None:
            self.agregar("c.anioDesde <= @anioHasta", anioHasta=anio_hasta)

    @property
    def where(self) -> str:
        return ("WHERE " + " AND ".join(self.condiciones)) if self.condiciones else ""


def _con_portada(con: Conexion, libro: dict) -> dict:
    libro["portadaUrl"] = con.url_portada(libro.get("portada"))
    return libro


def buscar_libros(
    *, iglesia, tipo, idioma, anio_desde, anio_hasta, titulo, autor, capitulo, estado, limite, desde
) -> tuple[list[dict], bool]:
    """Búsqueda por metadatos en `libros`, con filtros combinables.

    Devuelve la página pedida y si quedan más resultados después de ella.
    """
    con = Conexion()
    f = Filtros()
    f.metadatos(iglesia, tipo, anio_desde, anio_hasta)
    if idioma:
        f.agregar("c.idioma = @idioma", idioma=idioma)
    if estado:
        f.agregar("c.estado = @estado", estado=estado)
    if titulo:
        f.agregar("CONTAINS(c.titulo, @titulo, true)", titulo=titulo)
    if autor:
        f.agregar("CONTAINS(c.autor, @autor, true)", autor=autor)
    if capitulo:
        # Equivalente a $elemMatch de MongoDB: el libro entra si ALGÚN elemento del
        # arreglo `capitulos` cumple la condición.
        f.agregar(
            "EXISTS(SELECT VALUE cap FROM cap IN c.capitulos WHERE CONTAINS(cap.titulo, @capitulo, true))",
            capitulo=capitulo,
        )
    # Se pide una fila de más para saber si hay otra página, sin contar todo el resultado
    f.parametros += [{"name": "@desde", "value": desde}, {"name": "@limite", "value": limite + 1}]
    consulta = f"SELECT {CAMPOS_LIBRO} FROM c {f.where} ORDER BY c.id OFFSET @desde LIMIT @limite"
    filas = list(con.libros.query_items(consulta, parameters=f.parametros, enable_cross_partition_query=True))
    return [_con_portada(con, libro) for libro in filas[:limite]], len(filas) > limite


def leer_libro(libro_id: str) -> dict | None:
    con = Conexion()
    try:
        doc = con.libros.read_item(libro_id, partition_key=libro_id)
    except CosmosResourceNotFoundError:
        return None
    return _con_portada(con, {k: v for k, v in doc.items() if not k.startswith("_")})


def leer_pagina(libro_id: str, numero: int) -> dict | None:
    con = Conexion()
    try:
        doc = con.paginas.read_item(f"{libro_id}-p{numero:04d}", partition_key=libro_id)
    except CosmosResourceNotFoundError:
        return None
    return {
        "bookId": doc["bookId"],
        "numero": doc["numero"],
        "idioma": doc.get("idioma"),
        "texto": doc.get("textoEs") or doc.get("textoEn") or "",
        "ocr": doc.get("ocr"),
    }


def buscar_texto(
    *, q, idioma, libro, iglesia, tipo, anio_desde, anio_hasta, limite, desde
) -> tuple[list[dict], bool]:
    """Búsqueda de texto completo en `paginas`, ordenada por relevancia (BM25).

    Devuelve la página pedida y si quedan más resultados después de ella.
    """
    con = Conexion()
    campo = f"c.{CAMPO_TEXTO[idioma]}"
    terminos = q.split()[:MAX_TERMINOS]
    nombres = [f"@t{i}" for i in range(len(terminos))]

    f = Filtros()
    f.agregar("c.idioma = @idioma", idioma=idioma)
    f.metadatos(iglesia, tipo, anio_desde, anio_hasta)
    # La página debe contener todos los términos (el índice busca por raíz de palabra)
    f.agregar(f"FullTextContainsAll({campo}, {', '.join(nombres)})")
    f.parametros += [{"name": n, "value": t} for n, t in zip(nombres, terminos)]
    # Una fila de más para saber si hay otra página
    f.parametros += [{"name": "@desde", "value": desde}, {"name": "@limite", "value": limite + 1}]

    consulta = (
        f"SELECT c.bookId, c.numero, {campo} AS texto FROM c {f.where} "
        f"ORDER BY RANK FullTextScore({campo}, {', '.join(nombres)}) OFFSET @desde LIMIT @limite"
    )
    # Con `libro` la consulta va a una sola partición; sin él, recorre todas
    opciones = {"partition_key": libro} if libro else {"enable_cross_partition_query": True}
    paginas = list(con.paginas.query_items(consulta, parameters=f.parametros, **opciones))

    hay_mas = len(paginas) > limite
    paginas = paginas[:limite]
    titulos = _titulos(con, {p["bookId"] for p in paginas})
    return [
        {
            "bookId": p["bookId"],
            "titulo": titulos.get(p["bookId"]),
            "numero": p["numero"],
            "fragmento": _fragmento(p.get("texto") or "", terminos),
        }
        for p in paginas
    ], hay_mas


def filtros_disponibles() -> dict:
    """Valores que existen hoy en `libros`, para armar los filtros del buscador."""
    con = Conexion()

    def distintos(campo: str) -> list:
        filas = con.libros.query_items(
            f"SELECT DISTINCT VALUE c.{campo} FROM c WHERE IS_DEFINED(c.{campo})",
            enable_cross_partition_query=True,
        )
        return sorted(v for v in filas if v)

    def extremo(funcion: str, campo: str) -> int | None:
        # Entre particiones, Cosmos solo acepta agregados de la forma VALUE <función>
        filas = list(
            con.libros.query_items(f"SELECT VALUE {funcion}(c.{campo}) FROM c", enable_cross_partition_query=True)
        )
        return filas[0] if filas and isinstance(filas[0], int) else None

    return {
        "iglesias": distintos("iglesia"),
        "tipos": distintos("tipo"),
        "idiomas": distintos("idioma"),
        "anioDesde": extremo("MIN", "anioDesde"),
        "anioHasta": extremo("MAX", "anioHasta"),
    }


def progreso_del_equipo() -> dict:
    """Avance de la digitalización por integrante, contado en `libros`.

    Cosmos solo tiene los libros que ya se subieron a Azure: cada uno cuenta para
    el integrante dueño del bloque de IDs donde cae.
    """
    con = Conexion()
    filas = con.libros.query_items(
        "SELECT c.id, c.estado, c.numPaginas FROM c", enable_cross_partition_query=True
    )
    equipo = [
        {
            "nombre": b.nombre,
            "desde": f"LIB-{b.desde:04d}",
            "hasta": f"LIB-{b.hasta:04d}",
            "meta": b.hasta - b.desde + 1,
            "subidos": 0,
            "procesados": 0,
            "conError": 0,
            "paginas": 0,
        }
        for b in con.cfg.equipo
    ]
    sin_bloque = 0
    for libro in filas:
        digitos = libro["id"].removeprefix("LIB-")
        numero = int(digitos) if digitos.isdigit() else -1
        dueno = next((e for e, b in zip(equipo, con.cfg.equipo) if b.desde <= numero <= b.hasta), None)
        if dueno is None:
            sin_bloque += 1
            continue
        dueno["subidos"] += 1
        dueno["paginas"] += libro.get("numPaginas") or 0
        if libro.get("estado") == "procesado":
            dueno["procesados"] += 1
        elif libro.get("estado") == "error":
            dueno["conError"] += 1
    claves = ("meta", "subidos", "procesados", "conError", "paginas")
    return {
        "total": {k: sum(e[k] for e in equipo) for k in claves},
        "equipo": equipo,
        "sinBloque": sin_bloque,
    }


def _titulos(con: Conexion, ids: set[str]) -> dict[str, str]:
    if not ids:
        return {}
    filas = con.libros.query_items(
        "SELECT c.id, c.titulo FROM c WHERE ARRAY_CONTAINS(@ids, c.id)",
        parameters=[{"name": "@ids", "value": sorted(ids)}],
        enable_cross_partition_query=True,
    )
    return {f["id"]: f.get("titulo") for f in filas}


def _fragmento(texto: str, terminos: list[str]) -> str:
    """Trozo del texto alrededor del primer término encontrado."""
    plano = " ".join(texto.split())
    minusculas = plano.casefold()
    posiciones = [p for p in (minusculas.find(t.casefold()) for t in terminos) if p >= 0]
    inicio = max(0, min(posiciones) - LARGO_FRAGMENTO // 3) if posiciones else 0
    trozo = plano[inicio : inicio + LARGO_FRAGMENTO]
    return ("…" if inicio > 0 else "") + trozo + ("…" if inicio + LARGO_FRAGMENTO < len(plano) else "")
