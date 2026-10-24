"""Consulta de solo lectura: disponibilidad local sin asignación personal de IDs."""
import argparse
import json
from pathlib import Path
import re

ID = re.compile(r"E\d{2}-P[12]-\d{2}")
ESTADOS = {"PENDIENTE", "EN_CURSO", "EN_REVISION", "HECHA", "BLOQUEADA"}
LIBRE = {"", "—", "-"}
ROOT = Path(__file__).resolve().parents[2]


def cargar(texto):
    tareas, cierres = {}, {}
    for linea in texto.splitlines():
        if not linea.startswith("|"):
            continue
        columnas = [c.strip() for c in linea.strip().strip("|").split("|")]
        coincidencia = re.match(r"\[(E\d{2}-P[12]-\d{2})\]", columnas[0])
        if coincidencia:
            if len(columnas) != 6:
                raise ValueError("Fila de tarea inválida; se esperan seis columnas")
            tarea = coincidencia[1]
            if tarea in tareas:
                raise ValueError(f"ID duplicado: {tarea}")
            if columnas[3] not in ESTADOS:
                raise ValueError(f"Estado inválido en {tarea}: {columnas[3]}")
            if columnas[1] != tarea.split("-")[1]:
                raise ValueError(f"Lote inconsistente en {tarea}")
            tareas[tarea] = dict(id=tarea, lote=columnas[1], ejecutor=columnas[2],
                                 estado=columnas[3], dependencias=ID.findall(columnas[4]),
                                 evidencia=columnas[5])
        elif re.fullmatch(r"E\d{2}", columnas[0]):
            if len(columnas) != 3 or columnas[1] not in ESTADOS:
                raise ValueError("Cierre de fase inválido")
            if columnas[0] in cierres:
                raise ValueError("Cierre de fase duplicado")
            cierres[columnas[0]] = columnas[1]
    if not tareas:
        raise ValueError("No se encontraron tareas en el tablero")
    for tarea in tareas.values():
        for dep in tarea["dependencias"]:
            if dep not in tareas:
                raise ValueError(f'Dependencia inexistente: {tarea["id"]} → {dep}')
            if dep[:3] > tarea["id"][:3]:
                raise ValueError("Dependencia hacia una fase posterior")
    visitadas, pila = set(), set()

    def recorrer(tarea):
        if tarea in pila:
            raise ValueError(f"Ciclo de dependencias: {tarea}")
        if tarea in visitadas:
            return
        pila.add(tarea)
        for dep in tareas[tarea]["dependencias"]:
            recorrer(dep)
        pila.remove(tarea)
        visitadas.add(tarea)

    for tarea in tareas:
        recorrer(tarea)
    return tareas, cierres


def evaluar(tareas, cierres):
    disponibles, otras = [], []
    for identificador, tarea in sorted(tareas.items()):
        causas = []
        if tarea["estado"] != "PENDIENTE":
            causas.append("estado " + tarea["estado"])
        if tarea["ejecutor"] not in LIBRE:
            causas.append("ejecutor registrado: " + tarea["ejecutor"])
        pendientes = [dep for dep in tarea["dependencias"] if tareas[dep]["estado"] != "HECHA"]
        if pendientes:
            causas.append("dependencias pendientes: " + ", ".join(pendientes))
        numero = int(identificador[1:3])
        if numero:
            anterior = f"E{numero - 1:02d}"
            previas = [t for t in tareas.values() if t["id"].startswith(anterior + "-")]
            if (not previas or any(t["estado"] != "HECHA" for t in previas)
                    or cierres.get(anterior) != "HECHA"):
                causas.append("puerta anterior pendiente: " + anterior)
        if causas:
            otras.append(dict(**tarea, causas=causas))
        else:
            disponibles.append(tarea)
    return dict(disponibles=disponibles, no_disponibles=otras,
                alcance="Tablero local; comprobar PR abiertos e integración remota antes de reservar. No modifica estados.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Salida estructurada para el agente")
    args = parser.parse_args()
    try:
        tareas, cierres = cargar((ROOT / "plan/06_TABLERO.md").read_text())
        if len(tareas) != 48 or set(cierres) != {f"E{n:02d}" for n in range(8)}:
            raise ValueError("Se esperan 48 tareas y ocho cierres en el plan vigente")
        for fase in cierres:
            esperadas = {f"{fase}-P{lote}-{n:02d}" for lote in (1, 2) for n in (1, 2, 3)}
            if {t for t in tareas if t.startswith(fase + "-")} != esperadas:
                raise ValueError(f"Inventario inválido en {fase}")
        resultado = evaluar(tareas, cierres)
    except (OSError, ValueError) as error:
        parser.exit(2, f"No se puede elegir tarea: {error}\n")
    if args.json:
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    else:
        print(resultado["alcance"])
        print("Disponibles para cualquiera de los dos:")
        for tarea in resultado["disponibles"]:
            print("- " + tarea["id"])
        if not resultado["disponibles"]:
            print("- Ninguna. Revisar tareas activas, reservas, dependencias y cierres.")
        activas = [t for t in tareas.values() if t["estado"] in {"EN_CURSO", "EN_REVISION", "BLOQUEADA"}]
        for tarea in activas:
            print(f'{tarea["id"]}: {tarea["estado"]}, ejecutor {tarea["ejecutor"]}; consultar seguimiento/PR.')


if __name__ == "__main__":
    main()
