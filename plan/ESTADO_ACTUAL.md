# Estado para continuar en un chat nuevo

Corte observado: 24/10/2026, America/Guatemala. Es un índice de orientación; verificar con código, Git y PR antes de actuar. Los estados de tareas y ejecutores viven únicamente en [el tablero](06_TABLERO.md).

## Producto y entradas

- Entrega final objetivo: 05/11/2026; [cronograma](09_CRONOGRAMA_HASTA_05_NOV.md). La estimación original excede la capacidad supuesta; recalibrar en E00.
- Cuatro modelos y herramientas en Database/. Hospital→PostgreSQL, dental→MySQL, laboratorio→MongoDB y pediatría→Firestore.
- Frontend/ React implementado con simuladores. Backend/ solo contiene .gitkeep: no afirmar persistencia UI→API real. Reutilizar UI; no reconstruirla desde cero.
- [Alcance portable](01_ALCANCE_Y_DECISIONES.md), [arquitectura](02_ARQUITECTURA_HEXAGONAL.md), [contratos](03_CONTRATOS_Y_FLUJOS.md) y [plan maestro](00_PLAN_MAESTRO.md).

## Estado técnico que no debe confundirse con pruebas actuales

- Auditoría Database del 24/10: 234 comprobaciones, 232 PASS y dos FAIL asociados al archivo PG A-F01. Ver Database/auditoria/2026-10-24/informe.md; corrección planificada en E00-P1-02.
- MySQL/emulador Firestore tuvieron bloqueos en esa auditoría. Una primera ejecución Docker en GitHub mostró timeout de salud MySQL/MongoDB. No se corrigió al retirar esas ejecuciones del workflow de integración; E00-P2-01 debe validar los entornos.
- Compilación frontend y 35 pruebas de producto pasaron en la consolidación anterior. No representan la suite histórica completa ni integración con cuatro motores. Ejecutar pruebas nuevas ante cambios.

## Git e integración observados al preparar estas reglas

- Ramas permanentes deseadas: main y develop. Ramas de tarea temporales.
- La consolidación de frontend/documentación está en PR #2: https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/2. En el corte estaba OPEN; develop local contenía los cambios y origin/develop aún no. No asumir que el PR se fusionó desde entonces; consultar GitHub.
- PR #1 quedó sustituido/cerrado. Backend y codex/flujo-github-tareas se retiraron de remoto; Frontend se conserva mientras el PR #2 esté abierto para evitar perder la fuente de integración.
- GitHub exige PR y contrato-pr; cero aprobaciones humanas obligatorias. Codex es el revisor automático elegido. El propietario confirmó activar su configuración; en el último corte no había respuesta del bot en PR #2. Verificar el estado actual antes de marcar revisión completa.
- El check contrato-pr no fuerza técnicamente que Codex haya terminado ni acredita funcionalidad. No asumir que verde significa revisión automática aprobada.

## Próxima entrada de trabajo

Primero verificar si la consolidación inicial se integró. Hasta entonces no crear trabajo dependiente suponiendo que origin/develop contiene el frontend/plan. Puede prepararse trabajo independiente con estado real documentado.

Las 48 tareas siguen sin ejecución acreditada en el tablero al preparar este corte. En una base consolidada, el helper debe mostrar inicialmente E00-P1-01 y E00-P2-01 disponibles, sujetas a revisar reservas remotas. No hay seguimientos de implementación creados artificialmente.

Leer [continuidad y cola compartida](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md); ejecutar `python3 scripts/github/cola.py`. Daniel y David pueden tomar cualquier lote. Para una tarea activa leer también `plan/seguimiento/ID.md` y su rama/PR.

## Cómo mantener este archivo

Actualizar al cambiar producto, bloqueos generales o estado de integración. Registrar fecha, fuente/commit/PR observado y próxima entrada. Evitar copiar estados por tarea o logs completos. No incorporar secretos ni depender de mensajes privados del chat.
