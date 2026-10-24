"""Contrato de títulos; no ejecuta texto procedente del PR."""
import json
import os
from pathlib import Path
import re
import subprocess


def validar(title, branch, base, paths, board):
    if base == "main":
        if branch != "develop" or not re.fullmatch(r"\[ENTREGA-E0[0-7]\] .+", title):
            raise ValueError("main recibe entregas desde develop: [ENTREGA-E00] descripción")
        return
    if title == "[INTEGRACION-INICIAL] Consolidar frontend y documentación" and branch == "Frontend":
        return  # Consolidación inicial autorizada; conserva el check y la política de revisión automática.
    if title.startswith("[CONFIG-GITHUB] "):
        if not paths or any(not (p.startswith((".github/", "scripts/github/", "plan/", ".agents/rules/")) or p in {"docs/FLUJO_GITHUB.md", "AGENTS.md", "README.md"}) for p in paths):
            raise ValueError("CONFIG-GITHUB solo permite configuración del flujo y guía de agentes")
        return
    if title.startswith("[PLAN] "):
        if not paths or any(not (p.startswith("plan/") or p in {"AGENTS.md", "Agente/AGENTS.md"}) for p in paths):
            raise ValueError("PLAN solo permite el plan y guías de agentes")
        return
    match = re.fullmatch(r"\[(E0[0-7]-P[12]-[0-9]{2})\] .+", title)
    if not match:
        raise ValueError("Título requerido: [E00-P1-01] descripción")
    task = match[1]
    if not re.search(r"(?<![A-Z0-9-])" + re.escape(task) + r"(?![A-Z0-9-])", board):
        raise ValueError("La tarea debe existir en plan/06_TABLERO.md; integrar primero el plan")
    if not branch.startswith("codex/" + task.lower() + "-"):
        raise ValueError("Rama requerida: codex/" + task.lower() + "-descripcion")


if __name__ == "__main__":
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    pr = event["pull_request"]
    paths = subprocess.check_output(["git", "diff", "--name-only", "-z", pr["base"]["sha"] + "..." + pr["head"]["sha"]]).decode().strip("\0").split("\0")
    board = Path("plan/06_TABLERO.md")
    validar(pr["title"], pr["head"]["ref"], pr["base"]["ref"], paths, board.read_text() if board.exists() else "")
    print("PASS: contrato del PR; el ejecutor verifica alcance y evidencia, con revisión automática de Codex")
