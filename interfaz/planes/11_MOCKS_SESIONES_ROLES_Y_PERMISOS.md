# 11 — Mocks, Sesiones Sintéticas, Roles y Permisos

**Fecha:** 19 de octubre de 2026  
**Fuentes:** [`Agente/DISENO_PROYECTO.md`](../../Agente/DISENO_PROYECTO.md) (§4 y §5.3.1) y Prompt Maestro (§6 y §8).

---

## 1. Modelo de identidad y sesión en modo demostración

En producción, el cliente obtiene un ID Token de Firebase Authentication y el backend NestJS valida firma, vigencia, revocación y consulta en la base institucional el usuario vinculado al `auth_uid` para resolver institución, estado (`ACTIVO`, `PENDIENTE`, `INACTIVO`) y permisos vigentes.

En esta fase de simulación (`interfaz/app/`):
1. **No se solicitan contraseñas reales ni se conecta a Firebase real.**
2. La pantalla `V01` presenta un **catálogo explícito de cuentas sintéticas** distribuidas en las 4 instituciones, además de un formulario de prueba y un panel de simulación de condiciones de red/errores (`401`, `403`, `503`, latencia).
3. Cada cuenta sintética está **vinculada de forma fija a una sola institución**. La institución determina qué motor se usaría en el servidor (`PostgreSQL`, `MySQL`, `MongoDB` o `Cloud Firestore`), pero **la interfaz nunca expone un selector de motor** ni permite cambiar de institución dentro de una sesión activa. Para operar en otra institución es obligatorio cerrar la sesión actual en `V01`.

---

## 2. Catálogo de cuentas sintéticas preconfiguradas (`src/mocks/demoAccounts.ts`)

| ID Cuenta Demo | Institución fija | Rol principal | Profesional vinculado | Estado de cuenta | Propósito de prueba |
|---|---|---|---|---|---|
| `usr-hosp-med-01` | **Hospital General** (`HOSPITAL_GENERAL`) | Médico Especialista (`MEDICO`) | Dra. Elena Morales (Medicina Interna, Col. `CMG-10421`) | `ACTIVO` | Flujo clínico completo común + hospitalizaciones, camas, exámenes y procedimientos. |
| `usr-hosp-sec-01` | **Hospital General** (`HOSPITAL_GENERAL`) | Secretaría y Admisión (`SECRETARIA`) | Sin vínculo médico (Personal administrativo) | `ACTIVO` | Alta de pacientes, citas, camas y seguros; verifica bloqueo de lectura/escritura clínica (`CA18`). |
| `usr-hosp-adm-01` | **Hospital General** (`HOSPITAL_GENERAL`) | Administrador Institucional (`ADMIN_INSTITUCIONAL`) | Sin vínculo médico | `ACTIVO` | Usuarios, roles, catálogos (`H08`), auditoría (`V18`) y archivo de expedientes (`V14`). |
| `usr-odon-odo-01` | **Clínica Odontológica** (`CLINICA_ODONTOLOGica`) | Odontólogo General (`ODONTOLOGO`) | Dr. Javier Castellanos (Col. `COG-4812`) | `ACTIVO` | Agenda odontológica, atención de citas `PROGRAMADA → ATENDIDA`, diagnósticos y recetas (`C01–C04`). |
| `usr-odon-sec-01` | **Clínica Odontológica** (`CLINICA_ODONTOLOGICA`) | Secretaría Odontológica (`SECRETARIA`) | Secretaría Ana Lucía Méndez (`sec-01`) | `ACTIVO` | Gestión de agenda odontológica (`C01`, `C02`) y alta de pacientes sin acceso a notas clínicas (`CA18`). |
| `usr-lab-ana-01` | **Laboratorio Clínico** (`LABORATORIO_CLINICO`) | Analista de Laboratorio (`ANALISTA_LABORATORIO`) | Licda. Sofía Paniagua (Química Bióloga) | `ACTIVO` | Bandeja, muestras y captura de resultados en `BORRADOR` (`L01–L06`, `L11`, `L12`); **no puede validar (`L07`) ni recetar** (`CA13`, `CA18`). |
| `usr-lab-val-01` | **Laboratorio Clínico** (`LABORATORIO_CLINICO`) | Validador y Supervisor (`VALIDADOR_LABORATORIO`) | MSc. Carlos Batres (Jefe de Laboratorio) | `ACTIVO` | Revisión/validación de resultados (`L07`), versiones (`L08`), emisión de informes (`L09`) y cobros (`L13`). |
| `usr-lab-med-01` | **Laboratorio Clínico** (`LABORATORIO_CLINICO`) | Médico Responsable en Laboratorio (`MEDICO_LABORATORIO`) | Dr. Arturo Valenzuela (Solicitante individual `sol-med-01`) | `ACTIVO` | Demuestra la ampliación del núcleo común en MongoDB (`RF-L13`, `RF-L14`): citas, consultas clínicas y recetas en laboratorio. |
| `usr-ped-ped-01` | **Centro Médico Pediátrico** (`CENTRO_PEDIATRICO`) | Pediatra (`PEDIATRA`) | Dra. Gabriela Quintana (Col. `CMG-15890`) | `ACTIVO` | Consultas pediátricas con verificación de autorización de responsable, control de crecimiento y vacunación (`P01–P07`). |
| `usr-ped-sec-01` | **Centro Médico Pediátrico** (`CENTRO_PEDIATRICO`) | Secretaría Pediátrica (`SECRETARIA`) | Sin vínculo médico | `ACTIVO` | Alta de menores con responsables principales/autorizados (`P01`) y agenda pediátrica. |
| `usr-hosp-ina-01` | **Hospital General** (`HOSPITAL_GENERAL`) | Médico (`MEDICO`) | Dr. Mateo Solares | `INACTIVO` | Prueba el rechazo `403 CUENTA_NO_HABILITADA` en `V01`/`V02` (`CA02`). |
| `usr-lab-pen-01` | **Laboratorio Clínico** (`LABORATORIO_CLINICO`) | Analista (`ANALISTA_LABORATORIO`) | Lic. Diego Arévalo | `PENDIENTE` | Prueba el bloqueo de cuenta pendiente de activación (`403 CUENTA_NO_HABILITADA`) (`CA02`). |

---

## 3. Matriz de permisos independientes (`DISENO_PROYECTO.md` §4)

Los componentes y guards no verifican nombres de rol de forma rígida cuando se trata de operaciones clínicas o administrativas, sino la lista de **permisos efectivos** cargados en la sesión de la cuenta:

| Permiso canónico | Admin Inst. | Médico / Odontólogo / Pediatra | Médico Lab Vinculado | Secretaría | Analista Lab | Validador Lab | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `pacientes.administrar` | Sí | Sí | Sí | **Sí** | Lectura/Búsqueda | Lectura/Búsqueda | No |
| `historial.leer` | No* | **Sí** | **Sí** | **No** (solo perfil admin) | No | No | Sí (lectura auditada) |
| `historial.archivar` | **Sí** | No | No | No | No | No | No |
| `citas.administrar` | Sí | Sí | Sí | **Sí** | No | No | No |
| `consultas.registrar` | No | **Sí** | **Sí** | No | No | No | No |
| `diagnosticos.registrar` | No | **Sí** | **Sí** | No | **No** | **No** | No |
| `tratamientos.registrar` | No | **Sí** | **Sí** | No | No | No | No |
| `recetas.emitir` | No | **Sí** | **Sí** | No | **No** | **No** | No |
| `resultados.analizar` | No | Sí (H06) | No | No | **Sí** | Sí | No |
| `resultados.validar` | No | No | No | No | **No** | **Sí** | No |
| `informes.emitir` | No | No | No | No | **No** | **Sí** | No |
| `cobros.administrar` | Sí (Lab) | No | No | Sí (Lab) | No | Sí (Lab) | No |
| `inventario.administrar` | Sí (Lab) | No | No | No | Sí (Lab) | Sí (Lab) | No |
| `usuarios.administrar` | **Sí** | No | No | No | No | No | No |
| `auditoria.leer` | **Sí** | No | No | No | No | No | **Sí** |

*\*Nota:* Conforme a `DISENO_PROYECTO.md` §4, «Administración de usuarios no concede acceso clínico automáticamente».

---

## 4. Reglas de privacidad y datos sintéticos

- Todos los nombres, códigos de paciente (`HC-HOSP-0101`), documentos de identificación ficticios (`9900-00001-0101` con prefijo `99` reservado para pruebas) y números de colegiado son **100% sintéticos**.
- Los errores simulados generan un identificador de correlación (`corr-20261019-...`) y nunca incluyen diagnósticos, CUI ni nombres de tablas o colecciones en el mensaje técnico.
