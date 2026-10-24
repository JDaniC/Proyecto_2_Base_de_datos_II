# Clínica Odontológica - MySQL

Fuente: **Primera Entrega Proyecto (2).pdf**, páginas 17-20. Script: [clinica_odontologica_mysql.sql](clinica_odontologica_mysql.sql). Base de datos: `clinica_odontologica`.

El documento define **14 entidades convertidas en tablas**. El script actual agrega ocho tablas de acceso, auditoría y soporte: **22 tablas en total**. La secretaria administra la agenda y el odontólogo registra la atención clínica.

## 1. Entidades, tablas y atributos

**PK** = llave primaria; **FK** = llave foránea; **UQ** = valor único. Las PK de las tablas intermedias son compuestas. Los nombres están en minúsculas como en el script; `teléfono` se normaliza a `telefono`.

| Entidad / tabla | Atributos del documento |
|---|---|
| `paciente` | `id_paciente` (PK), `nombres`, `apellidos`, `fecha_nacimiento`, `telefono`, `correo`, `estado` |
| `secretaria` | `id_secretaria` (PK), `nombres`, `apellidos`, `telefono`, `correo` |
| `odontologo` | `id_odontologo` (PK), `nombres`, `apellidos`, `colegiado` (UQ), `telefono`, `correo` |
| `cita` | `id_cita` (PK), `id_paciente` (FK), `id_odontologo` (FK), `id_secretaria` (FK), `fecha_hora`, `motivo`, `estado`, `fecha_creacion` |
| `historial_clinico` | `id_historial` (PK), `id_paciente` (FK, UQ), `fecha_apertura`, `estado`, `motivo_cierre`, `observaciones` |
| `antecedente` | `id_antecedente` (PK), `id_historial` (FK), `tipo`, `descripcion`, `fecha_registro` |
| `consulta_odontologica` | `id_consulta` (PK), `id_historial` (FK), `id_cita` (FK, UQ), `id_odontologo` (FK), `fecha_hora`, `motivo`, `observaciones`, `estado` |
| `diagnostico` | `id_diagnostico` (PK), `codigo` (UQ), `nombre`, `descripcion` |
| `consulta_diagnostico` | `id_consulta` (PK, FK), `id_diagnostico` (PK, FK), `es_principal`, `observaciones` |
| `tratamiento` | `id_tratamiento` (PK), `nombre`, `descripcion` |
| `consulta_tratamiento` | `id_consulta` (PK, FK), `id_tratamiento` (PK, FK), `fecha_inicio`, `fecha_fin`, `observaciones` |
| `receta` | `id_receta` (PK), `id_consulta` (FK, UQ), `fecha_emision` |
| `medicamento` | `id_medicamento` (PK), `nombre_generico`, `presentacion`, `concentracion` |
| `detalle_receta` | `id_receta` (PK, FK), `id_medicamento` (PK, FK), `dosis`, `frecuencia`, `duracion`, `via_administracion`, `indicaciones` |

## 2. Relaciones

| Entidades relacionadas | Cardinalidad y vínculo |
|---|---|
| Paciente - historial | 1:1 lógico; `historial_clinico.id_paciente` es FK y UQ. El alta de paciente debe crear el historial. |
| Paciente - cita | 1:N por `cita.id_paciente`. |
| Odontólogo - cita / consulta | 1:N por `id_odontologo` en cada registro. |
| Secretaria - cita | 1:N por `cita.id_secretaria`; identifica quién gestionó la agenda. |
| Historial - antecedente / consulta | 1:N por `id_historial` en cada tabla. |
| Cita - consulta odontológica | Una cita origina 0..1 consulta; el script exige una cita para cada consulta. `consulta_odontologica.id_cita` es FK, UQ y NOT NULL. |
| Consulta - diagnóstico | N:M mediante `consulta_diagnostico`; la relación guarda `es_principal` y observaciones. |
| Consulta - tratamiento | N:M mediante `consulta_tratamiento`; la relación guarda fechas y observaciones. |
| Consulta - receta | Una consulta tiene 0..1 receta por `receta.id_consulta`, FK y UQ. |
| Receta - medicamento | N:M mediante `detalle_receta`; cada medicamento aparece una vez por receta, con dosis e indicaciones. |

## 3. Operaciones previstas

El PDF describe quién gestiona la agenda y quién registra la atención; no incluye para odontología una lista de operaciones tan detallada como la de laboratorio y pediatría. Este resumen se **deriva de esa descripción y sus entidades**.

| Operación | Responsable o datos involucrados |
|---|---|
| Registrar, buscar y actualizar pacientes | `paciente`; consultar su estado y reutilizar su expediente. |
| Abrir, consultar y actualizar el historial y su estado | `historial_clinico`, asociado a un solo paciente. |
| Mantener datos de secretarias y odontólogos | `secretaria`, `odontologo`; colegiado único. |
| Programar, reprogramar y cancelar citas | Secretaria; `cita`, paciente y odontólogo asignado, motivo, horario y estado. |
| Registrar y consultar antecedentes | Odontólogo; `antecedente` dentro del historial. |
| Registrar consultas odontológicas | Odontólogo; historial, cita asociada, fecha, motivo, observaciones y estado. En el script actual la cita es obligatoria. |
| Consultar el catálogo y asociar diagnósticos a la consulta | `diagnostico`, `consulta_diagnostico`; señalar el principal. |
| Consultar tratamientos y registrarlos en la consulta | `tratamiento`, `consulta_tratamiento`; fechas y observaciones. |
| Mantener medicamentos y registrar una receta por consulta | `medicamento`, `receta`, `detalle_receta`; dosis, frecuencia, duración, vía e indicaciones. |
| Consultar el historial de atención del paciente | Antecedentes, consultas, diagnósticos, tratamientos y recetas del mismo historial. |

## 4. Correspondencia con el script actual

Las 14 tablas originales añaden `id_publico` y `revision`. Los cambios restantes se indican sin repetir sus atributos originales.

| Tabla original | Atributos adicionales del script |
|---|---|
| `historial_clinico` | `causa_baja`, `motivo_baja`, `fecha_baja`, `actor_baja` |
| `consulta_diagnostico` | `principal_consulta` |
| `receta` | `estado`, `contenido_historico`, `motivo_anulacion` |

| Tabla adicional | Atributos completos del script |
|---|---|
| `auditoria` | `id_auditoria`, `id_publico`, `id_usuario`, `accion`, `tabla_afectada`, `registro_afectado`, `fecha_hora`, `detalle` |
| `identidades_paciente` | `clave`, `tipo_documento`, `numero_documento`, `id_paciente`, `fecha_registro` |
| `modelo_database` | `id`, `version`, `huella`, `fecha_creacion` |
| `operaciones` | `id_operacion`, `id_usuario`, `caso_uso`, `clave`, `hash_entrada`, `codigo_respuesta`, `respuesta`, `fecha_hora` |
| `revisiones` | `id_revision`, `tipo_recurso`, `recurso_id`, `version`, `id_usuario`, `fecha_hora`, `motivo`, `contenido_anterior` |
| `rol` | `id_rol`, `id_publico`, `revision`, `nombre`, `descripcion`, `permisos` |
| `usuario` | `id_usuario`, `id_publico`, `revision`, `auth_uid`, `proveedor_identidad`, `institucion_id`, `nombre_usuario`, `id_odontologo`, `id_secretaria`, `estado`, `ultimo_acceso` |
| `usuario_rol` | `id_usuario`, `id_rol` |

`usuario` vincula Firebase UID con un odontólogo, una secretaria o una cuenta administrativa. Los vínculos `id_odontologo` e `id_secretaria` son opcionales, únicos y mutuamente excluyentes. `usuario_rol` resuelve N:M entre usuarios y roles; `auditoria`, `operaciones` y `revisiones` referencian al usuario; `identidades_paciente` al paciente. El actor de baja del historial referencia `usuario.id_publico`.

El script exige coherencia entre paciente, historial, cita y odontólogo; impide dos diagnósticos principales y exige uno al finalizar una consulta que tiene diagnósticos. Añade archivo del historial, identidad Firebase, recetas históricas, revisiones e idempotencia. La autorización y los casos de uso deben implementarse en la aplicación.

Detalle de tipos y restricciones: [diccionario SQL](DICCIONARIO_SQL.md) e [inicializador](clinica_odontologica_mysql.sql).
