# Inventario de Implementación — E04-P1-01 (Agenda y atención odontológica)

## 1. Unidades auditables de Backend

| ID Unidad | Unidad / Endpoint / Caso de Uso | Archivo | Nivel de Riesgo | Requisitos | Estado |
|---|---|---|---|---|---|
| U-BE-01 | `CitasController` (`GET /citas`, `GET /citas/:id`, `GET /citas/:id/revisiones`, `POST /citas`, `PATCH /citas/:id/reprogramacion`, `POST /citas/:id/cancelacion`) | `Backend/src/adaptadores/entrada/http/citas/citas.controller.ts` | CRITICAL | REQ-OD-01, REQ-OD-02, REQ-OD-06 | CUBIERTO |
| U-BE-02 | `GestionarCitas.ejecutar` (creación, reprogramación, cancelación, control de solapamiento, `secretariaGestoraActor`, revisiones y auditoría en UoW) | `Backend/src/aplicacion/casos-uso/citas/gestionar-citas.ts` | CRITICAL | REQ-OD-01, REQ-OD-02 | CUBIERTO |
| U-BE-03 | `ConsultarCitas` (`listar`, `porId`, `revisiones` con cursor firmado y rango de fechas) | `Backend/src/aplicacion/casos-uso/citas/consultar-citas.ts` | HIGH | REQ-OD-01, REQ-OD-02 | CUBIERTO |
| U-BE-04 | `RepositorioCitasMysql` (`SELECT_CITA` con `LEFT JOIN secretaria`, `listar`, `porId`, `solapamientos FOR UPDATE`, `revisiones`) | `Backend/src/adaptadores/salida/mysql/clinica/repositorio-citas-mysql.ts` | CRITICAL | REQ-OD-01, REQ-OD-02 | CUBIERTO |
| U-BE-05 | `guardarCita` y `resolverIdSecretariaActor` en MySQL (`id_secretaria` derivado de la cuenta autenticada en `INSERT` y `UPDATE COALESCE`) | `Backend/src/adaptadores/salida/mysql/clinica/aplicar-cambios-clinicos-mysql.ts` | CRITICAL | REQ-OD-01, REQ-OD-02, REQ-OD-06 | CUBIERTO |
| U-BE-06 | `AtencionClinica.ejecutar` (validación de cita dental obligatoria, coincidencia de paciente/odontólogo/historial activo, receta e instantánea de profesional) | `Backend/src/aplicacion/casos-uso/consultas/atencion-clinica.ts` | CRITICAL | REQ-OD-03, REQ-OD-05, REQ-OD-06 | CUBIERTO |
| U-BE-07 | `AntecedentesClinicosCasoUso` (`obtener` y `actualizar` con exigencia de acceso clínico y no meramente administrativo) | `Backend/src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.ts` | HIGH | REQ-OD-04, REQ-OD-06 | CUBIERTO |
| U-BE-08 | `crearRepositorioAntecedentesMysql` y `guardarAntecedentes` (lectura y reemplazo transaccional en tabla `antecedente` de MySQL) | `Backend/src/adaptadores/salida/mysql/clinica/crear-puertos-clinicos-mysql.ts`, `aplicar-cambios-clinicos-mysql.ts` | HIGH | REQ-OD-04 | CUBIERTO |
| U-BE-09 | `CatalogosController` y `ConsultarCatalogosClinicos` (`GET /catalogos/medicos` para agenda/clínica y `GET /catalogos/odontologia` restringido a personal clínico) | `Backend/src/adaptadores/entrada/http/catalogos/catalogos.controller.ts`, `Backend/src/aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.ts` | HIGH | REQ-OD-05, REQ-OD-06 | CUBIERTO |
| U-BE-10 | `crearRepositorioCatalogosMysql` y `crearRepositorioProfesionalesMysql` (consulta de `odontologo`, `diagnostico`, `tratamiento` y `medicamento` en MySQL) | `Backend/src/adaptadores/salida/mysql/clinica/crear-puertos-clinicos-mysql.ts` | HIGH | REQ-OD-05 | CUBIERTO |

## 2. Unidades auditables de Frontend

| ID Unidad | Unidad / Componente / Adaptador | Archivo | Nivel de Riesgo | Requisitos | Estado |
|---|---|---|---|---|---|
| U-FE-01 | `crearRepositorioCitasHttp` (`listar`, `obtenerPorId`, `obtenerRevisiones`, `crear`, `reprogramar`, `cancelar`, mapeo de `secretaria_gestora` $\rightarrow$ `secretariaGestora`) | `Frontend/src/services/http/appointments/httpAppointmentRepository.ts` | HIGH | REQ-OD-01, REQ-OD-02 | CUBIERTO |
| U-FE-02 | `crearRepositorioCatalogosHttp` (`listarMedicos`, `obtenerCatalogoOdontologia`) y cableado en `serviceFactory` / `ServiceContext` | `Frontend/src/services/http/catalogs/httpCatalogRepository.ts`, `serviceFactory.ts`, `ServiceContext.tsx` | MEDIUM | REQ-OD-01, REQ-OD-05 | CUBIERTO |
| U-FE-03 | `AppointmentsCalendarPage`, `CrearCitaModal`, `ReprogramarCitaModal`, `CancelarCitaModal` (agenda HTTP en vivo, filtro por odontólogo, alta, reprogramación, cancelación, visualización de `secretariaGestora`, modal de revisiones y botón `Atender paciente` solo para rol clínico) | `Frontend/src/features/appointments/AppointmentsCalendarPage.tsx`, `CrearCitaModal.tsx`, `ReprogramarCitaModal.tsx`, `CancelarCitaModal.tsx` | HIGH | REQ-OD-01, REQ-OD-02, REQ-OD-03, REQ-OD-06 | CUBIERTO |
| U-FE-04 | `HttpPatientRecord` (ocultamiento de pestaña clínica y bloque de antecedentes para `SECRETARIA`; visualización y registro de antecedentes odontológicos para `ODONTOLOGO`; bloqueo de inicio de consulta sin cita en odontología) | `Frontend/src/features/patients/HttpPatientRecord.tsx` | HIGH | REQ-OD-03, REQ-OD-04, REQ-OD-06 | CUBIERTO |
| U-FE-05 | `NewConsultationWizardPage`, `ConsultationDetailPage`, `ImprimirRecetaModal` (selectores de catálogo odontológico de diagnósticos, procedimientos y fármacos; preservación y visualización de información profesional y receta) | `Frontend/src/features/consultations/NewConsultationWizardPage.tsx`, `ConsultationDetailPage.tsx`, `ImprimirRecetaModal.tsx` | HIGH | REQ-OD-03, REQ-OD-05 | CUBIERTO |
