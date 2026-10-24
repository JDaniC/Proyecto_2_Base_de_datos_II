# 08 — Plan de Vistas de la Clínica Odontológica (`C01` a `C05`)

**Fecha:** 19 de octubre de 2026  
**Institución:** Clínica Odontológica (Motor objetivo en backend: MySQL — 22 tablas en esquema v2).  
**Unidad del Roadmap:** `U11` (`C01–C05`).

> **Restricción expresa de alcance:** **No se incluye odontograma.** Ni el levantamiento de Entrega I ni `DISENO_PROYECTO.md` (§8.3) ni el Design System v1.1 lo comprometen. Toda la atención odontológica se gestiona mediante antecedentes, consulta estructurada, catálogos de diagnósticos/tratamientos y receta.

---

## 1. Mapa de superficies de la Clínica Odontológica

Siguiendo la auditoría de la sección 14.2 del Design System v1.1, las entradas `C01–C05` **no duplican rutas ni páginas del menú lateral**, sino que especializan las vistas comunes `V08`, `V09`, `V10`, `V11–V13` y `V17` cuando la sesión activa pertenece a la Clínica Odontológica.

| ID | Vista original | Superficie adoptada | Ruta / Contenedor anfitrión | Roles principales |
|---|---|---|---|---|
| `C01` | Agenda de secretaría | Variante institucional de `V08` | `/agenda` | Secretaría, Odontólogo |
| `C02` | Detalle de cita odontológica | Panel de detalle y formulario en `V08`/`V09` | `/agenda` (panel lateral de cita seleccionada) | Secretaría, Odontólogo |
| `C03` | Consulta odontológica | Variante institucional de `V10` | `/pacientes/:pacienteId/consultas/nueva` | Odontólogo |
| `C04` | Diagnósticos, tratamientos y receta odontológica | Pasos 3–4 de `C03` y subvista en `V11` | `/pacientes/:pacienteId/consultas/:consultaId` | Odontólogo |
| `C05` | Catálogos odontológicos | Pestaña en `V17` | `/administracion/catalogos?tab=odontologia` | Administrador institucional, Odontólogo (lectura) |

---

## 2. Reglas de negocio odontológicas (`CA06`, `CA18`)

1. **Vínculo de secretaría gestora en citas (`C01`, `C02`):**
   - Toda cita odontológica registra el paciente (`id_paciente`), el odontólogo asignado (`id_odontologo`) y la **secretaria que gestiona la cita** (`id_secretaria`).
   - Cuando una cuenta con rol Secretaría crea o reprograma una cita en `C01`, su vínculo `id_secretaria` queda asociado automáticamente.
2. **Transición atómica Cita → Consulta (`C02`, `C03`, `CA06`):**
   - Una cita en estado `CANCELADA` **no permite** iniciar consulta odontológica (`409 ESTADO_INVALIDO`).
   - Una cita `ATENDIDA` ya vinculada a una consulta no admite crear una segunda consulta (`409 CITA_YA_ATENDIDA`).
   - Al registrar la consulta desde una cita `PROGRAMADA`, el sistema verifica que el paciente, el historial odontológico y el odontólogo autenticado coincidan, y marca la cita como `ATENDIDA` en la misma operación simulada.
3. **Diagnósticos, tratamientos y receta única por consulta (`C04`):**
   - Los diagnósticos (`Consulta_Diagnostico`) y tratamientos (`Consulta_Tratamiento`) se seleccionan de los catálogos odontológicos (`C05`).
   - Mientras la consulta está `ABIERTA` se pueden preparar diagnósticos; al finalizar se exige que exista **exactamente un diagnóstico principal** cuando la consulta tiene diagnósticos (`Database/README.md` §Garantías).
   - Se emite como máximo una receta lógica por consulta (`Receta` + `Detalle_Receta`) con instantánea histórica de medicamentos, dosis, frecuencia, duración, vía e indicaciones.
4. **Aislamiento de rol Secretaría (`RF-C08`, `CA18`):**
   - La cuenta de Secretaría puede administrar pacientes (`V04`, `V05`), ver datos administrativos de `V06` y gestionar la agenda (`C01`, `C02`), pero **no ve ni puede editar** antecedentes clínicos detallados, notas de consulta (`C03`), diagnósticos ni recetas (`C04`).
