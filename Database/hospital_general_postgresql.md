# Hospital General - PostgreSQL

Fuente: **Primera Entrega Proyecto (2).pdf**, páginas 1-16. Script: [hospital_general_postgresql.sql](hospital_general_postgresql.sql). El inicializador usa el esquema `hospital_general` dentro de la base PostgreSQL de destino.

El documento define **46 entidades convertidas en tablas**. El script actual conserva esas tablas y agrega cuatro auxiliares: **50 tablas en total**. Las secciones 1-3 condensan el modelo de la entrega; la sección 4 identifica las ampliaciones existentes.

## 1. Entidades, tablas y atributos

Los nombres se presentan en minúsculas como en el script. **PK** = llave primaria; **FK** = llave foránea; **UQ** = valor único. En una PK compuesta se utilizan juntos todos los campos marcados PK. Las marcas siguientes proceden del listado del PDF; las restricciones adicionales están en el script.

| Entidad / tabla | Atributos del documento |
|---|---|
| `paciente` | `id_paciente` (PK), `cui`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `fecha_nacimiento`, `sexo`, `tipo_sangre`, `telefono_principal`, `correo_principal`, `direccion`, `fecha_registro` |
| `contacto_emergencia` | `id_contacto` (PK), `id_paciente` (FK), `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `parentesco`, `telefono` |
| `historial_clinico` | `id_historial` (PK), `id_paciente` (FK), `numero_historial`, `fecha_apertura`, `observaciones_generales`, `estado_historial` |
| `alergia` | `id_alergia` (PK), `nombre`, `descripcion` |
| `paciente_alergia` | `id_paciente_alergia` (PK), `id_paciente` (FK), `id_alergia` (FK), `tipo_reaccion`, `severidad`, `observaciones`, `fecha_registro` |
| `antecedente_medico` | `id_antecedente` (PK), `id_paciente` (FK), `tipo`, `descripcion`, `fecha_diagnostico`, `observaciones` |
| `personal_medico` | `id_personal` (PK), `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `numero_colegiado`, `entidad_colegiacion`, `telefono_principal`, `correo_principal`, `estado` |
| `especialidad` | `id_especialidad` (PK), `nombre`, `descripcion` |
| `personal_especialidad` | `id_personal` (PK, FK), `id_especialidad` (PK, FK) |
| `cita` | `id_cita` (PK), `id_paciente` (FK), `id_personal_programado` (FK), `fecha_hora_inicio`, `fecha_hora_fin`, `motivo_solicitud`, `estado_cita`, `observaciones` |
| `consulta` | `id_consulta` (PK), `id_historial` (FK), `id_personal_atendio` (FK), `id_cita` (FK), `fecha_hora`, `motivo_consulta`, `sintomas`, `observaciones`, `notas_medicas` |
| `signos_vitales` | `id_signos_vitales` (PK), `id_consulta` (FK), `fecha_hora_medicion`, `peso_kg`, `altura_cm`, `temperatura_c`, `presion_sistolica_mmhg`, `presion_diastolica_mmhg`, `frecuencia_cardiaca_lpm`, `frecuencia_respiratoria_rpm`, `saturacion_oxigeno_pct` |
| `catalogo_diagnostico` | `id_catalogo_diagnostico` (PK), `sistema`, `version`, `codigo`, `nombre`, `descripcion` |
| `diagnostico` | `id_diagnostico` (PK), `id_consulta` (FK), `id_catalogo_diagnostico` (FK), `tipo`, `fecha_diagnostico`, `estado` |
| `tratamiento` | `id_tratamiento` (PK), `id_consulta` (FK), `descripcion`, `fecha_inicio`, `fecha_fin`, `indicaciones`, `estado` |
| `diagnostico_tratamiento` | `id_diagnostico` (PK, FK), `id_tratamiento` (PK, FK) |
| `procedimiento` | `id_procedimiento` (PK), `nombre`, `descripcion` |
| `procedimiento_realizado` | `id_procedimiento_realizado` (PK), `id_procedimiento` (FK), `id_consulta` (FK), `id_personal_responsable` (FK), `fecha_hora`, `resultado`, `observaciones` |
| `laboratorio_farmaceutico` | `id_laboratorio` (PK), `nombre` |
| `unidad_medida` | `id_unidad` (PK), `codigo`, `nombre`, `dimension` |
| `medicamento` | `id_medicamento` (PK), `nombre`, `presentacion`, `id_laboratorio` (FK), `cantidad_base`, `id_unidad_base` (FK), `descripcion` |
| `principio_activo` | `id_principio_activo` (PK), `nombre`, `descripcion` |
| `medicamento_principio_activo` | `id_medicamento` (PK, FK), `id_principio_activo` (PK, FK), `cantidad`, `id_unidad_cantidad` (FK) |
| `receta` | `id_receta` (PK), `id_consulta` (FK), `id_personal_prescriptor` (FK), `fecha_hora`, `indicaciones_generales` |
| `detalle_receta` | `id_detalle_receta` (PK), `id_receta` (FK), `id_medicamento` (FK), `dosis_cantidad`, `id_unidad_dosis` (FK), `frecuencia`, `duracion_dias`, `via_administracion`, `instrucciones` |
| `examen_medico` | `id_examen` (PK), `nombre`, `descripcion`, `tipo` |
| `orden_examen` | `id_orden` (PK), `id_consulta` (FK), `id_personal_solicitante` (FK), `fecha_solicitud`, `indicaciones`, `estado` |
| `detalle_orden_examen` | `id_detalle_orden` (PK), `id_orden` (FK), `id_examen` (FK), `indicaciones_muestra` |
| `resultado_examen` | `id_resultado` (PK), `id_detalle_orden` (FK), `version`, `fecha_resultado`, `informe_texto`, `observaciones`, `archivo_resultado` |
| `parametro_examen` | `id_parametro` (PK), `nombre`, `descripcion` |
| `resultado_detalle` | `id_resultado_detalle` (PK), `id_resultado` (FK), `secuencia`, `id_parametro` (FK), `fecha_hora_medicion`, `valor_numerico`, `valor_texto`, `id_unidad` (FK), `referencia_inferior`, `referencia_superior`, `referencia_texto`, `observaciones` |
| `hospitalizacion` | `id_hospitalizacion` (PK), `id_paciente` (FK), `id_personal_responsable_ingreso` (FK), `fecha_ingreso`, `fecha_egreso`, `motivo_ingreso`, `observaciones`, `estado` |
| `hospitalizacion_consulta` | `id_consulta` (PK, FK), `id_hospitalizacion` (FK) |
| `hospitalizacion_diagnostico` | `id_hospitalizacion_diagnostico` (PK), `id_hospitalizacion` (FK), `id_diagnostico` (FK), `tipo_en_hospitalizacion`, `fecha_vinculacion`, `observaciones` |
| `habitacion` | `id_habitacion` (PK), `numero`, `piso`, `tipo`, `estado_operativo` |
| `cama` | `id_cama` (PK), `id_habitacion` (FK), `numero_cama`, `estado_operativo` |
| `asignacion_cama` | `id_asignacion` (PK), `id_hospitalizacion` (FK), `id_cama` (FK), `fecha_hora_inicio`, `fecha_hora_fin` |
| `usuario` | `id_usuario` (PK), `id_personal` (FK), `nombre_usuario`, `contrasena_hash`, `ultimo_acceso`, `estado` |
| `rol` | `id_rol` (PK), `nombre`, `descripcion` |
| `usuario_rol` | `id_usuario` (PK, FK), `id_rol` (PK, FK) |
| `auditoria` | `id_auditoria` (PK), `id_usuario` (FK), `accion`, `tabla_afectada`, `registro_afectado`, `fecha_hora`, `detalle` |
| `aseguradora` | `id_aseguradora` (PK), `nombre`, `nit`, `telefono`, `correo`, `direccion`, `estado` |
| `plan_seguro` | `id_plan` (PK), `id_aseguradora` (FK), `nombre_plan`, `version_plan`, `descripcion`, `porcentaje_cobertura`, `monto_maximo_cobertura`, `moneda`, `estado` |
| `titular_seguro` | `id_titular` (PK), `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `cui`, `telefono` |
| `poliza` | `id_poliza` (PK), `id_plan` (FK), `id_titular` (FK), `numero_poliza`, `fecha_inicio`, `fecha_vencimiento`, `estado` |
| `paciente_poliza` | `id_paciente_poliza` (PK), `id_paciente` (FK), `id_poliza` (FK), `numero_afiliado`, `parentesco_titular`, `fecha_inicio_cobertura`, `fecha_fin_cobertura`, `estado_afiliacion` |

## 2. Relaciones

`1:N` indica que un registro puede relacionarse con varios; `N:M` se resuelve con una tabla intermedia. Las relaciones 1:1 indican un único registro asociado; la existencia obligatoria del historial se completa al registrar al paciente.

| Entidades relacionadas | Cardinalidad y vínculo |
|---|---|
| Paciente - historial | 1:1 lógico; `historial_clinico.id_paciente` es único en el script. |
| Paciente - contactos / antecedentes / citas / hospitalizaciones | 1:N mediante `id_paciente` en cada tabla correspondiente. |
| Paciente - alergia | N:M mediante `paciente_alergia`, que guarda reacción, severidad y fecha. |
| Personal médico - especialidad | N:M mediante `personal_especialidad`. |
| Personal médico - atención | 1:N con citas programadas, consultas atendidas, procedimientos realizados, recetas, órdenes de examen y hospitalizaciones a su cargo. Cada registro conserva su FK profesional. |
| Historial - consulta | 1:N por `consulta.id_historial`. |
| Cita - consulta | Una cita origina 0..1 consulta; una consulta puede no tener cita. `consulta.id_cita` es único en el script. |
| Consulta - signos / diagnósticos / tratamientos / procedimientos realizados / órdenes de examen | 1:N por la FK `id_consulta`. |
| Catálogo diagnóstico - diagnóstico registrado | 1:N por `diagnostico.id_catalogo_diagnostico`. |
| Diagnóstico - tratamiento | N:M mediante `diagnostico_tratamiento`; ambos pertenecen a la misma consulta. |
| Procedimiento - procedimiento realizado | 1:N por `id_procedimiento`; cada realización identifica consulta y responsable. |
| Laboratorio farmacéutico - medicamento | 1:N por `medicamento.id_laboratorio`. |
| Medicamento - principio activo | N:M mediante `medicamento_principio_activo`, con cantidad y unidad. |
| Unidad de medida - medicamento / composición / detalle de receta / resultado detalle | 1:N por `id_unidad_base`, `id_unidad_cantidad`, `id_unidad_dosis` o `id_unidad`, respectivamente. |
| Consulta - receta | Una consulta tiene 0..1 receta; `receta.id_consulta` es único en el script. |
| Receta - medicamento | N:M mediante `detalle_receta`, que conserva dosis, frecuencia, duración e instrucciones. |
| Orden de examen - examen médico | N:M mediante `detalle_orden_examen`. |
| Detalle de orden - resultado de examen | 1:N; las versiones identifican los resultados asociados al examen solicitado. |
| Resultado de examen - resultado detalle - parámetro | Un resultado tiene N detalles; cada detalle referencia un parámetro y, cuando corresponde, una unidad. |
| Hospitalización - consulta | 1:N mediante `hospitalizacion_consulta`; una consulta se vincula como máximo a una hospitalización. |
| Hospitalización - diagnóstico | N:M mediante `hospitalizacion_diagnostico`, que guarda tipo y fecha de vinculación. |
| Habitación - cama | 1:N por `cama.id_habitacion`. |
| Hospitalización - cama | N:M a lo largo del tiempo mediante `asignacion_cama`, con inicio y fin de ocupación. |
| Personal médico - usuario | Vínculo opcional y único por `usuario.id_personal`; puede existir una cuenta administrativa sin profesional asociado. |
| Usuario - rol / auditoría | N:M con roles mediante `usuario_rol`; 1:N con los eventos de auditoría que lo identifican. |
| Aseguradora - plan - póliza | Aseguradora 1:N planes; plan 1:N pólizas; titular 1:N pólizas. |
| Paciente - póliza | N:M mediante `paciente_poliza`, con afiliación, parentesco y vigencia de cobertura. |

## 3. Operaciones previstas

El apartado de hospital del PDF presenta entidades y diagramas, sin una lista explícita de operaciones. Las siguientes se **derivan de ese modelo**; no representan funciones de aplicación ya implementadas.

| Operación | Datos o tablas involucrados |
|---|---|
| Registrar, buscar y actualizar pacientes; abrir y consultar su expediente | `paciente`, `historial_clinico`, `contacto_emergencia`. |
| Registrar alergias y antecedentes | `alergia`, `paciente_alergia`, `antecedente_medico`. |
| Mantener el personal y sus especialidades | `personal_medico`, `especialidad`, `personal_especialidad`. |
| Programar y actualizar citas, su profesional, horario y estado | `cita`, `paciente`, `personal_medico`. |
| Registrar consultas y mediciones de signos vitales | `consulta`, `signos_vitales`, `historial_clinico`; cita cuando exista. |
| Consultar el catálogo y registrar diagnósticos; indicar tratamientos y vincularlos | `catalogo_diagnostico`, `diagnostico`, `tratamiento`, `diagnostico_tratamiento`. |
| Registrar procedimientos realizados, resultado y responsable | `procedimiento`, `procedimiento_realizado`. |
| Mantener medicamentos, composición y unidades; emitir recetas con sus indicaciones | `laboratorio_farmaceutico`, `medicamento`, `principio_activo`, `medicamento_principio_activo`, `unidad_medida`, `receta`, `detalle_receta`. |
| Solicitar exámenes y guardar resultados, versiones y valores medidos | `examen_medico`, `orden_examen`, `detalle_orden_examen`, `resultado_examen`, `parametro_examen`, `resultado_detalle`. |
| Registrar ingresos y egresos; asociar consultas y diagnósticos a la hospitalización | `hospitalizacion`, `hospitalizacion_consulta`, `hospitalizacion_diagnostico`. |
| Consultar habitaciones y camas; asignar camas y registrar traslados por intervalos | `habitacion`, `cama`, `asignacion_cama`. |
| Mantener aseguradoras, planes, titulares, pólizas y afiliaciones de pacientes | `aseguradora`, `plan_seguro`, `titular_seguro`, `poliza`, `paciente_poliza`. |
| Administrar usuarios y roles; consultar las acciones registradas | `usuario`, `rol`, `usuario_rol`, `auditoria`. |
| Consultar el historial de atención y la cobertura de un paciente | Integración de consultas, diagnósticos, tratamientos, recetas, exámenes, hospitalizaciones y pólizas. |

## 4. Correspondencia con el script actual

Las 46 tablas originales añaden `id_publico` y `revision`. El atributo `usuario.contrasena_hash` figura en el PDF, pero **el script lo sustituye por identidad Firebase**; no almacena contraseñas locales. Los demás cambios de atributos se resumen a continuación, sin repetir los campos del modelo original.

| Tabla original | Atributos adicionales del script |
|---|---|
| `historial_clinico` | `causa_baja`, `motivo_baja`, `fecha_baja`, `actor_baja` |
| `consulta` | `estado` |
| `diagnostico` | `es_principal` |
| `receta` | `estado`, `contenido_historico`, `motivo_anulacion` |
| `usuario` | `auth_uid`, `proveedor_identidad`, `institucion_id` |
| `rol` | `permisos` |

| Tabla adicional | Atributos completos del script |
|---|---|
| `identidades_paciente` | `clave`, `tipo_documento`, `numero_documento`, `id_paciente`, `fecha_registro` |
| `modelo_database` | `id`, `version`, `huella`, `fecha_creacion` |
| `operaciones` | `id_operacion`, `id_usuario`, `caso_uso`, `clave`, `hash_entrada`, `codigo_respuesta`, `respuesta`, `fecha_hora` |
| `revisiones` | `id_revision`, `tipo_recurso`, `recurso_id`, `version`, `id_usuario`, `fecha_hora`, `motivo`, `contenido_anterior` |

Las tablas adicionales permiten reservar identidades de pacientes, registrar operaciones idempotentes, conservar revisiones y comprobar la versión del modelo. `identidades_paciente.id_paciente` referencia al paciente; `operaciones.id_usuario` y `revisiones.id_usuario` al actor; `historial_clinico.actor_baja` referencia `usuario.id_publico`.

El script incorpora archivo de historial con causa, motivo, actor y fecha; diagnóstico principal; receta con instantánea histórica; protección de revisiones/auditoría y exclusión de ocupaciones de cama superpuestas. Estos controles complementan el modelo. La autorización, las transacciones de los casos de uso y su implementación pertenecen a la aplicación.

Detalle de tipos y restricciones: [diccionario SQL](DICCIONARIO_SQL.md) e [inicializador](hospital_general_postgresql.sql).
