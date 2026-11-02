# Catálogo de Requisitos — E04-P1-02

## Fuentes Normativas
- `plan/entregas/E04_hospital_dental_pediatria/01_P1.md#e04-p1-02`
- `Database/hospital_general_postgresql.sql`
- `Frontend/src/services/contracts.ts` (HospitalizationRepository)
- `Backend/docs/mapa-ui-v1.json`

## Requisitos Evaluados

| ID Requisito | Descripción | Criterio de Aceptación | Fuente |
|---|---|---|---|
| `RF-H06` | Gestión de ingresos hospitalarios | Registrar ingreso con paciente activo, médico tratante, motivo, diagnóstico CIE-10 y cama inicial disponible. | `01_P1.md#e04-p1-02` |
| `RF-H07` | Control de ocupación y camas hospitalarias | Visualizar disponibilidad de camas por habitación/piso; impedir asignación simultánea de una cama a dos pacientes; permitir traslados con cierre y apertura atómicos. | `01_P1.md#e04-p1-02` |
| `CA17` | Exclusión concurrente y liberación en egreso | Cama ocupada rechaza nueva ocupación solapada (`23P01` / `ESTADO_INVALIDO`). Traslado atómico libera la anterior y ocupa la nueva. Egreso hospitalario libera la cama y finaliza estancia. | `plan/00_PLAN_MAESTRO.md`, `Database/hospital_general_postgresql.sql` |
| `DEC07` | Institución y roles desde token verificado | Las operaciones hospitalarias solo se permiten para `HOSPITAL_GENERAL` con roles autorizados (`MEDICO`, `SECRETARIA`, `ADMIN_INSTITUCIONAL`). | `plan/01_ALCANCE_Y_DECISIONES.md` |
