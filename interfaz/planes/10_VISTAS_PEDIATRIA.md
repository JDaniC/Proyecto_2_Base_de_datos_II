# 10 — Plan de Vistas del Centro Médico Pediátrico (`P01` a `P07`)

**Fecha:** 19 de octubre de 2026  
**Institución:** Centro Médico Pediátrico (Motor objetivo en backend: Cloud Firestore — 22 rutas en esquema v2).  
**Unidades del Roadmap:** `U16` (`P01–P03`) y `U17` (`P04–P07`).

---

## 1. Mapa de las 7 entradas (`P01`–`P07`)

Conforme al Design System v1.1 (§14.2 y §14.5), las vistas pediátricas se integran de forma natural en el flujo de alta de paciente (`V05`), en las pestañas del expediente (`V06`), en el registro de consulta (`V10`) y en la administración de catálogos (`V17`).

| ID | Vista | Superficie | Ruta / Contenedor anfitrión | Roles principales |
|---|---|---|---|---|
| `P01` | Responsables del menor | `formulario` (en `V05`) + `pestaña` (en `V06`) | `/pacientes/nuevo` y `/pacientes/:pacienteId?tab=responsables` | Secretaría, Pediatra, Administrador |
| `P02` | Seguimiento de crecimiento | `formulario` (Paso 2 de `V10`) + `pestaña` (en `V06`) | `/pacientes/:pacienteId?tab=crecimiento` y flujo de consulta | Pediatra |
| `P03` | Antecedentes y alergias pediátricas | `pestaña` (en `V06`) | `/pacientes/:pacienteId?tab=antecedentes` | Pediatra y personal autorizado |
| `P04` | Catálogo de vacunas y dosis | `pestaña` (en `V17`) | `/administracion/catalogos?tab=vacunas` | Administrador, Pediatra |
| `P05` | Esquema y dosis pendientes | `pestaña` (en `V06`) | `/pacientes/:pacienteId?tab=vacunacion` | Pediatra y personal autorizado |
| `P06` | Aplicar/registrar vacuna | `formulario` / `modal` | Acción y formulario desde `P05` | Pediatra / personal autorizado |
| `P07` | Historial de vacunación | `pestaña` | Subvista cronológica en `P05` e integrada en `V07` | Pediatra y personal autorizado |

---

## 2. Reglas pediátricas obligatorias en la simulación (`CA09`–`CA11`)

### 2.1 Responsables compartidos, principalidad y autorización independiente (`P01`, `CA09`)
- **Alta del menor (`V05` + `P01`):** No se puede crear un expediente pediátrico sin vincular **al menos un responsable con `es_principal = true`**.
- **Principal ≠ Autoriza atención:** El vínculo de cada responsable con el menor (`pacientes/{pacienteId}/responsables/{responsableId}`) tiene dos booleanos independientes:
  - `es_principal: boolean` (admite varios principales; nunca se permite desmarcar o dar de baja al último responsable principal del menor).
  - `autoriza_atencion: boolean` (indica explícitamente si esa persona está facultada para autorizar consultas y vacunación).
- **Responsable compartido entre hermanos:** Los datos personales y de contacto residen en la entidad `responsables/{responsableId}`; actualizar el teléfono de una madre o padre vinculado a dos menores refleja el nuevo contacto en ambos expedientes sin alterar los permisos individuales de cada vínculo (`CA09`).
- **Requisito para iniciar consulta (`RF-P04`):** En `V10`, antes de abrir una consulta pediátrica se verifica que el menor tenga al menos un vínculo vigente con `autoriza_atencion = true` y se selecciona cuál responsable autorizó esa atención específica, guardando su instantánea histórica en la consulta.

### 2.2 Control de crecimiento único por consulta y comparación longitudinal (`P02`, `CA10`)
- Cada consulta pediátrica contiene **como máximo un objeto `control_crecimiento`** (nunca una lista dentro de la misma consulta). Intentar agregar un segundo control a la misma consulta se rechaza; si se requiere enmendar un valor, se realiza como revisión auditada de la consulta.
- Atributos capturados: `peso_kg` ($> 0$), `talla_cm` ($> 0$), `perimetro_cefalico_cm` (opcional $> 0$), `temperatura_c` y `frecuencia_cardiaca_lpm`.
- **Cálculos derivados honestos:** La interfaz calcula en tiempo real la **edad exacta en meses/años** (a partir de `fecha_nacimiento` y fecha de la consulta) y el **IMC** ($\text{peso\_kg} / (\text{talla\_m})^2$) únicamente cuando existen tanto peso como talla válidos. Si falta la talla, el IMC se muestra como «No calculable (talla no registrada)», **nunca como `0`**. No se emiten diagnósticos nutricionales automáticos.
- En la pestaña `Crecimiento` (`P02`), se presenta una tabla comparativa ordenada por fecha con variaciones entre controles sucesivos.

### 2.3 Alergias y antecedentes (`P03`)
- Distingue tres estados explícitos del expediente:
  1. `SIN_VERIFICAR`: muestra `Alert` de advertencia prioritaria en la cabecera de `V06` («Alergias pendientes de verificación clínica»).
  2. `SIN_ALERGIAS_CONOCIDAS`: verificado por un pediatra con fecha y actor.
  3. `CON_ALERGIAS_REGISTRADAS`: lista alergias activas con alérgeno, reacción, severidad (`LEVE`, `MODERADA`, `SEVERA`) y trazabilidad de revisiones.

### 2.4 Esquema de vacunación versionado, dosis pendientes y aplicación determinista (`P04–P07`, `CA11`)
- **Catálogo versionado (`P04`):** Cada vacuna tiene versiones inmutables (`vacunas/{vacunaId}/versiones/{versionId}`) con sus dosis (`dosis_id` estable, número de dosis, edad recomendada en meses).
- **Clasificación en `P05`:** Comparando la edad actual del menor con la versión de esquema asignada (`pacientes/{pacienteId}/esquemas/{vacunaId}`) y las aplicaciones vigentes:
  - `APLICADA`: Dosis ya administrada y vigente.
  - `PENDIENTE`: La edad del menor es $\ge$ `edad_recomendada_meses` y no tiene aplicación vigente.
  - `FUTURA`: La edad del menor es $<$ `edad_recomendada_meses` y aún no corresponde aplicar.
- **Prevención de doble aplicación (`P06`):** La clave lógica determinista `${pacienteId}_${vacunaId}_${dosisId}` impide registrar dos veces la misma dosis para el mismo menor (`409 DOSIS_YA_APLICADA`).
- **Historial y correcciones (`P07`):** Permite consultar todas las aplicaciones por fecha, lote, sitio anatómico y pediatra responsable, así como registrar correcciones o anulaciones con motivo conservando las versiones anteriores.
