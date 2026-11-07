# Cola compartida · Lote histórico P2

Cualquiera de los dos puede ejecutar estas tareas. El lote e ID se conservan para los enlaces, no indican propiedad. Leer [continuidad](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md), [plan maestro](00_PLAN_MAESTRO.md), [tablero](06_TABLERO.md) y contrato. CodeRabbit revisa el PR; el compañero puede revisar de forma opcional.

E00–E04 se conservan como historial de ejecución. E05 contiene la ruta técnica vigente. Las sesiones previas son estimaciones originales.

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
| 18 | [E05-P2-03 · Conectar el circuito analítico a la interfaz existente](entregas/E05_laboratorio/02_P2.md#e05-p2-03) | E05-P1-01, E05-P2-01 | — |

El [tablero](06_TABLERO.md) registra los estados y ejecutores. La puerta de la fase anterior se verifica sobre las tareas vigentes y su cierre.
