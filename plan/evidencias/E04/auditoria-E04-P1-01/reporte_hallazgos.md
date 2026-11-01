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

### DEV-004 — Bloqueo de mutaciones de antecedentes si la carga inicial de antecedentes falla
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Frontend/src/features/patients/HttpPatientRecord.tsx:55` vs `REQ-OD-04`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434148840`).
  - *Comportamiento detectado:* Si `obtenerAntecedentes` fallaba pero el expediente cargaba, el error se atrapaba silenciosamente tratando los antecedentes como vacíos. Si el odontólogo guardaba una nueva alergia, el reemplazo `PUT /antecedentes` borraba los antecedentes preexistentes.
  - *Corrección aplicada:* Se utilizó `Promise.allSettled`, se expuso el error `errorAntecedentes`, se inhabilitaron los botones/inputs de agregar alergia o condición y `handleGuardarAntecedente` bloquea la escritura si no hay antecedentes válidos cargados.

### DEV-005 — Clave idempotente conservada ante reintentos en alta de citas
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/appointments/CrearCitaModal.tsx:145` vs `REQ-OD-01`, `DEC07`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434148843`).
  - *Comportamiento detectado:* Cada envío generaba un `randomUUID` nuevo, impidiendo la recuperación de una respuesta perdida ante caída de conexión (produciendo `VERSION_DESACTUALIZADA` en el reintento).
  - *Corrección aplicada:* Se implementó `claveIntencionRef` memorizando la huella del formulario y preservando la misma `idempotencyKey` entre reintentos del mismo formulario, reseteándola al cambiar los campos o tras éxito.

### DEV-006 — Reactividad de nombres de paciente y profesional en agenda HTTP
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/appointments/AppointmentsCalendarPage.tsx:187` vs `REQ-OD-01`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434148845`).
  - *Comportamiento detectado:* La resolución de nombres dependía de `citas.length`. Al cambiar de fecha o filtros con la misma cantidad de citas, se mantenían los IDs en lugar de los nombres enriquecidos.
  - *Corrección aplicada:* Se indexó la dependencia con una huella compuesta `huellaCitas` basada en IDs y estado de resolución, asegurando re-enriquecimiento reactivo sin ciclos.

### DEV-007 — Separación de concentración y dosis sugerida en catálogo de medicamentos odontológicos
- **Tipo:** `DIVERGENTE`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/consultations/NewConsultationWizardPage.tsx:183`, `Backend/src/aplicacion/puertos/clinica.ts:59` vs `REQ-OD-05`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434148846`).
  - *Comportamiento detectado:* La concentración se poblaba con `dosis_sugerida` (e.g., "15 ml en enjuague bucal sin diluir"), pisando la concentración real del fármaco (e.g. "0.12%").
  - *Corrección aplicada:* Se añadió el campo opcional `concentracion` en `ItemCatalogoMedicamentoOdontologico` del puerto backend y del DTO frontend, y en `NewConsultationWizardPage` se asignan por separado la concentración y la dosis sugerida al autocompletar la receta.

### DEV-008 — Preservación de identificadores y cronología de antecedentes en MySQL
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Backend/src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.ts:175` vs `REQ-OD-04`, `AGENTS.md` §Historia
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434261071`).
  - *Comportamiento detectado:* Al actualizar antecedentes agregando un ítem, se generaban IDs UUID nuevos y la fecha del día para todos los antecedentes (incluyendo los inalterados), borrando la cronología histórica previa en la tabla `antecedente`.
  - *Corrección aplicada:* En `ActualizarAntecedentesClinicos`, se indexan los antecedentes existentes por clave de contenido (`TIPO:DESCRIPCIÓN`) y se reutilizan exactamente su `id` y su `fecha_registro` previa, asignando nuevo ID y fecha de hoy únicamente a los ítems genuinamente nuevos.

### DEV-009 — Supresión de unidades redundantes en prescripción odontológica
- **Tipo:** `DIVERGENTE`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/consultations/NewConsultationWizardPage.tsx:187` vs `REQ-OD-05`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434261074`).
  - *Comportamiento detectado:* La sugerencia de medicamentos copiaba la presentación del producto a `medUnidad`, produciendo concatenaciones como "500 mg cápsula 500 mg" o "15 ml colutorio frasco 250 ml".
  - *Corrección aplicada:* Se deja `unidad: ''` cuando `dosis_sugerida` ya incluye la especificación completa, evitando duplicar textos de empaque en la dosis.

### DEV-010 — Exigencia de duración explícita al reprogramar citas legadas sin duración
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/services/http/appointments/httpAppointmentRepository.ts:163`, `ReprogramarCitaModal.tsx:160` vs `REQ-OD-02`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434261077`).
  - *Comportamiento detectado:* Citas con `duracion_minutos === null` caían a un valor por defecto de 30 minutos sin input en la interfaz, sorteando la regla del backend de capturar la duración de citas legadas.
  - *Corrección aplicada:* Se incorporó un selector obligatorio de duración en `ReprogramarCitaModal` y en `httpAppointmentRepository` se valida que la duración esté definida y sea válida antes de enviar el PATCH.

### DEV-011 — Reseteo de selección de paciente al vaciar resultados de búsqueda
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Frontend/src/features/appointments/CrearCitaModal.tsx:110` vs `REQ-OD-01`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434261079`).
  - *Comportamiento detectado:* Si una búsqueda no arrojaba resultados, `pacienteId` conservaba el valor del paciente anterior, permitiendo enviar el formulario y asociar la cita al paciente incorrecto.
  - *Corrección aplicada:* Se limpia `setPacienteId('')` cuando los resultados están vacíos y `handleSubmit` valida explícitamente `!pacienteId || !pacientes.some((p) => p.id === pacienteId)`.

### DEV-012 — Consumo único de identidades preexistentes de antecedentes clínicos
- **Tipo:** `DIVERGENTE`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Backend/src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.ts:177` vs `REQ-OD-03`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434277688`).
  - *Comportamiento detectado:* Si un paciente tenía múltiples antecedentes con la misma clave normalizada de tipo y descripción, el mapa reutilizaba el mismo UUID en cada ocurrencia, violando la restricción de unicidad de `antecedente.id_publico` en MySQL al persistir.
  - *Corrección aplicada:* Se estructura una cola FIFO (`Array<{ id: UUID; fecha_registro: string }>`) por clave para que cada identidad existente sea consumida exactamente una vez; si se acotan o añaden duplicados, se generan nuevos UUIDs deterministas sin colisión.

### DEV-013 — Descarte de respuestas tardías u obsoletas en búsqueda de pacientes
- **Tipo:** `CONCURRENCIA / CARRERA`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/appointments/CrearCitaModal.tsx:102` vs `REQ-OD-01`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434277682`).
  - *Comportamiento detectado:* Respuestas asíncronas de búsquedas previas de pacientes podían resolverse fuera de orden o con el modal cerrado, sobreescribiendo el listado y la selección del usuario.
  - *Corrección aplicada:* Se incorporó un flag `cancelado` en el cleanup del efecto de búsqueda para descartar cualquier promesa pendiente tras nuevas teclas o cierre del modal.

### DEV-014 — Inclusión de la duración actual de la cita en el selector de reprogramación
- **Tipo:** `DIVERGENTE`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/appointments/ReprogramarCitaModal.tsx:251` vs `REQ-OD-02`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434291229`).
  - *Comportamiento detectado:* Si una cita existente tenía una duración atípica (ej. 35, 40 o 75 min), el `<select>` no contenía dicha opción y visualizaba la primera opción por defecto (15 min) mientras el estado preservaba la duración original, discrepando entre lo exhibido y lo enviado.
  - *Corrección aplicada:* Se genera la lista de opciones unificando los intervalos estándar `[15, 20, 30, 45, 60, 90, 120]` con `duracionMinutos`, filtrando números enteros entre 5 y 480 minutos y ordenando numéricamente, garantizando que cualquier duración preexistente esté disponible y seleccionada en la interfaz.

### DEV-015 — Inclusión de presentaciones de medicamentos del catálogo HTTP en el selector
- **Tipo:** `DIVERGENTE`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/features/consultations/NewConsultationWizardPage.tsx:1353` vs `REQ-OD-05`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434301181`).
  - *Comportamiento detectado:* El catálogo HTTP devuelve presentaciones específicas de odontología como `Cápsula 500 mg` o `Colutorio frasco 250 ml`, las cuales no existían en las opciones fijas del `<select>`, haciendo que la UI mostrara un valor predeterminado distinto al valor asignado en el estado y persistido.
  - *Corrección aplicada:* Se unifican las presentaciones estándar con la presentación del medicamento seleccionado dinámicamente (`Set([...estándar, medPresentacion])`), asegurando que siempre exista una opción coincidente en el DOM.

### DEV-016 — Paginación por cursor completa en revisiones de citas
- **Tipo:** `SUB_IMPLEMENTADO`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Frontend/src/services/http/appointments/httpAppointmentRepository.ts:117` vs `REQ-OD-02`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434301185`).
  - *Comportamiento detectado:* En citas con más de 50 revisiones, `obtenerRevisiones` descartaba `siguiente_cursor` y devolvía solo la primera página en orden ascendente, ocultando las revisiones más recientes y posibles cancelaciones.
  - *Corrección aplicada:* Se implementó un bucle asíncrono que sigue recursivamente el cursor devuelto por el backend hasta agotar todas las páginas (`while (cursor)`), consolidando la cronología completa de la cita sin truncamiento.

### DEV-017 — Rechazo explícito de actualización de antecedentes en bundles sin persistencia
- **Tipo:** `PERSISTENCIA / SEGURIDAD`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Backend/src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.ts:93` vs `REQ-OD-03`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434357093`).
  - *Comportamiento detectado:* La actualización de antecedentes ejecutaba el comando aún si el bundle (ej. PostgreSQL hospitalario) carecía de adaptador para persistir antecedentes, consumiendo la versión del paciente y devolviendo éxito sobre datos no almacenados.
  - *Corrección aplicada:* En `ActualizarAntecedentesClinicos`, se verifica antes de preparar y al ejecutar el comando que `clinica.antecedentes` exista; en caso contrario, se lanza `PERSISTENCIA_NO_DISPONIBLE` (`503`), garantizando que solo motores con almacenamiento durable de antecedentes acepten modificaciones.

### DEV-018 — Exposición de fallo en carga HTTP de catálogos y supresión de simulación
- **Tipo:** `FALLBACK PROHIBIDO`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Frontend/src/features/consultations/NewConsultationWizardPage.tsx:94` vs `REQ-OD-05`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434357095`).
  - *Comportamiento detectado:* En modo API odontológico, un fallo de `/catalogos/odontologia` retenía en silencio los arreglos de diagnósticos, tratamientos y medicamentos simulados en local, permitiendo seleccionar y enviar datos simulados sin advertencia.
  - *Corrección aplicada:* En modo API para odontología, los catálogos se inicializan vacíos (`[]`), se captura el fallo en `errorCatalogo` para alertar en la interfaz y se deshabilitan las sugerencias simuladas ante fallos de red o del backend.

### DEV-019 — Uso exclusivo de diagnósticos institucionales devueltos por HTTP
- **Tipo:** `FALLBACK PROHIBIDO`
- **Severidad:** `HIGH`
- **Unidad / Requisito:** `Frontend/src/features/consultations/NewConsultationWizardPage.tsx:175` vs `REQ-OD-05`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434369497`).
  - *Comportamiento detectado:* Al resolverse exitosamente `/catalogos/odontologia`, el código realizaba un merge con `CATALOGO_CIE10` local para rellenar diagnósticos ausentes (ej. `K04.7`), introduciendo diagnósticos simulados en el catálogo real.
  - *Corrección aplicada:* Se eliminó la unión con las constantes locales en modo API, asignando directamente `cat.diagnosticos` devuelto por el backend institucional HTTP sin inyecciones simuladas.

### DEV-020 — Rechazo de lectura de antecedentes en bundles sin soporte
- **Tipo:** `PERSISTENCIA / SEGURIDAD`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Backend/src/aplicacion/casos-uso/pacientes/antecedentes-clinicos.ts:77` vs `REQ-OD-03`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434381736`).
  - *Comportamiento detectado:* En instituciones sin soporte para antecedentes directos (ej. hospital general en PostgreSQL), `GET /pacientes/{id}/antecedentes` devolvía un objeto vacío simulando ausencia de antecedentes en lugar de advertir la falta de soporte.
  - *Corrección aplicada:* Se valida que `clinica.antecedentes` exista; en caso contrario, se arroja `PERSISTENCIA_NO_DISPONIBLE` con código 503 impidiendo reportar como vacíos antecedentes no soportados.

### DEV-021 — Preservación de precisión fraccionaria en rangos de revisiones SQL
- **Tipo:** `PRECISIÓN TEMPORAL`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Backend/src/adaptadores/salida/sql/mapear-clinica-sql.ts:295` vs `REQ-OD-02`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434381740`).
  - *Comportamiento detectado:* Al convertir instantes UTC para cláusulas SQL `desde` o `hasta` con más de 3 dígitos fraccionarios, `fechaDb` convertía vía `Date` truncando a milisegundos, alterando la inclusión/exclusión en los límites del rango semi-abierto.
  - *Corrección aplicada:* `fechaDb` preserva textualmente la fracción de microsegundos de la cadena ISO 8601 (hasta 6 dígitos) antes de normalizar el formato SQL `YYYY-MM-DD HH:MM:SS.ffffff`.

### DEV-022 — Supresión de pautas posológicas inventadas para medicamentos del catálogo MySQL
- **Tipo:** `INTEGRIDAD CLÍNICA`
- **Severidad:** `MEDIUM`
- **Unidad / Requisito:** `Backend/src/adaptadores/salida/mysql/clinica/crear-puertos-clinicos-mysql.ts:196` vs `REQ-OD-05`
- **Evidencia:**
  - *Identificada por:* Revisión automática Codex (`PR #67 discussion_r4434392955`).
  - *Comportamiento detectado:* El mapeador de medicamentos adicionales de la base de datos MySQL asignaba por defecto posología oral sintética (`Cada 8 horas`, `5 días`, `ORAL`, `conc || '1 unidad'`), que se autocompletaba en la prescripción sin haber sido dictaminada por un profesional clínico.
  - *Corrección aplicada:* Se eliminaron las pautas posológicas inventadas en el mapeo MySQL dejando las propiedades como opcionales; en `NewConsultationWizardPage.tsx` los campos de vía, dosis, frecuencia y duración permanecen en blanco para su llenado explícito por parte del odontólogo tratante cuando el catálogo no provea pauta institucional predefinida.

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
