# Cola compartida · Lote histórico P1

Cualquiera de los dos puede ejecutar estas tareas. El lote e ID se conservan para los enlaces, no indican propiedad. Leer [continuidad](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md), [plan maestro](00_PLAN_MAESTRO.md), [tablero](06_TABLERO.md) y contrato. CodeRabbit revisa el PR; el compañero puede revisar de forma opcional.

E00–E04 se conservan como historial de ejecución. E05 contiene la ruta técnica vigente. Las sesiones previas son estimaciones originales.

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
| 18 | [E05-P1-03 · Facturación, pagos y reversiones con saldo consistente](entregas/E05_laboratorio/01_P1.md#e05-p1-03) | E05-P1-01 | 3 |
| 19 | [E05-P1-04 · Instalar y verificar el candidato en los cuatro motores](entregas/E05_laboratorio/01_P1.md#e05-p1-04) | E05-P2-03 | — |

El [tablero](06_TABLERO.md) registra los estados y ejecutores. La puerta de la fase anterior se verifica sobre las tareas vigentes y su cierre.
