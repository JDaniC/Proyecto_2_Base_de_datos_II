---
trigger: always_on
description: "Contexto persistente, cola compartida y continuidad del proyecto Bases de Datos II en cada chat."
---

# Entrada persistente del proyecto

Aplicar la solicitud humana vigente. Antes de proponer o ejecutar trabajo leer `AGENTS.md`, `plan/ESTADO_ACTUAL.md`, `plan/11_CONTINUIDAD_Y_COLA_COMPARTIDA.md` y `plan/06_TABLERO.md` desde la raíz del repositorio. Verificar el estado con Git, código y PR; las conversaciones anteriores no son la fuente de estado.

Daniel y David pueden ejecutar tareas de ambos lotes P1/P2. Esos códigos conservan IDs, no propiedad. Para ejecutar «la siguiente tarea», consultar `python3 scripts/github/cola.py`, dependencias y PR abiertos, reservar y seguir el protocolo hasta pruebas, PR, revisión automática e integración autorizada, o un bloqueo documentado con próxima acción. Nunca iniciar toda la planificación por abrir un chat.

Al retomar un ID leer su seguimiento `plan/seguimiento/ID.md`, rama y commits. Al detenerse escribir ese seguimiento mediante `plan/plantillas/SEGUIMIENTO_TAREA.md`; no inferir que otra persona abandonó su tarea ni inventar pruebas, revisiones o fusiones. La revisión humana es opcional; Codex es el revisor automático elegido.
