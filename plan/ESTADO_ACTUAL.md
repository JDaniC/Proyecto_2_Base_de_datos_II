# Estado para continuar en un chat nuevo

Corte observado: 25/10/2026, America/Guatemala. Es un índice de orientación; verificar con código, Git y PR antes de actuar. Los estados de tareas y ejecutores viven únicamente en [el tablero](06_TABLERO.md).

## Producto y entradas

- Entrega final objetivo: 05/11/2026; [cronograma](09_CRONOGRAMA_HASTA_05_NOV.md). La estimación original excede la capacidad supuesta; recalibrar en E00.
- Cuatro modelos y herramientas en Database/. Hospital→PostgreSQL, dental→MySQL, laboratorio→MongoDB y pediatría→Firestore.
- Frontend/ React implementado con simuladores. Backend/ incluye contrato común OpenAPI, firmas de diseño, fixtures y validador documental de E00-P1-03; todavía no contiene servidor/casos de uso/adaptadores implementados. No afirmar persistencia UI→API real. Reutilizar UI; no reconstruirla desde cero.
- [Alcance portable](01_ALCANCE_Y_DECISIONES.md), [arquitectura](02_ARQUITECTURA_HEXAGONAL.md), [contratos](03_CONTRATOS_Y_FLUJOS.md) y [plan maestro](00_PLAN_MAESTRO.md).

## Estado técnico que no debe confundirse con pruebas actuales

- Auditoría Database del 24/10: 234 comprobaciones, 232 PASS y dos FAIL asociados al archivo PG A-F01. Ver Database/auditoria/2026-10-24/informe.md; corrección planificada en E00-P1-02.
- MySQL/emulador Firestore tuvieron bloqueos en esa auditoría. Una primera ejecución Docker en GitHub mostró timeout de salud MySQL/MongoDB. No se corrigió al retirar esas ejecuciones del workflow de integración; E00-P2-01 debe validar los entornos.
- Compilación frontend y 35 pruebas de producto pasaron en la consolidación anterior. No representan la suite histórica completa ni integración con cuatro motores. Ejecutar pruebas nuevas ante cambios.

## Git e integración observados al preparar estas reglas

- Ramas permanentes deseadas: main y develop. Ramas de tarea temporales.
- La consolidación de frontend/documentación PR #2 fue fusionada en GitHub el 24/10/2026 a las 17:46 (America/Guatemala), commit `92ba015`. Fuente: https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/2. develop remoto ya contiene esa consolidación; obtener su versión actual antes de iniciar tareas.
- La continuidad/cola compartida del PR #3 ya está fusionada en develop, commit `997c3ec`. La rama temporal se eliminó. Las modificaciones de limpieza se integran después, mediante su propio PR de mantenimiento; verificar referencias actuales.
- Las ramas Frontend, Backend y codex/flujo-github-tareas ya se retiraron del remoto. Las nuevas ramas de trabajo se eliminan tras su integración para terminar cada flujo con main y develop.
- GitHub exige PR y contrato-pr; cero aprobaciones humanas obligatorias. Codex es el revisor automático elegido. El propietario confirmó activar su configuración; en el último corte no había respuesta del bot en PR #2. Verificar el estado actual antes de marcar revisión completa.
- El check contrato-pr acredita el contrato; revision-codex acredita el resultado nativo del bot para el SHA actual. Ninguno sustituye las pruebas funcionales de la tarea.

## Próxima entrada de trabajo

La consolidación inicial ya se integró en el corte indicado; verificar referencias remotas y obtener la versión actual de develop. No iniciar desde una copia anterior a esos cambios.

La tarea E00-P1-01 ya tiene cambios documentales integrados por PR #4, commit 3dffdd8. Su cierre y la revisión se verifican en el tablero y seguimiento; no marcarla HECHA desde la limpieza. Las siguientes candidatas dependen de ese estado real: ejecutar el helper en lugar de repetir el listado inicial. Los seguimientos existentes son de tareas efectivamente iniciadas.

Leer [continuidad y cola compartida](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md); ejecutar `python3 scripts/github/cola.py`. Daniel y David pueden tomar cualquier lote. Para una tarea activa leer también `plan/seguimiento/ID.md` y su rama/PR.

## Cómo mantener este archivo

Actualizar al cambiar producto, bloqueos generales o estado de integración. Registrar fecha, fuente/commit/PR observado y próxima entrada. Evitar copiar estados por tarea o logs completos. No incorporar secretos ni depender de mensajes privados del chat.

## Documentación de interfaz

La guía única es Frontend/README.md. Las especificaciones de creación y el informe narrativo de UI se retiraron; sus resultados históricos se resumen allí y la evidencia JSON se conserva en plan/evidencias/UI/2026-10-23/. Los tokens y componentes reales son la referencia de diseño vigente.

Corte E00 (25/10/2026, America/Guatemala): las seis tareas E00 están HECHA; sus PR #4, #7, #11, #13, #15 y #17 están integrados en `develop` (`3196160`). La demostración y auditoría funcional están en `plan/evidencias/E00/CIERRE.md` y `plan/evidencias/E00/auditoria-cierre-2026-10-25/`. El cierre de fase se integró mediante PR #20 (`566e75c`), con `contrato-pr` y `revision-codex` success; la sincronización del tablero está en este PR documental.

Corte E01 (26/10/2026, America/Guatemala): las seis tareas E01 están HECHA (E01-P1-01, E01-P1-02, E01-P1-03, E01-P2-01, E01-P2-02 y E01-P2-03); sus PR correspondientes están integrados en `develop` (`465cb89`). Backend fundacional operativo con 4 motores (PostgreSQL, MySQL, MongoDB replica set, Firestore emulator), 165 pruebas backend PASS, y frontend conectado mediante cliente HTTP con transporte real y gestión de sesión (66 pruebas frontend PASS). El cierre formal de fase se integró mediante PR #39, habilitando la puerta de entrada a la fase E02.
