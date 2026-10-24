# 07 — Plan de Vistas del Hospital General (`H01` a `H08`)

**Fecha:** 19 de octubre de 2026  
**Institución:** Hospital General (Motor objetivo en backend: PostgreSQL — 50 tablas en esquema v2).  
**Unidades del Roadmap:** `U09` (`H01–H04`) y `U10` (`H05–H08`).

---

## 1. Mapa de superficies del Hospital General

| ID | Vista | Superficie | Ruta / Anfitrión | Permisos requeridos |
|---|---|---|---|---|
| `H01` | Lista de hospitalizaciones | `ruta` | `/hospital/hospitalizaciones` | `historial.leer` / personal clínico y admisión |
| `H02` | Ingreso y detalle de hospitalización | `ruta` + `formulario` | `/hospital/hospitalizaciones/nueva` y `/hospital/hospitalizaciones/:ingresoId` | `consultas.registrar` / admisión autorizada |
| `H03` | Habitaciones, camas y ocupación | `ruta` | `/hospital/camas` | Admisión, Médico, Administrador |
| `H04` | Asignar o liberar cama | `formulario` / `modal` | Acción dentro de `H02` y `H03` | Admisión autorizada |
| `H05` | Seguros y cobertura del paciente | `pestaña` | `/pacientes/:pacienteId?tab=seguros` (`V06`) + catálogo en `V17` | `pacientes.administrar` / `historial.leer` |
| `H06` | Orden de examen y resultados | `ruta` + `pestaña` | `/hospital/examenes` y `/pacientes/:pacienteId?tab=examenes` | `consultas.registrar` / `resultados.analizar` |
| `H07` | Procedimientos realizados | `pestaña` / `formulario` | Detalle de consulta (`V11`) y de hospitalización (`H02`) | `tratamientos.registrar` |
| `H08` | Personal médico y especialidades | `pestaña` | `/administracion/catalogos?tab=personal-medico` (`V17`) | `usuarios.administrar` |

---

## 2. Flujos y reglas de negocio simuladas (`CA17`)

### 2.1 Hospitalizaciones y gestión de camas (`H01`, `H02`, `H03`, `H04`)
- **Ingreso hospitalario (`H02`):**
  - Requiere un paciente con expediente `ACTIVO` en el Hospital General y un médico responsable activo (`H08`).
  - Permite enlazar consultas (`Hospitalizacion_Consulta`) y diagnósticos (`Hospitalizacion_Diagnostico`) **únicamente si pertenecen al mismo paciente**; cualquier intento de vincular un recurso de otro paciente se rechaza con `409 REFERENCIA_INCOMPATIBLE` (`CA17`).
  - Estados de hospitalización: `ACTIVA` → `EGRESADA` (con fecha/hora de egreso y resumen) o `CANCELADA` (con motivo).
- **Habitaciones, camas y exclusión de solapamientos (`H03`, `H04`):**
  - Cada habitación agrupa camas con número y estado operativo (`DISPONIBLE`, `OCUPADA`, `MANTENIMIENTO`).
  - Asignar cama (`Asignacion_Cama`) registra `fecha_hora_inicio` y opcionalmente `fecha_hora_fin` usando semántica de intervalo semiabierto `[inicio, fin)`.
  - **Invariante verificable (`CA17`):** El repositorio valida que:
    1. La misma cama no tenga otra asignación superpuesta en `[inicio, fin)`.
    2. La misma hospitalización no tenga dos camas activas superpuestas en el mismo intervalo.
    3. Se permitan traslados contiguos donde `fin_asignacion_anterior === inicio_nueva_asignacion`.
    4. `fecha_hora_fin > fecha_hora_inicio`.

### 2.2 Seguros y cobertura (`H05`)
- Dentro del expediente `V06` (pestaña `Seguros`), muestra las pólizas afiliadas al paciente (`Paciente_Poliza`), el titular (`Titular_Seguro`), el plan (`Plan_Seguro`) y la aseguradora (`Aseguradora`), indicando vigencia (`ACTIVA` / `VENCIDA`) y cobertura porcentual o límite.
- El catálogo maestro de aseguradoras y planes se administra en una pestaña de `V17`.

### 2.3 Órdenes de examen hospitalario y resultados (`H06`)
- Permite emitir desde una consulta o hospitalización una `Orden_Examen` con uno o varios exámenes del catálogo (`Detalle_Orden_Examen`).
- Los resultados (`Resultado_Examen` y `Resultado_Detalle`) muestran cada parámetro (`Parametro_Examen`), su valor medido, unidad de medida y rango de referencia, sin utilizar verde/rojo aislados sin texto descriptivo.

### 2.4 Procedimientos realizados (`H07`) y Personal médico (`H08`)
- `H07`: Registra procedimientos clínicos o quirúrgicos asociados a la atención (`Procedimiento_Realizado`), con profesional ejecutor, fecha/hora, resultado y observaciones.
- `H08`: Pestaña en `V17` para dar de alta y mantener médicos, número de colegiado único y asignación de especialidades (`Especialidad` / `Personal_Especialidad`).
