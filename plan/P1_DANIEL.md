# Cola de trabajo P1 · Daniel

Asignación inicial intercambiable; conservar IDs. Leer [plan maestro](00_PLAN_MAESTRO.md), [guía del agente](../AGENTS.md) y contrato antes de implementar. El otro integrante revisa cada cierre.

24 tareas; estimación inicial agregada: **61 sesiones de 2–4 horas** (122–244 horas-persona). Es una previsión de trabajo, no plazo calendario ni compromiso; incluye implementación/pruebas de cada tarea y debe recalibrarse en E00. Revisiones cruzadas y bloqueos pueden agregar tiempo.

| Orden | ID / trabajo detallado | Dependencia interna directa | Sesiones |
|---|---|---|---|
| 01 | [E00-P1-01 · Alinear alcance final y políticas institucionales](entregas/E00_base_y_contratos/01_P1.md#e00-p1-01) | Puerta de fase | 1 |
| 02 | [E00-P1-02 · Corregir el archivo de historiales en PostgreSQL](entregas/E00_base_y_contratos/01_P1.md#e00-p1-02) | E00-P1-01 | 3 |
| 03 | [E00-P1-03 · Definir API y puertos comunes versionados](entregas/E00_base_y_contratos/01_P1.md#e00-p1-03) | E00-P1-01, E00-P2-02 | 2 |
| 04 | [E01-P1-01 · Crear esqueleto backend, composición y contratos de ejecución](entregas/E01_fundacion_backend/01_P1.md#e01-p1-01) | Puerta de fase | 2 |
| 05 | [E01-P1-02 · Implementar valores, políticas y puertos del núcleo](entregas/E01_fundacion_backend/01_P1.md#e01-p1-02) | E01-P1-01 | 2 |
| 06 | [E01-P1-03 · Autenticar, autorizar y enrutar por institución](entregas/E01_fundacion_backend/01_P1.md#e01-p1-03) | E01-P1-02, E01-P2-01, E01-P2-02 | 3 |
| 07 | [E02-P1-01 · Crear casos comunes de pacientes e identidad](entregas/E02_pacientes_historial/01_P1.md#e02-p1-01) | Puerta de fase | 2 |
| 08 | [E02-P1-02 · Persistir pacientes en PostgreSQL y MySQL](entregas/E02_pacientes_historial/01_P1.md#e02-p1-02) | E02-P1-01 | 3 |
| 09 | [E02-P1-03 · Integrar alta, edición y expediente en React](entregas/E02_pacientes_historial/01_P1.md#e02-p1-03) | E02-P1-02, E02-P2-01, E02-P2-02, E02-P2-03 | 2 |
| 10 | [E03-P1-01 · Implementar atención clínica común y comando compuesto](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-01) | Puerta de fase | 3 |
| 11 | [E03-P1-02 · Implementar atención clínica en ambos adaptadores SQL](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-02) | E03-P1-01 | 3 |
| 12 | [E03-P1-03 · Implementar archivo, finalización y corrección histórica](entregas/E03_nucleo_clinico/01_P1.md#e03-p1-03) | E03-P1-02, E03-P2-01, E03-P2-02 | 3 |
| 13 | [E04-P1-01 · Completar agenda y atención odontológica](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-01) | Puerta de fase | 2 |
| 14 | [E04-P1-02 · Hospitalizaciones y ocupación de camas](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-02) | Puerta de fase | 3 |
| 15 | [E04-P1-03 · Exámenes, procedimientos y coberturas hospitalarias](entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-03) | E04-P1-02 | 3 |
| 16 | [E05-P1-01 · Catálogos, órdenes y trazabilidad de muestras](entregas/E05_laboratorio/01_P1.md#e05-p1-01) | Puerta de fase | 3 |
| 17 | [E05-P1-02 · Generar informes inmutables y descarga autorizada](entregas/E05_laboratorio/01_P1.md#e05-p1-02) | E05-P2-01 | 3 |
| 18 | [E05-P1-03 · Facturación, pagos y reversiones con saldo consistente](entregas/E05_laboratorio/01_P1.md#e05-p1-03) | E05-P1-01 | 3 |
| 19 | [E06-P1-01 · Revisar autorización y recuperar fallos de identidad](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-01) | Puerta de fase | 3 |
| 20 | [E06-P1-02 · Demostrar equivalencia, atomicidad y concurrencia en cuatro motores](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-02) | E06-P1-01, E06-P2-01, E06-P2-02 | 3 |
| 21 | [E06-P1-03 · Instalación reproducible, respaldo y restauración](entregas/E06_integracion_auditoria/01_P1.md#e06-p1-03) | Puerta de fase | 3 |
| 22 | [E07-P1-01 · Redactar comparativo final y modelos corregidos](entregas/E07_entrega_final/01_P1.md#e07-p1-01) | Puerta de fase | 2 |
| 23 | [E07-P1-02 · Preparar paquete instalable desde cero](entregas/E07_entrega_final/01_P1.md#e07-p1-02) | E07-P1-01, E07-P2-01, E07-P2-02 | 2 |
| 24 | [E07-P1-03 · Ensayar defensa y demostración final con ambos integrantes](entregas/E07_entrega_final/01_P1.md#e07-p1-03) | E07-P1-02 | 2 |

Todos los estados iniciales son PENDIENTE. Consultar y actualizar [tablero](06_TABLERO.md), no duplicar estados aquí. La puerta de fase previa sigue aplicando aunque la columna no enumere sus seis tareas.
