# Cola de trabajo P2 · Companero

Asignación inicial intercambiable; conservar IDs. Leer [plan maestro](00_PLAN_MAESTRO.md), [guía del agente](../AGENTS.md) y contrato antes de implementar. El otro integrante revisa cada cierre.

24 tareas; estimación inicial agregada: **62 sesiones de 2–4 horas** (124–248 horas-persona). Es una previsión de trabajo, no plazo calendario ni compromiso; incluye implementación/pruebas de cada tarea y debe recalibrarse en E00. Revisiones cruzadas y bloqueos pueden agregar tiempo.

| Orden | ID / trabajo detallado | Dependencia interna directa | Sesiones |
|---|---|---|---|
| 01 | [E00-P2-01 · Preparar cuatro entornos de ensayo y desbloquear auditorías](entregas/E00_base_y_contratos/02_P2.md#e00-p2-01) | Puerta de fase | 3 |
| 02 | [E00-P2-02 · Inventariar contratos reales del frontend y sus diferencias](entregas/E00_base_y_contratos/02_P2.md#e00-p2-02) | E00-P1-01 | 2 |
| 03 | [E00-P2-03 · Diseñar fixtures y arnés de aceptación compartido](entregas/E00_base_y_contratos/02_P2.md#e00-p2-03) | E00-P1-03, E00-P2-01 | 2 |
| 04 | [E01-P2-01 · Implementar conexiones y unidades de trabajo SQL](entregas/E01_fundacion_backend/02_P2.md#e01-p2-01) | E01-P1-02 | 3 |
| 05 | [E01-P2-02 · Implementar unidades de trabajo MongoDB y Firestore](entregas/E01_fundacion_backend/02_P2.md#e01-p2-02) | E01-P1-02 | 3 |
| 06 | [E01-P2-03 · Conectar sesión y transporte HTTP de la interfaz](entregas/E01_fundacion_backend/02_P2.md#e01-p2-03) | E01-P1-03 | 2 |
| 07 | [E02-P2-01 · Persistir pacientes e identidad en MongoDB](entregas/E02_pacientes_historial/02_P2.md#e02-p2-01) | E02-P1-01 | 2 |
| 08 | [E02-P2-02 · Persistir menores y responsables iniciales en Firestore](entregas/E02_pacientes_historial/02_P2.md#e02-p2-02) | E02-P1-01 | 3 |
| 09 | [E02-P2-03 · Construir consultas de expediente e historial ordenado](entregas/E02_pacientes_historial/02_P2.md#e02-p2-03) | E02-P1-02, E02-P2-01, E02-P2-02 | 3 |
| 10 | [E03-P2-01 · Implementar núcleo clínico de laboratorio en MongoDB](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-01) | E03-P1-01 | 3 |
| 11 | [E03-P2-02 · Implementar atención pediátrica transaccional](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-02) | E03-P1-01 | 3 |
| 12 | [E03-P2-03 · Integrar atención, archivo y prueba común desde la UI](entregas/E03_nucleo_clinico/02_P2.md#e03-p2-03) | E03-P1-03 | 3 |
| 13 | [E04-P2-01 · Responsables, antecedentes y crecimiento pediátrico](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-01) | Puerta de fase | 3 |
| 14 | [E04-P2-02 · Versionar vacunas y registrar aplicaciones únicas](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-02) | E04-P2-01 | 3 |
| 15 | [E04-P2-03 · Cerrar integración institucional de agendas y pediatría](entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-03) | E04-P1-01, E04-P1-03, E04-P2-02 | 2 |
| 16 | [E05-P2-01 · Captura, validación, corrección y repetición de resultados](entregas/E05_laboratorio/02_P2.md#e05-p2-01) | E05-P1-01 | 3 |
| 17 | [E05-P2-02 · Inventario de reactivos, equipos y control de calidad](entregas/E05_laboratorio/02_P2.md#e05-p2-02) | E05-P1-01 | 3 |
| 18 | [E05-P2-03 · Integrar laboratorio y administración mínima de cuentas](entregas/E05_laboratorio/02_P2.md#e05-p2-03) | E05-P1-02, E05-P1-03, E05-P2-02 | 3 |
| 19 | [E06-P2-01 · Cerrar todas las fronteras HTTP y eliminar simulación en entrega](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-01) | Puerta de fase | 3 |
| 20 | [E06-P2-02 · Actualizar regresiones de UI y ejecutar recorridos completos](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-02) | Puerta de fase | 3 |
| 21 | [E06-P2-03 · Auditar candidato integrado y cerrar defectos](entregas/E06_integracion_auditoria/02_P2.md#e06-p2-03) | E06-P1-02, E06-P1-03 | 2 |
| 22 | [E07-P2-01 · Cerrar retroalimentación docente y trazabilidad académica](entregas/E07_entrega_final/02_P2.md#e07-p2-01) | Puerta de fase | 2 |
| 23 | [E07-P2-02 · Escribir manuales de uso y operación para la entrega](entregas/E07_entrega_final/02_P2.md#e07-p2-02) | Puerta de fase | 2 |
| 24 | [E07-P2-03 · Verificar y cerrar el paquete final](entregas/E07_entrega_final/02_P2.md#e07-p2-03) | E07-P1-03 | 1 |

Todos los estados iniciales son PENDIENTE. Consultar y actualizar [tablero](06_TABLERO.md), no duplicar estados aquí. La puerta de fase previa sigue aplicando aunque la columna no enumere sus seis tareas.
