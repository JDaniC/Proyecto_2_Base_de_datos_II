# 03 — Mapa Maestro de las 53 Entradas del Catálogo Funcional

**Fecha:** 19 de octubre de 2026  
**Fuentes contrastadas:** [`Agente/DISENO_PROYECTO.md`](../../Agente/DISENO_PROYECTO.md) (§8.1–8.5) y [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md) (§14.2 y §14.5).

> **Verificación de integridad:** Este catálogo contiene **exactamente las 53 entradas** (`19 comunes + 8 hospital + 5 odontología + 14 laboratorio + 7 pediatría = 53`). Cada ID aparece una sola vez con su tipo de superficie (`ruta`, `pestaña`, `modal`, `formulario`, `flujo` o `estado`), su contenedor o ruta anfitriona, su unidad del roadmap y su estado real de implementación.

---

## 1. Resumen cuantitativo de superficies

| Categoría | Total IDs | Rutas propias (`ruta`) | Subvistas/Pestañas (`pestaña`) | Formularios/Modales/Flujos (`formulario` / `modal` / `flujo`) | Estados transversales (`estado`) |
|---|---:|---:|---:|---:|---:|
| **Comunes (`V01–V19`)** | **19** | 9 | 3 | 5 | 2 |
| **Hospital General (`H01–H08`)** | **8** | 4 | 3 | 1 | 0 |
| **Clínica Odontológica (`C01–C05`)** | **5** | 0 (reutiliza rutas comunes con variante institucional) | 3 | 2 | 0 |
| **Laboratorio Clínico (`L01–L14`)** | **14** | 8 | 3 | 3 | 0 |
| **Centro Pediátrico (`P01–P07`)** | **7** | 0 (integradas en expediente, alta, consulta y catálogos) | 5 | 2 | 0 |
| **TOTAL** | **53** | **21** | **17** | **13** | **2** |

---

## 2. Vistas Comunes (`V01` a `V19`) — 19 entradas

| ID | Nombre canónico (`DISENO_PROYECTO.md` §8.1) | Tipo de superficie | Ruta / Contenedor anfitrión | Roles principales | Unidad Roadmap | Dependencias | Criterio clave de aceptación | Estado actual |
|---|---|---|---|---|---|---|---|---|
| `V01` | Inicio de sesión | `ruta` | `/acceso` | Todos | `U01` | Tokens DS v1.1 | Selección explícita de cuenta sintética vinculada a 1 institución; aviso demo; simulación 401/403/503; bloqueo doble envío; sin selector de motor. | `PENDIENTE` |
| `V02` | Acceso restringido / cuenta inactiva | `estado` / `ruta` | `/acceso-restringido` y guard de ruta | Todos | `U02` | `U01` | Distingue `401 NO_AUTENTICADO` de `403 CUENTA_NO_HABILITADA` / `403 SIN_PERMISO` sin filtrar datos clínicos; permite volver o cerrar sesión. | `PENDIENTE` |
| `V03` | Panel inicial | `ruta` | `/panel` | Todos (según rol) | `U03` | `U02` | **Pantalla 01 aprobada:** métricas sin tarjetas individuales, panel sutil de citas («Hoy / Próximas»), actividad reciente y atajos filtrados por rol/institución. | `PENDIENTE` |
| `V04` | Búsqueda y listado de pacientes | `ruta` | `/pacientes` | Médico, Secretaría, Lab (según permiso) | `U04` | `U03` | **Pantalla 02 aprobada:** buscador `#EDF5F1`, filtros desplegables, tabla sin tarjetas por fila, cursor/paginación reconciliada (`DEC-01`/`DEC-02`). | `PENDIENTE` |
| `V05` | Registro/edición administrativa de paciente | `formulario` / `flujo` | `/pacientes/nuevo` y `/pacientes/:pacienteId/editar` | Secretaría, Admin, personal autorizado | `U04` | `V04` | Valida campos obligatorios, previene duplicados (`409 PACIENTE_DUPLICADO`), exige responsable principal en Pediatría (`P01`). | `PENDIENTE` |
| `V06` | Perfil del paciente | `ruta` | `/pacientes/:pacienteId` | Según permiso (`historial.leer` o administrativo) | `U05` | `U04` | **Pantalla 03 aprobada:** cabecera con UUID/código y estado, alerta de alergias sin verificar, Tabs con subrayado de 3 px; separa vista administrativa vs clínica. | `PENDIENTE` |
| `V07` | Historial clínico cronológico | `pestaña` | `/pacientes/:pacienteId?tab=historial` (dentro de `V06`) | Personal clínico autorizado | `U05` | `V06` | Componente `Clinical Timeline` (25), filtros por tipo de evento y rango `[desde, hasta)`, orden estable y apertura múltiple de detalles (`DEC-03`). | `PENDIENTE` |
| `V08` | Agenda de citas | `ruta` | `/agenda` | Secretaría y profesionales | `U06` | `U04` | **Pantalla 05 aprobada:** navegación semanal, vista diaria/semanal (no mensual), filtros por estado (`PROGRAMADA`/`ATENDIDA`/`CANCELADA`, `DEC-04`), filas sin tarjetas. | `PENDIENTE` |
| `V09` | Crear/editar cita | `formulario` / `modal` | Drawer/panel en `/agenda` (`V08`) | Secretaría y roles con `citas.administrar` | `U06` | `V08` | Hora en 24 h (intervalos 15 min); reprogramación solo en `PROGRAMADA` conservando fecha previa; cancelación exige motivo obligatorio. | `PENDIENTE` |
| `V10` | Registro de consulta | `ruta` (`flujo` 4 pasos) | `/pacientes/:pacienteId/consultas/nueva` | Médico, Odontólogo, Pediatra, Médico Lab vinculado | `U07` | `U05`, `U06` | **Pantalla 04 aprobada:** Stepper de 4 pasos + revisión final; Textarea 120 px; signos vitales vacíos ≠ 0; profesional derivado de la sesión. | `PENDIENTE` |
| `V11` | Detalle de consulta | `pestaña` / `ruta` | `/pacientes/:pacienteId/consultas/:consultaId` | Profesional autorizado | `U07` | `V10` | Muestra estado (`ABIERTA`/`FINALIZADA`), signos/mediciones, diagnósticos, tratamientos, receta e historial de revisiones con actor/fecha/motivo. | `PENDIENTE` |
| `V12` | Diagnósticos y tratamientos | `formulario` / `pestaña` | Paso 3 de `V10`, sección de `V11` y tab de `V06` | Profesional autorizado | `U07` | `V10` | Permite múltiples diagnósticos y tratamientos; exige exactamente un diagnóstico principal cuando existen diagnósticos; vincula con catálogo institucional. | `PENDIENTE` |
| `V13` | Crear/ver receta | `formulario` / `pestaña` | Paso 4 de `V10`, sección de `V11` y tab de `V06` | Profesional con `recetas.emitir` | `U07` | `V10` | Soporta múltiples medicamentos con presentación, concentración, dosis, frecuencia, duración, vía e indicaciones; instantánea inmutable y corrección versionada. | `PENDIENTE` |
| `V14` | Archivo/reactivación de historial | `modal` | Diálogo de confirmación en `V06` y acción secundaria en `V04` | Rol con `historial.archivar` | `U05` | `V06` | Exige causa (`TRASLADO`, `FALLECIMIENTO`, `OTRA_ADMINISTRATIVA`), motivo escrito y versión; bloquea nuevas atenciones mientras esté `ARCHIVADO`. | `PENDIENTE` |
| `V15` | Administración de usuarios | `ruta` | `/administracion/usuarios` | Administrador institucional (`usuarios.administrar`) | `U08` | `U03` | Provisión de cuenta (`PENDIENTE → ACTIVO → INACTIVO`), vínculo con UID externo y vínculo opcional a profesional de la institución. | `PENDIENTE` |
| `V16` | Administración de roles y permisos | `pestaña` | `/administracion/usuarios?tab=roles` | Administrador institucional | `U08` | `V15` | Consulta y asignación de permisos efectivos dentro del alcance de la institución activa. | `PENDIENTE` |
| `V17` | Catálogos institucionales | `ruta` (con pestañas) | `/administracion/catalogos` | Administrador / roles autorizados | `U08` | `U03` | Anfitrión unificado con pestañas según institución (`H08`, `C05`, `L10`, `P04`, diagnósticos, medicamentos). | `PENDIENTE` |
| `V18` | Búsqueda de auditoría | `ruta` | `/administracion/auditoria` | Administrador / Auditor (`auditoria.leer`) | `U08` | `U03` | Filtros por actor, acción, recurso y fecha; detalle de versión/motivo sin exponer secretos. | `PENDIENTE` |
| `V19` | Estados de carga, error y sin resultados | `estado` | Componentes transversales en todas las vistas | Todos | `U02` | `U01` | Skeleton `#E7EFEC`/`#F0F5F3`, Progress Bar `#20666B`, Empty/Error States diferenciados («sin registros» ≠ «sin resultados» ≠ «error con correlación y reintento»). | `PENDIENTE` |

---

## 3. Vistas del Hospital General (`H01` a `H08`) — 8 entradas

| ID | Nombre canónico (`DISENO_PROYECTO.md` §8.2) | Tipo de superficie | Ruta / Contenedor anfitrión | Roles principales | Unidad Roadmap | Dependencias | Criterio clave de aceptación | Estado actual |
|---|---|---|---|---|---|---|---|---|
| `H01` | Lista de hospitalizaciones | `ruta` | `/hospital/hospitalizaciones` | Médico, Admisión, Admin | `U09` | `U05` | Tabla sin tarjetas de ingresos activos e históricos con filtros por estado, fecha y médico responsable. | `PENDIENTE` |
| `H02` | Ingreso y detalle de hospitalización | `ruta` + `formulario` | `/hospital/hospitalizaciones/:ingresoId` y `/nueva` | Médico, Admisión | `U09` | `H01`, `V06` | Valida pertenencia de consultas y diagnósticos al mismo paciente; registra ingreso, evolución y egreso. | `PENDIENTE` |
| `H03` | Habitaciones, camas y ocupación | `ruta` | `/hospital/camas` | Admisión, Médico, Admin | `U09` | `H01` | Estado operativo (`DISPONIBLE`, `OCUPADA`, `MANTENIMIENTO`), ocupación vigente e historial por cama/habitación. | `PENDIENTE` |
| `H04` | Asignar o liberar cama | `formulario` / `modal` | Acción en `H02` y `H03` | Admisión autorizada | `U09` | `H02`, `H03` | Valida intervalo `[inicio, fin)` y rechaza cualquier solapamiento de cama o de hospitalización (`CA17`). | `PENDIENTE` |
| `H05` | Seguros y cobertura del paciente | `pestaña` | `/pacientes/:pacienteId?tab=seguros` (`V06`) y catálogo en `V17` | Secretaría, Admisión, Admin | `U10` | `V06`, `V17` | Gestiona aseguradora, plan, titular, póliza, vigencia y afiliación del paciente. | `PENDIENTE` |
| `H06` | Orden de examen y resultados | `ruta` + `pestaña` | `/hospital/examenes` y `/pacientes/:pacienteId?tab=examenes` | Médico y personal autorizado | `U10` | `V06`, `V10` | Distingue solicitud/orden de examen y resultados con parámetros, valores y unidades de referencia. | `PENDIENTE` |
| `H07` | Procedimientos realizados | `pestaña` / `formulario` | Subvista en `V11` y `H02` (`/pacientes/:pacienteId?tab=procedimientos`) | Médico autorizado | `U10` | `V11`, `H02` | Registra procedimiento del catálogo, médico responsable, fecha, resultado y observaciones. | `PENDIENTE` |
| `H08` | Personal médico y especialidades | `pestaña` | `/administracion/catalogos?tab=personal-medico` (`V17`) | Administrador institucional | `U10` | `V17` | Mantenimiento de médicos, colegiado único, especialidades (`Personal_Especialidad`) y estado activo/inactivo. | `PENDIENTE` |

---

## 4. Vistas de la Clínica Odontológica (`C01` a `C05`) — 5 entradas

| ID | Nombre canónico (`DISENO_PROYECTO.md` §8.3) | Tipo de superficie | Ruta / Contenedor anfitrión | Roles principales | Unidad Roadmap | Dependencias | Criterio clave de aceptación | Estado actual |
|---|---|---|---|---|---|---|---|---|
| `C01` | Agenda de secretaría | `flujo` (variante `V08`) | `/agenda` (en sesión de Clínica Odontológica) | Secretaría, Odontólogo | `U11` | `U06` | Reutiliza `V08` mostrando odontólogo asignado, secretaria gestora y acciones de programación/reprogramación/cancelación. | `PENDIENTE` |
| `C02` | Detalle de cita odontológica | `pestaña` / `formulario` | Panel lateral de detalle en `/agenda` (`V08`/`V09`) | Secretaría, Odontólogo | `U11` | `C01` | Muestra paciente, odontólogo, secretaria gestora, motivo, estado y botón «Iniciar consulta odontológica» solo si está `PROGRAMADA`. | `PENDIENTE` |
| `C03` | Consulta odontológica | `flujo` (variante `V10`) | `/pacientes/:pacienteId/consultas/nueva` (Odontología) | Odontólogo | `U11` | `U07`, `C02` | Reutiliza el Stepper de 4 pasos (`V10`); verifica correspondencia paciente-historial-odontólogo; impide consulta desde cita `CANCELADA` (`CA06`). **Sin odontograma.** | `PENDIENTE` |
| `C04` | Diagnósticos, tratamientos y receta odontológica | `pestaña` (variante `V11–V13`) | Pasos 3–4 de `C03` y detalle en `V11` | Odontólogo | `U11` | `C03` | Selección desde catálogos odontológicos, diagnóstico principal y receta única por consulta con medicamentos e instantánea histórica. | `PENDIENTE` |
| `C05` | Catálogos odontológicos | `pestaña` | `/administracion/catalogos?tab=odontologia` (`V17`) | Administrador, Odontólogo (lectura) | `U11` | `U08` | Administra diagnósticos odontológicos, tratamientos, medicamentos, odontólogos (colegiado único) y secretarías. **Sin odontograma.** | `PENDIENTE` |

---

## 5. Vistas del Laboratorio Clínico (`L01` a `L14`) — 14 entradas

| ID | Nombre canónico (`DISENO_PROYECTO.md` §8.4) | Tipo de superficie | Ruta / Contenedor anfitrión | Roles principales | Unidad Roadmap | Dependencias | Criterio clave de aceptación | Estado actual |
|---|---|---|---|---|---|---|---|---|
| `L01` | Bandeja de trabajo | `ruta` | `/laboratorio/bandeja` | Recepción, Analista, Validador | `U12` | `U04` | Lista órdenes y muestras pendientes por estado (`CREADA`, `EN_PROCESO`, `COMPLETADA`, `CANCELADA`), prioridad y fecha. | `PENDIENTE` |
| `L02` | Crear/editar orden | `ruta` / `formulario` | `/laboratorio/ordenes/nueva` | Recepción / personal autorizado | `U12` | `L01`, `V04` | Selecciona paciente activo, solicitante, pruebas vigentes (fija versión y precio acordado), prioridad e indicaciones. | `PENDIENTE` |
| `L03` | Detalle y seguimiento de orden | `ruta` | `/laboratorio/ordenes/:ordenId` | Personal de laboratorio autorizado | `U12` | `L01`, `L02` | Muestra ítems de la orden, estado de muestras, resultados por ítem, informes emitidos y estado de facturación. | `PENDIENTE` |
| `L04` | Registro y recepción de muestras | `ruta` / `formulario` | `/laboratorio/muestras` y acción desde `L03` | Recepción / Toma de muestra / Analista | `U12` | `L03` | Genera código único, registra `TOMADA → RECIBIDA → ACEPTADA → PROCESADA` o `RECHAZADA` con motivo; retoma crea nueva muestra (`CA12`). | `PENDIENTE` |
| `L05` | Trazabilidad de muestra | `pestaña` | Subvista dentro de `L03` y `L04` | Personal de laboratorio | `U12` | `L04` | Línea de tiempo append-only de eventos y rectificaciones (campo, valor anterior/nuevo, actor, fecha y motivo). | `PENDIENTE` |
| `L06` | Captura de resultados | `ruta` / `formulario` | `/laboratorio/resultados/captura/:ordenId` | Analista (`resultados.analizar`) | `U13` | `L03`, `L04` | Formulario dinámico según `parametros[]` de la versión de prueba; exige muestra `ACEPTADA`/`PROCESADA` del mismo paciente; guarda en `BORRADOR`. | `PENDIENTE` |
| `L07` | Revisión y validación de resultados | `ruta` / `flujo` | `/laboratorio/resultados/validacion` | Validador autorizado (`resultados.validar`) | `U13` | `L06` | Separado de captura: analista sin permiso no puede validar ni por URL directa (`CA13`, `CA18`); pasa de `BORRADOR` a `VALIDADO`. | `PENDIENTE` |
| `L08` | Corrección/repetición y versiones | `pestaña` / `modal` | Subvista y flujo en `L06`/`L07` | Analista / Validador | `U13` | `L06`, `L07` | Distingue corrección de resultado validado (nueva versión en la misma serie) de repetición de análisis (nueva serie) (`CA12`). | `PENDIENTE` |
| `L09` | Vista previa y emisión de informe | `ruta` / `pestaña` | `/laboratorio/informes/:ordenId` (y tab en `L03`) | Validador / rol con `informes.emitir` | `U13` | `L07` | Solo emite (`BORRADOR → EMITIDO`) cuando los resultados incluidos están `VALIDADO`; conserva versiones exactas y hash simulado (`CA13`). | `PENDIENTE` |
| `L10` | Catálogo de laboratorio | `pestaña` | `/administracion/catalogos?tab=laboratorio` (`V17`) | Administrador de laboratorio | `U14` | `U08` | Tipos de muestra, métodos, pruebas y parámetros versionados; editar prueba usada crea nueva versión; desactivar impide órdenes nuevas (`CA16`). | `PENDIENTE` |
| `L11` | Equipos y control de calidad | `ruta` | `/laboratorio/calidad` (y equipos en `V17`) | Analista / Administrador | `U14` | `L10` | Registro y consulta de controles de calidad con mediciones, límites históricos aplicados, equipo, versión de prueba y evaluación. | `PENDIENTE` |
| `L12` | Reactivos, lotes e inventario | `ruta` | `/laboratorio/inventario` | Inventario / Analista (`inventario.administrar`) | `U15` | `U08` | Movimientos (`ENTRADA`, `CONSUMO`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `BAJA`), saldo derivado, bloqueo de lote vencido o saldo negativo (`CA15`). | `PENDIENTE` |
| `L13` | Facturas y pagos | `ruta` | `/laboratorio/cobros` | Caja / Admin (`cobros.administrar`) | `U15` | `L03` | Emisión de factura en unidades enteras, pagos idempotentes, reversiones antes de anular y bloqueo de sobrepago (`CA14`). | `PENDIENTE` |
| `L14` | Personal y permisos de laboratorio | `pestaña` | `/administracion/usuarios?tab=personal-laboratorio` (`V15`/`V16`) | Administrador institucional | `U14` | `U08` | Vincula usuarios a personal de laboratorio (analista/validador) o a solicitante médico individual autorizado para núcleo común. | `PENDIENTE` |

---

## 6. Vistas del Centro Médico Pediátrico (`P01` a `P07`) — 7 entradas

| ID | Nombre canónico (`DISENO_PROYECTO.md` §8.5) | Tipo de superficie | Ruta / Contenedor anfitrión | Roles principales | Unidad Roadmap | Dependencias | Criterio clave de aceptación | Estado actual |
|---|---|---|---|---|---|---|---|---|
| `P01` | Responsables del menor | `formulario` + `pestaña` | Paso obligatorio en `V05` y tab `/pacientes/:pacienteId?tab=responsables` (`V06`) | Secretaría, Pediatra, Admin | `U16` | `U04`, `U05` | Exige $\ge 1$ responsable con `es_principal = true`; separa `autoriza_atencion`; contacto compartido entre hermanos; impide dejar sin principal (`CA09`). | `PENDIENTE` |
| `P02` | Seguimiento de crecimiento | `pestaña` + `formulario` | Paso 2 de `V10` y tab `/pacientes/:pacienteId?tab=crecimiento` (`V06`) | Pediatra | `U16` | `U05`, `U07` | Máximo un `control_crecimiento` por consulta; calcula edad e IMC si hay peso y talla válidos; comparación longitudinal sin diagnóstico automático (`CA10`). | `PENDIENTE` |
| `P03` | Antecedentes y alergias pediátricas | `pestaña` | `/pacientes/:pacienteId?tab=antecedentes` (`V06`) | Pediatra y personal autorizado | `U16` | `U05` | Alergia sin verificar se muestra como alerta prioritaria (nunca como «sin alergias»); edición con historial de revisiones. | `PENDIENTE` |
| `P04` | Catálogo de vacunas y dosis | `pestaña` | `/administracion/catalogos?tab=vacunas` (`V17`) | Administrador, Pediatra | `U17` | `U08` | Vacunas con versiones inmutables de esquema, lista de dosis (`dosis_id` estable), número de dosis y edad recomendada en meses. | `PENDIENTE` |
| `P05` | Esquema y dosis pendientes | `pestaña` | `/pacientes/:pacienteId?tab=vacunacion` (`V06`) | Pediatra y personal autorizado | `U17` | `U05`, `P04` | Clasifica cada dosis del esquema asignado al menor en `FUTURA` (programada), `PENDIENTE` (debida por edad) o `APLICADA` (cumplida) (`CA11`). | `PENDIENTE` |
| `P06` | Aplicar/registrar vacuna | `formulario` / `modal` | Acción y formulario desde `P05` | Pediatra / personal autorizado | `U17` | `P05` | Registra vacuna, dosis, fecha, lote, sitio, pediatra y observaciones; clave determinista `paciente_vacuna_dosis` impide doble aplicación lógica (`CA11`). | `PENDIENTE` |
| `P07` | Historial de vacunación | `pestaña` | Sección cronológica en `P05` e integrada en `V07` | Pediatra y personal autorizado | `U17` | `P05`, `P06` | Lista aplicaciones cronológicas y permite consultar o registrar corrección/anulación versionada con motivo y actor. | `PENDIENTE` |
