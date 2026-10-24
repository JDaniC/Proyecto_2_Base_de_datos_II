# 02 — Requisitos y Matriz de Trazabilidad

**Fecha:** 19 de octubre de 2026  
**Fuentes:** [`Agente/REQUERIMIENTOS_FUNCIONALES.md`](../../Agente/REQUERIMIENTOS_FUNCIONALES.md), [`Agente/REQUERIMIENTOS_NO_FUNCIONALES.md`](../../Agente/REQUERIMIENTOS_NO_FUNCIONALES.md), [`Agente/DISENO_PROYECTO.md`](../../Agente/DISENO_PROYECTO.md) (§2, §5.5–5.7, §8, §9, §15.2) y [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md).

---

## 1. Clasificación de obligatoriedad

- **OBLIGATORIO ACADÉMICO:** Exigido por la consigna final (`F01–F15`). Incluye las 4 instituciones con motores distintos, enrutamiento por identidad autenticada, interfaz uniforme sin selector de motor, alta/búsqueda/mantenimiento/archivo de pacientes e historiales, registro de consultas, diagnósticos, tratamientos y recetas.
- **BASE ENTREGA I:** Entidades, atributos, clasificación de datos (Pública, Confidencial, Restringida) y procesos específicos por institución (`I01–I15`) levantados en la primera entrega.
- **AMPLIACIÓN / DISEÑO ADOPTADO:** Decisiones técnicas del equipo para hacer verificable y consistente el sistema (Firebase Auth, contratos REST `/api/v1`, UUIDs públicos, claves de idempotencia, versiones de concurrencia y adición de `citas`/`consultas_clinicas` en Laboratorio para demostrar el núcleo común).

---

## 2. Matriz de trazabilidad: Requerimientos Comunes (`RF-001` a `RF-020`)

| ID Req | Criterio / Grupo | Categoría | Caso de uso / Operación | Vistas asociadas | Roles autorizados | Servicio / Mock (`interfaz/app`) | Estado actual |
|---|---|---|---|---|---|---|---|
| `RF-001` | `F05`, `CA01`, `CA02` | DISEÑO ADOPTADO | Iniciar y cerrar sesión (`IniciarSesionDemo`, `CerrarSesion`) | `V01` | Todos | `AuthRepository` / `MockAuthRepository` | `PENDIENTE` (`U01`) |
| `RF-002` | `F05`, `CA02`, `H06` | DISEÑO ADOPTADO | Verificar identidad y estado (`ACTIVO`, `PENDIENTE`, `INACTIVO`) | `V01`, `V02` | Todos | `AuthRepository` / `SessionGuard` | `PENDIENTE` (`U01`, `U02`) |
| `RF-003` | `F01`, `F05`, `CA01` | **OBLIGATORIO ACADÉMICO** | Determinar institución y motor por vínculo de cuenta (sin selector de motor en UI) | `V01`, `V03` y Shell | Todos | `AuthSessionContext` (institución fija por sesión) | `PENDIENTE` (`U01`) |
| `RF-004` | `I15`, `CA18` | BASE ENTREGA I / DISEÑO | Comprobar permisos por rol y recurso (`pacientes.administrar`, `historial.leer`, etc.) | `V02`, `V03`–`V18`, `H*`, `C*`, `L*`, `P*` | Según matriz de rol | `PermissionGuard` + filtro de campos en Mock | `PENDIENTE` (`U01+`) |
| `RF-005` | `F08`, `CA03`, `CA09` | **OBLIGATORIO ACADÉMICO** | Registrar paciente nuevo y abrir historial clínico (`POST /pacientes`) | `V05`, `P01` | Secretaría, Admin, Médico autorizado | `PatientRepository.createPatient` | `PENDIENTE` (`U04`) |
| `RF-006` | `I05`, `CA03` | BASE ENTREGA I / DISEÑO | Buscar y reutilizar expediente sin duplicar (`GET /pacientes`, control `409 PACIENTE_DUPLICADO`) | `V04`, `V05`, `V06` | Médico, Secretaría, Lab (según permiso) | `PatientRepository.searchPatients` | `PENDIENTE` (`U04`) |
| `RF-007` | `F07`, `CA07` | BASE ENTREGA I / DISEÑO | Consultar historial cronológico con filtros y paginación (`GET /pacientes/{id}/historial`) | `V06`, `V07`, `P07`, `L05` | Personal clínico autorizado | `ClinicalRecordRepository.getTimeline` | `PENDIENTE` (`U05`) |
| `RF-008` | `F10`, `CA08` | **OBLIGATORIO ACADÉMICO** | Archivar y reactivar historial con causa y motivo conservando eventos previos | `V06`, `V14` | Administrador / rol con `historial.archivar` | `PatientRepository.archiveRecord` / `reactivateRecord` | `PENDIENTE` (`U05`) |
| `RF-009` | `I02`, `CA06` | DISEÑO ADOPTADO | Programar, reprogramar y cancelar citas con motivo (`PROGRAMADA → ATENDIDA/CANCELADA`) | `V08`, `V09`, `C01`, `C02` | Secretaría, Profesionales | `AppointmentRepository` | `PENDIENTE` (`U06`) |
| `RF-010` | `F09`, `CA04`, `CA05` | **OBLIGATORIO ACADÉMICO** | Registrar consulta vinculada a paciente, profesional y cita opcional (`ABIERTA → FINALIZADA`) | `V10`, `V11`, `C03` | Médico, Odontólogo, Pediatra, Médico Lab | `ConsultationRepository` | `PENDIENTE` (`U07`) |
| `RF-011` | `F09`, `CA05` | **OBLIGATORIO ACADÉMICO** | Agregar diagnósticos (1 principal obligatorio si existen) y tratamientos a consulta | `V10`, `V11`, `V12`, `C04` | Profesional clínico autorizado | `ConsultationRepository` + `CatalogRepository` | `PENDIENTE` (`U07`) |
| `RF-012` | `F09`, `I13`, `CA05`, `CA10` | **OBLIGATORIO ACADÉMICO** | Emitir receta con múltiples medicamentos e instantánea histórica | `V10`, `V11`, `V13`, `C04` | Profesional clínico con `recetas.emitir` | `ConsultationRepository.issuePrescription` | `PENDIENTE` (`U07`) |
| `RF-013` | `I13`, `CA10` | DISEÑO ADOPTADO | Conservar versiones/revisiones de consultas y recetas con actor, fecha y motivo | `V11`, `V13`, `V18` | Profesional clínico / Auditor | `RevisionRepository` | `PENDIENTE` (`U07` / `U08`) |
| `RF-014` | `I15`, `CA18` | DISEÑO ADOPTADO | Registrar y consultar eventos de auditoría (`actor`, `accion`, `recurso`, `fecha`, `motivo`) | `V18` | Administrador / Auditor (`auditoria.leer`) | `AuditRepository` | `PENDIENTE` (`U08`) |
| `RF-015` | `I15`, `CA03–CA17` | DISEÑO ADOPTADO | Validar campos obligatorios, formatos, rangos, unicidad y estados antes de guardar | Todas las vistas con formulario | Todos | Validadores de formulario y repositorios mock | `PENDIENTE` (`U01–U18`) |
| `RF-016` | `I15`, `CA06`, `CA13`, `CA17` | DISEÑO ADOPTADO | Rechazar relaciones cruzadas entre recursos de distinto paciente o institución | `V09`, `V10`, `H02`, `L06`, `L07`, `L09`, `P06` | Todos | Verificación de pertenencia en `Mock*Repository` | `PENDIENTE` (`U06+`) |
| `RF-017` | `F04`, `F06`, `CA04` | **OBLIGATORIO ACADÉMICO** | Semántica y contratos equivalentes para operaciones comunes en las 4 instituciones | `V01`–`V19` | Todos | Puertos comunes en `src/services/` | `PENDIENTE` (`U01+`) |
| `RF-018` | `F07`, `RNF-028` | **OBLIGATORIO ACADÉMICO** | Interfaz coherente sin exponer detalles técnicos ni selector de motor | Todas (`V01`–`P07`) | Todos | Design System v1.1 unificado | `PENDIENTE` (`U01+`) |
| `RF-019` | `RNF-023`, `CA03`, `CA14` | DISEÑO ADOPTADO | Evitar duplicados por reintentos mediante `Idempotency-Key` y bloqueo de doble envío | Formularios `V01`, `V05`, `V09`, `V10`, `L02`, `L13`, `P06` | Todos | `IdempotencyStore` en memoria + estado `loading` | `PENDIENTE` (`U01+`) |
| `RF-020` | `RNF-033`, `RNF-034` | DISEÑO ADOPTADO | Devolver errores estructurados (`400`, `401`, `403`, `404`, `409`, `503`) con código y correlación | `V01`, `V02`, `V19` y todos los flujos | Todos | `AppError` + componente `Alert` | `PENDIENTE` (`U01+`) |

---

## 3. Matriz de trazabilidad por institución

### 3.1 Hospital General (`RF-H01` a `RF-H09`) — Motor objetivo: PostgreSQL

| ID Req | Criterio | Categoría | Vistas asociadas | Mock / Contrato previsto | Estado |
|---|---|---|---|---|---|
| `RF-H01` | `I01` | BASE ENTREGA I | `V04`, `V05`, `V06` (contactos de emergencia, alergias, antecedentes) | `PatientRepository` (extensión hospital) | `PENDIENTE` (`U04`, `U05`) |
| `RF-H02` | `I01` | BASE ENTREGA I | `H08` (pestaña en `V17`), `V10`, `H07` | `HospitalCatalogRepository` | `PENDIENTE` (`U08`, `U10`) |
| `RF-H03` | `I01` | BASE ENTREGA I | `V08`, `V09`, `V10` (signos vitales en paso 2), `V11` | `AppointmentRepository`, `ConsultationRepository` | `PENDIENTE` (`U06`, `U07`) |
| `RF-H04` | `F09`, `I01` | **OBLIGATORIO** / BASE I | `V10`, `V12`, `V13`, `H07` (procedimientos realizados) | `ConsultationRepository`, `HospitalProcedureRepository` | `PENDIENTE` (`U07`, `U10`) |
| `RF-H05` | `I01` | BASE ENTREGA I | `H06` (órdenes de examen y resultados con parámetros) | `HospitalExamRepository` | `PENDIENTE` (`U10`) |
| `RF-H06` | `I01`, `CA17` | BASE ENTREGA I | `H01`, `H02`, `H03`, `H04` | `HospitalizationRepository`, `BedRepository` | `PENDIENTE` (`U09`) |
| `RF-H07` | `CA17` | DISEÑO ADOPTADO | `H03`, `H04` (validación de no solapamiento `[inicio, fin)`) | `BedRepository.assignBed` | `PENDIENTE` (`U09`) |
| `RF-H08` | `I01` | BASE ENTREGA I | `H05` (subvista en `V06` y catálogos en `V17`) | `InsuranceRepository` | `PENDIENTE` (`U10`) |
| `RF-H09` | `I15`, `CA18` | DISEÑO ADOPTADO | `V15`, `V16`, `V18` | `AdminUserRepository`, `AuditRepository` | `PENDIENTE` (`U08`) |

### 3.2 Clínica Odontológica (`RF-C01` a `RF-C08`) — Motor objetivo: MySQL

| ID Req | Criterio | Categoría | Vistas asociadas | Mock / Contrato previsto | Estado |
|---|---|---|---|---|---|
| `RF-C01` | `I02` | BASE ENTREGA I | `V04`, `V05`, `V06`, `V07` | `PatientRepository` | `PENDIENTE` (`U04`, `U05`) |
| `RF-C02` | `I02` | BASE ENTREGA I | `C05` / `V17` (secretarías y odontólogos con colegiado único) | `DentalCatalogRepository` | `PENDIENTE` (`U11`) |
| `RF-C03` | `I02`, `CA06` | BASE ENTREGA I | `C01` (variante `V08`), `C02` (detalle con secretaria gestora) | `AppointmentRepository` | `PENDIENTE` (`U11`) |
| `RF-C04` | `I02`, `CA06` | BASE ENTREGA I | `C03` (variante `V10`), `V06` (antecedentes odontológicos) | `ConsultationRepository` | `PENDIENTE` (`U11`) |
| `RF-C05` | `F09`, `I02` | **OBLIGATORIO** / BASE I | `C04` (subvista `V11–V12`), `C05` | `ConsultationRepository`, `DentalCatalogRepository` | `PENDIENTE` (`U11`) |
| `RF-C06` | `F09`, `I02` | **OBLIGATORIO** / BASE I | `C04` (`V13` receta odontológica) | `ConsultationRepository` | `PENDIENTE` (`U11`) |
| `RF-C07` | `CA06` | DISEÑO ADOPTADO | `C02`, `C03` (bloqueo de consulta si cita está `CANCELADA`) | `ConsultationRepository` | `PENDIENTE` (`U11`) |
| `RF-C08` | `CA18` | DISEÑO ADOPTADO | `V15`, `V16`, `V18` (secretaría sin acceso a notas clínicas restringidas) | `PermissionGuard` + `AdminUserRepository` | `PENDIENTE` (`U08`, `U11`) |

### 3.3 Laboratorio Clínico (`RF-L01` a `RF-L14`) — Motor objetivo: MongoDB

| ID Req | Criterio | Categoría | Vistas asociadas | Mock / Contrato previsto | Estado |
|---|---|---|---|---|---|
| `RF-L01` | `I03`, `CA16` | BASE ENTREGA I | `V04`, `V05`, `L10` (solicitantes, tipos de muestra, métodos, pruebas versionadas) | `LabCatalogRepository` | `PENDIENTE` (`U14`) |
| `RF-L02` | `I03`, `CA12` | BASE ENTREGA I / DISEÑO | `L01`, `L02`, `L03` (órdenes con ítems, versión de prueba y precio histórico) | `LabOrderRepository` | `PENDIENTE` (`U12`) |
| `RF-L03` | `I03`, `CA12` | BASE ENTREGA I / DISEÑO | `L04`, `L05` (muestras `TOMADA → RECIBIDA → ACEPTADA → PROCESADA / RECHAZADA`) | `LabSampleRepository` | `PENDIENTE` (`U12`) |
| `RF-L04` | `I06`, `CA12` | DISEÑO ADOPTADO | `L04`, `L05` (motivo de rechazo, retoma como nueva muestra, rectificación en evento) | `LabSampleRepository` | `PENDIENTE` (`U12`) |
| `RF-L05` | `I03`, `CA12` | BASE ENTREGA I / DISEÑO | `L06` (captura dinámica según parámetros de versión de prueba, equipo y analista) | `LabResultRepository` | `PENDIENTE` (`U13`) |
| `RF-L06` | `I15`, `CA13`, `CA18` | DISEÑO ADOPTADO | `L06`, `L07` (separación estricta entre `resultados.analizar` y `resultados.validar`) | `LabResultRepository.validateResult` | `PENDIENTE` (`U13`) |
| `RF-L07` | `I06`, `CA12` | DISEÑO ADOPTADO | `L08` (corrección crea nueva versión en misma serie; repetición crea nueva serie) | `LabResultRepository` | `PENDIENTE` (`U13`) |
| `RF-L08` | `I07`, `CA13` | DISEÑO ADOPTADO | `L09` (emisión de informe solo con resultados `VALIDADO`, guardando versiones exactas) | `LabReportRepository` | `PENDIENTE` (`U13`) |
| `RF-L09` | `I03`, `CA16` | BASE ENTREGA I / DISEÑO | `L11` (equipos y controles de calidad), `L12` (reactivos, lotes y movimientos) | `LabQualityRepository`, `LabInventoryRepository` | `PENDIENTE` (`U14`, `U15`) |
| `RF-L10` | `I09`, `CA15` | DISEÑO ADOPTADO | `L12` (existencia derivada de movimientos confirmados; bloqueo de lote vencido o saldo < 0) | `LabInventoryRepository` | `PENDIENTE` (`U15`) |
| `RF-L11` | `I08`, `CA14` | DISEÑO ADOPTADO | `L13` (facturas en centavos/unidades enteras, pagos idempotentes, reversiones y saldo) | `LabBillingRepository` | `PENDIENTE` (`U15`) |
| `RF-L12` | `CA16` | DISEÑO ADOPTADO | `L01`, `L03`, `L04`, `L12`, `L13` (búsquedas filtradas y paginadas) | Repositorios de Laboratorio | `PENDIENTE` (`U12–U15`) |
| `RF-L13` | `H01`, `CA18` | **AMPLIACIÓN EQUIPO** | `L14` (integrada en `V15`/`V16`: vínculo con solicitante médico individual para rol clínico) | `AdminUserRepository` | `PENDIENTE` (`U08`, `U14`) |
| `RF-L14` | `F06`, `H01`, `CA04` | **AMPLIACIÓN EQUIPO** | `V08`–`V13` habilitadas solo para médico responsable vinculado en Laboratorio | `ConsultationRepository` | `PENDIENTE` (`U06`, `U07`) |

### 3.4 Centro Médico Pediátrico (`RF-P01` a `RF-P12`) — Motor objetivo: Cloud Firestore

| ID Req | Criterio | Categoría | Vistas asociadas | Mock / Contrato previsto | Estado |
|---|---|---|---|---|---|
| `RF-P01` | `I04` | BASE ENTREGA I | `V04`, `V05`, `V06`, `P03` (alergias y antecedentes pediátricos; sin verificar ≠ sin alergias) | `PatientRepository`, `PediatricRecordRepository` | `PENDIENTE` (`U04`, `U16`) |
| `RF-P02` | `I04`, `I11`, `CA09` | BASE ENTREGA I / DISEÑO | `P01` (responsables compartidos, parentesco, `es_principal`, `autoriza_atencion`) | `GuardianRepository` | `PENDIENTE` (`U16`) |
| `RF-P03` | `I10`, `CA09` | DISEÑO ADOPTADO | `V05` + `P01` (al menos un principal obligatorio; no borrar el último principal) | `GuardianRepository` | `PENDIENTE` (`U04`, `U16`) |
| `RF-P04` | `I10`, `CA09` | DISEÑO ADOPTADO | `V10` + `P01` (exigir responsable vigente con `autoriza_atencion = true` antes de consulta) | `ConsultationRepository` | `PENDIENTE` (`U07`, `U16`) |
| `RF-P05` | `I04` | BASE ENTREGA I | `V08`, `V09`, `V10`, `V17` (pediatras) | `AppointmentRepository`, `ConsultationRepository` | `PENDIENTE` (`U06`, `U07`) |
| `RF-P06` | `I12`, `CA10` | BASE ENTREGA I / DISEÑO | `V10`, `P02` (máximo un objeto `control_crecimiento` por consulta; tabla comparativa por fecha) | `PediatricGrowthRepository` | `PENDIENTE` (`U16`) |
| `RF-P07` | `I12`, `CA10` | DISEÑO ADOPTADO | `P02` (cálculo de edad e IMC desde datos válidos, sin diagnósticos automáticos ni 0 por vacío) | `PediatricGrowthRepository` | `PENDIENTE` (`U16`) |
| `RF-P08` | `F09`, `I13`, `CA10` | **OBLIGATORIO** / BASE I | `V10`, `V12`, `V13` (diagnósticos, tratamientos y receta histórica pediátrica) | `ConsultationRepository` | `PENDIENTE` (`U07`) |
| `RF-P09` | `I04`, `CA11` | BASE ENTREGA I / DISEÑO | `P04` (catálogo versionado de vacunas y dosis en `V17`) | `VaccinationRepository` | `PENDIENTE` (`U17`) |
| `RF-P10` | `I14`, `CA11` | BASE ENTREGA I / DISEÑO | `P06` (aplicación determinista `paciente_vacuna_dosis`, lote, sitio y pediatra) | `VaccinationRepository.applyDose` | `PENDIENTE` (`U17`) |
| `RF-P11` | `I14`, `CA11` | DISEÑO ADOPTADO | `P05` (clasificación `FUTURA` / `PENDIENTE` / `APLICADA` según esquema asignado y edad) | `VaccinationRepository.getSchedule` | `PENDIENTE` (`U17`) |
| `RF-P12` | `F10`, `I14`, `CA07`, `CA08` | **OBLIGATORIO** / BASE I | `V07`, `P07`, `V14` (cronología unificada y archivo sin borrado de eventos) | `ClinicalRecordRepository`, `VaccinationRepository` | `PENDIENTE` (`U05`, `U17`) |
