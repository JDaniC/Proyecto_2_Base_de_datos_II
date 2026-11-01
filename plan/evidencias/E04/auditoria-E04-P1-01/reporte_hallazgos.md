# Informe de Auditoría y Pruebas de Requisitos Funcionales — E04-P1-01

## 1. Resumen Ejecutivo
- **Proyecto Auditado:** Entrega II Bases de Datos II — `E04-P1-01` (Agenda y atención odontológica)
- **Fecha:** `2026-10-31`
- **Alcance:** Endpoints, casos de uso, adaptador MySQL (`clinica_odontologica`) y vistas React HTTP de Agenda (`/agenda`), Expediente (`/pacientes/:id`), Asistente de Consulta (`/pacientes/:id/consultas/nueva`) y Detalle de Consulta (`/consultas/:id`) con separación de roles `SECRETARIA` y `ODONTOLOGO`.
- **Requisitos Totales Extraídos:** `6` (`REQ-OD-01` a `REQ-OD-06`, cubriendo `RF-C01–C08`, `CA06`, `CA18` y `DEC11`).
- **Unidades Auditables Inventariadas:** `15` (`10` Backend + `5` Frontend).
- **Estado General:** `PASS: 6/6 requisitos | FAIL: 0 | BLOCKED: 0 | NOT_IMPLEMENTED: 0`

---

## 2. Inventario y Cobertura

Ver detalle completo en [inventario_implementacion.md](inventario_implementacion.md).

| ID Unidad | Unidad / Endpoint | Tipo | Archivo | Nivel de Riesgo | ¿Tiene Tests? | Estado Cobertura |
|---|---|---|---|---|---|---|
| U-BE-01 | `CitasController` | Controlador HTTP | `Backend/src/adaptadores/entrada/http/citas/citas.controller.ts` | CRITICAL | Sí (`clinica-http.test.ts`) | CUBIERTO |
| U-BE-02 | `GestionarCitas.ejecutar` | Caso de uso | `Backend/src/aplicacion/casos-uso/citas/gestionar-citas.ts` | CRITICAL | Sí (`clinica-sql.test.ts`, `clinica-http.test.ts`) | CUBIERTO |
| U-BE-03 | `ConsultarCitas` | Caso de uso | `Backend/src/aplicacion/casos-uso/citas/consultar-citas.ts` | HIGH | Sí (`clinica-sql.test.ts`, `clinica-http.test.ts`) | CUBIERTO |
| U-BE-04 | `RepositorioCitasMysql` | Adaptador MySQL | `Backend/src/adaptadores/salida/mysql/clinica/repositorio-citas-mysql.ts` | CRITICAL | Sí (`clinica-sql.test.ts`) | CUBIERTO |
| U-BE-05 | `guardarCita` / `resolverIdSecretariaActor` | Adaptador MySQL | `Backend/src/adaptadores/salida/mysql/clinica/aplicar-cambios-clinicos-mysql.ts` | CRITICAL | Sí (`clinica-sql.test.ts`) | CUBIERTO |
| U-BE-06 | `AtencionClinica.ejecutar` | Caso de uso | `Backend/src/aplicacion/casos-uso/consultas/atencion-clinica.ts` | CRITICAL | Sí (`atencion-clinica.test.ts`, `clinica-sql.test.ts`) | CUBIERTO |
| U-BE-07 | `AntecedentesClinicosCasoUso` | Caso de uso | `Backend/src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.ts` | HIGH | Sí (`atencion-clinica.test.ts`, `clinica-http.test.ts`) | CUBIERTO |
| U-BE-08 | `crearRepositorioAntecedentesMysql` / `guardarAntecedentes` | Adaptador MySQL | `Backend/src/adaptadores/salida/mysql/clinica/crear-puertos-clinicos-mysql.ts` | HIGH | Sí (`clinica-sql.test.ts`) | CUBIERTO |
| U-BE-09 | `CatalogosController` / `ConsultarCatalogosClinicos` | Controlador / Caso de uso | `Backend/src/aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.ts` | HIGH | Sí (`atencion-clinica.test.ts`, `clinica-http.test.ts`) | CUBIERTO |
| U-BE-10 | `crearRepositorioCatalogosMysql` / `crearRepositorioProfesionalesMysql` | Adaptador MySQL | `Backend/src/adaptadores/salida/mysql/clinica/crear-puertos-clinicos-mysql.ts` | HIGH | Sí (`clinica-sql.test.ts`) | CUBIERTO |
| U-FE-01 | `crearRepositorioCitasHttp` | Adaptador HTTP UI | `Frontend/src/services/http/appointments/httpAppointmentRepository.ts` | HIGH | Sí (`CalendarHttp.test.tsx`) | CUBIERTO |
| U-FE-02 | `crearRepositorioCatalogosHttp` | Adaptador HTTP UI | `Frontend/src/services/http/catalogs/httpCatalogRepository.ts` | MEDIUM | Sí (`CalendarHttp.test.tsx`, `ClinicaHttp.test.tsx`) | CUBIERTO |
| U-FE-03 | `AppointmentsCalendarPage` y modales de cita | Vista React | `Frontend/src/features/appointments/AppointmentsCalendarPage.tsx` | HIGH | Sí (`CalendarHttp.test.tsx`, `clinica-e2e.mjs`) | CUBIERTO |
| U-FE-04 | `HttpPatientRecord` | Vista React | `Frontend/src/features/patients/HttpPatientRecord.tsx` | HIGH | Sí (`PatientsHttp.test.tsx`, `clinica-e2e.mjs`) | CUBIERTO |
| U-FE-05 | `NewConsultationWizardPage` / `ConsultationDetailPage` | Vista React | `Frontend/src/features/consultations/NewConsultationWizardPage.tsx` | HIGH | Sí (`ClinicaHttp.test.tsx`, `clinica-e2e.mjs`) | CUBIERTO |

---

## 3. Matriz de Trazabilidad: Requisito $\rightarrow$ Código $\rightarrow$ Test

Ver detalle completo en [matriz_trazabilidad.md](matriz_trazabilidad.md). Todos los requisitos (`REQ-OD-01` a `REQ-OD-06`) se encuentran en estado `CUBIERTO`.

---

## 4. Desviaciones Detectadas y Corregidas Durante la Auditoría

### DEV-001 — Columna inexistente `costo_base` al consultar `tratamiento` en MySQL
- **Tipo:** `DIVERGENTE`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Backend/src/adaptadores/salida/mysql/clinica/crear-puertos-clinicos-mysql.ts:145` vs `REQ-OD-05`
- **Evidencia:**
  - *Entrada probada:* `catalogos.obtenerCatalogoOdontologia(ctxOdontologo, bundle)` contra contenedor real MySQL 8.4 (`clinica_odontologica_mysql.sql`).
  - *Salida esperada:* Catálogo odontológico combinando base y registros de `diagnostico`, `tratamiento` y `medicamento`.
  - *Salida observada antes de corregir:* `ErrorDominio: No fue posible consultar el catálogo odontológico` porque la tabla física `tratamiento` tiene columnas `(id_publico, revision, id_tratamiento, nombre, descripcion)` sin `costo_base`.
- **Corrección aplicada:** Se ajustó la consulta SQL a `SELECT id_publico, nombre, descripcion FROM tratamiento ORDER BY nombre ASC LIMIT 100`.
- **Test de regresión asociado:** `Backend/tests/integracion/clinica-sql.test.ts` (`verificarFlujoDentalDosRolesMysql`, paso 4).

### DEV-002 — Conversión de `r.version` en `RepositorioCitasMysql.revisiones` y `RepositorioCitasPostgresql.revisiones`
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Backend/src/adaptadores/salida/mysql/clinica/repositorio-citas-mysql.ts:153` vs `REQ-OD-02`
- **Evidencia:**
  - *Entrada probada:* `GET /citas/:id/revisiones` tras reprogramar una cita en MySQL real.
  - *Salida esperada:* Lista de revisiones con `version: 1`.
  - *Salida observada antes de corregir:* `mysql2` puede retornar columnas `BIGINT` como cadena o número según configuración; `versionPositiva(fila.version)` requería `numero(fila.version)`.
- **Corrección aplicada:** Se normalizó con `versionPositiva(numero(fila.version))` en ambos adaptadores SQL.
- **Test de regresión asociado:** `Backend/tests/integracion/clinica-sql.test.ts` (`verificarFlujoDentalDosRolesMysql`, paso 3).

### DEV-003 — `secretaria_gestora` ausente en la respuesta inmediata de `POST /citas` y `PATCH /citas/:id/reprogramacion`
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Backend/src/aplicacion/casos-uso/citas/gestionar-citas.ts:66` vs `REQ-OD-01`
- **Evidencia:**
  - *Entrada probada:* `POST /api/v1/citas` autenticado como `SECRETARIA` en `CLINICA_ODONTOLOGICA`.
  - *Salida esperada:* El objeto `Cita` devuelto por `POST /citas` y `PATCH /citas/:id/reprogramacion` incluye `secretaria_gestora` igual que `GET /citas`.
  - *Salida observada antes de corregir:* `GET /citas` devolvía `secretaria_gestora` por el `LEFT JOIN secretaria`, pero la respuesta inmediata de `POST /citas` no la poblaba.
- **Corrección aplicada:** Se añadió `secretariaGestoraActor` en `PuertosClinicos` (implementado en MySQL mediante `JOIN secretaria` por `u.id_publico`) y se incluyó en el estado construido por `GestionarCitas.ejecutar`.
- **Test de regresión asociado:** `Frontend/scripts/clinica-e2e.mjs` y `Backend/tests/integracion/clinica-sql.test.ts`.

---

## 5. Pruebas Añadidas y Ejecutadas

- `Backend/tests/unitarios/atencion-clinica.test.ts`:
  - Separación de permisos entre `SECRETARIA` y `ODONTOLOGO` en catálogos y antecedentes clínicos.
- `Backend/tests/runtime/clinica-http.test.ts`:
  - `E04-P1-01: revisiones de cita, catálogos y antecedentes clínicos en odontología con separación de roles`.
- `Backend/tests/integracion/clinica-sql.test.ts`:
  - `verificarFlujoDentalDosRolesMysql`: flujo completo con dos roles (`SECRETARIA` y `ODONTOLOGO`) sobre MySQL real (`secretaria_gestora`, reprogramación, revisiones, solapamiento `409`, cancelación, antecedentes, catálogos y consulta vinculada a cita).
- `Frontend/src/test/http/CalendarHttp.test.tsx`:
  - Agenda HTTP en vivo, creación, reprogramación, cancelación, historial de revisiones, visualización de `secretariaGestora` y aislamiento de acciones clínicas para `SECRETARIA`.
- `Frontend/scripts/clinica-e2e.mjs`:
  - Recorrido E2E navegador con `SECRETARIA` y `ODONTOLOGO` en `CLINICA_ODONTOLOGICA`.

---

## 6. Matriz Final de Resultados

| Suite / Categoría | Ejecutados | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED |
|---|---:|---:|---:|---:|---:|
| Backend unitarias y runtime (`npm --prefix Backend test`) | 282 | 282 | 0 | 0 | 0 |
| Backend contratos (`tests/contratos/*.test.mjs`) | 32 | 32 | 0 | 0 | 0 |
| Integración SQL PostgreSQL + MySQL (`test:integration:sql`) | 6 | 6 | 0 | 0 | 0 |
| Frontend HTTP Vitest (`src/test/http/*.test.ts*`) | 75 | 75 | 0 | 0 | 0 |
| Recorrido E2E UI 4 motores (`--clinica-ui`) | 52 | 52 | 0 | 0 | 0 |

---

## 7. Riesgos Residuales
- La gestión de hospitalización y camas (`HOSPITAL_GENERAL`), seguros y órdenes de exámenes (`HOSPITAL_GENERAL`) y crecimiento/vacunación (`CENTRO_MEDICO_PEDIATRICO`) corresponden a las siguientes tareas de la fase E04 (`E04-P1-02`, `E04-P2-01`, `E04-P2-02`).
