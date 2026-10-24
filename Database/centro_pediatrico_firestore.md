# Centro Médico Pediátrico - Firebase / Cloud Firestore

Fuente: **Primera Entrega Proyecto (2).pdf**, páginas 40-47; los diagramas pediátricos están en las páginas 21-22. Script: [centro_pediatrico_firestore.mjs](centro_pediatrico_firestore.mjs). Modelo actual: [firebase/modelo_pediatrico.mjs](firebase/modelo_pediatrico.mjs).

El documento define **seis colecciones principales** y datos embebidos. El modelo actual reorganiza parte de ellos y define **22 patrones de documento: 15 en colecciones raíz y siete en subcolecciones**. En Firestore se usan colecciones y documentos; las tablas de este resumen son inventarios del modelo, no tablas SQL físicas.

## 1. Entidades, colecciones y atributos

El `_id` del diseño corresponde al identificador del documento y no necesita repetirse como campo. Los atributos terminados en `_id` son referencias lógicas a otros documentos.

| Entidad / colección | Atributos del documento |
|---|---|
| `pacientes` | `_id`, `nombres`, `apellidos`, `fecha_nacimiento`, `sexo`, `grupo_sanguineo`, `direccion`, `estado`, `fecha_apertura`, `motivo_cierre`, `responsables`, `alergias`, `antecedentes` |
| `pediatras` | `_id`, `nombres`, `apellidos`, `colegiado`, `especialidad`, `telefono`, `correo`, `estado` |
| `citas` | `_id`, `paciente_id`, `pediatra_id`, `fecha_hora`, `motivo`, `estado`, `fecha_creacion` |
| `consultas` | `_id`, `paciente_id`, `cita_id`, `pediatra_id`, `fecha_hora`, `motivo`, `sintomas`, `observaciones`, `control_crecimiento`, `diagnosticos`, `tratamientos`, `receta` |
| `vacunas` | `_id`, `nombre`, `enfermedad_objetivo`, `fabricante`, `dosis` |
| `aplicaciones_vacuna` | `_id`, `paciente_id`, `vacuna_id`, `dosis_id`, `pediatra_id`, `fecha_aplicacion`, `lote`, `sitio_aplicacion`, `observaciones`, `identificacion`, `nombres`, `apellidos`, `parentesco`, `telefono`, `correo`, `es_principal`, `autoriza_atencion` |

### Datos dentro de los documentos según la entrega

`[]` indica una lista de objetos; `control_crecimiento` y `receta` son objetos únicos de la consulta.

| Ubicación del dato | Atributos |
|---|---|
| `pacientes.responsables[]` | `identificacion`, `nombres`, `apellidos`, `parentesco`, `telefono`, `correo`, `es_principal`, `autoriza_atencion` |
| `pacientes.alergias[]` | `alergia_id`, `nombre`, `tipo`, `reaccion`, `severidad`, `estado`, `fecha_registro` |
| `pacientes.antecedentes[]` | `tipo`, `descripcion`, `fecha_registro` |
| `consultas.control_crecimiento` | `peso_kg`, `talla_cm`, `perimetro_cefalico_cm`, `temperatura_c`, `frecuencia_cardiaca` |
| `consultas.diagnosticos[]` | `codigo`, `nombre`, `descripcion`, `es_principal`, `observaciones` |
| `consultas.tratamientos[]` | `nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `observaciones` |
| `consultas.receta` | `fecha_emision`, `medicamentos` |
| `consultas.receta.medicamentos[]` | `nombre`, `presentacion`, `concentracion`, `dosis`, `frecuencia`, `duracion`, `via`, `indicaciones` |
| `vacunas.dosis[]` | `dosis_id`, `numero`, `edad_recomendada_meses` |

Los diagramas de las páginas 21-22 separan conceptualmente responsables, historial, antecedentes, diagnósticos, tratamientos, recetas, medicamentos y dosis en entidades relacionales. Para Firebase, la estructura documental descrita en las páginas 40-44 los agrupa como se indica arriba; esos diagramas no agregan tablas MySQL ni colecciones independientes de forma automática.

## 2. Relaciones

| Entidades relacionadas | Cardinalidad y vínculo |
|---|---|
| Paciente - responsables | Un paciente tiene uno o varios responsables; una persona puede ser responsable de varios pacientes. El diseño inicial los embebe en `pacientes.responsables[]`; parentesco y autorización pertenecen al vínculo con cada menor. |
| Paciente - historial, alergias y antecedentes | La apertura y estado del historial están en el perfil; alergias y antecedentes son listas del modelo inicial. |
| Paciente - cita / consulta / aplicación de vacuna | 1:N mediante `paciente_id` en cada colección. |
| Pediatra - cita / consulta / aplicación de vacuna | 1:N mediante `pediatra_id`; identifica al profesional asignado o responsable. |
| Cita - consulta | Una cita puede originar 0..1 consulta; `consultas.cita_id` es opcional. La aplicación debe controlar la unicidad y que pertenezca al paciente y profesional correctos. |
| Consulta - control de crecimiento | 1:0..1; un solo objeto `control_crecimiento` por consulta. |
| Consulta - diagnóstico / tratamiento | Una consulta contiene varios diagnósticos y tratamientos embebidos; se identifica el diagnóstico principal. |
| Consulta - receta - medicamento | Consulta 1:0..1 receta; una receta contiene sus medicamentos e indicaciones históricas. |
| Vacuna - dosis | 1:N; cada elemento de `vacunas.dosis[]` tiene un `dosis_id` para identificarlo dentro de esa vacuna. |
| Vacuna / dosis - aplicación | Una aplicación referencia `vacuna_id` y `dosis_id`; la dosis debe existir dentro de la vacuna correspondiente. |
| Paciente - dosis aplicada | La combinación paciente, vacuna y dosis debe evitar duplicados, salvo una corrección controlada que conserve su historia. |

## 3. Operaciones establecidas en el documento

Resumen de las páginas 46-47; son operaciones requeridas para la aplicación.

| Operación | Datos involucrados y condición principal |
|---|---|
| Registrar y buscar pacientes; consultar el estado de su historial | `pacientes`; evitar duplicados y reutilizar el expediente del menor. |
| Administrar responsables y sus contactos | Agregar responsables, señalar el principal y quién autoriza la atención. Mantener consistentes los datos de una persona compartida por varios menores. |
| Programar, reprogramar y cancelar citas | `citas`; asignar pediatra y conservar motivo y estado. |
| Registrar consultas | `consultas`; paciente, pediatra, fecha, motivo, síntomas, observaciones y cita cuando exista. |
| Registrar y comparar controles de crecimiento | Máximo un control por consulta; comparar mediciones entre fechas para observar evolución. |
| Registrar diagnósticos y tratamientos | Uno o varios diagnósticos, uno principal y tratamientos con fechas y observaciones. |
| Registrar recetas históricas | Medicamentos con dosis, frecuencia, duración, vía e instrucciones; conservar cómo se emitieron. |
| Administrar vacunas y dosis | `vacunas`; catálogo, esquema y edad recomendada por dosis. |
| Registrar aplicaciones de vacunas | `aplicaciones_vacuna`; vacuna, dosis, fecha, lote, sitio y pediatra. Evitar registrar dos veces la misma dosis al paciente. |
| Consultar el historial cronológico y las dosis pendientes | Consultas, crecimiento y aplicaciones; comparar con el esquema definido para el proyecto. |
| Actualizar datos administrativos; archivar y reactivar historiales | Teléfonos, direcciones y estado del historial; conservar la trazabilidad de las correcciones clínicas. |
| Controlar acceso y registrar cambios | Identificar al usuario, comprobar permisos y registrar acciones importantes. |

Al guardar información clínica se debe comprobar que los documentos relacionados existan y correspondan al paciente correcto; controlar escrituras simultáneas para evitar duplicados o pérdida de información. La edad y el IMC se calculan cuando se necesitan, a partir de fecha de nacimiento, peso y talla.

## 4. Correspondencia con el script y modelo actuales

El ID se guarda en la ruta y todos los documentos contienen `revision`. El paciente ya no embebe responsables, alergias y antecedentes: utiliza responsables compartidos y vínculos o eventos en subcolecciones. Las dosis pasan a una versión de vacuna y cada paciente conserva su esquema asignado. `motivo_cierre` se representa dentro de `baja`, junto con causa, fecha y actor.

### Rutas y atributos actuales

Esta tabla reúne las 22 rutas del validador; incluye las seis colecciones de partida, las reorganizaciones clínicas y los documentos técnicos.

| Ruta definida en el modelo actual | Atributos, además de `revision` |
|---|---|
| `pacientes/{pacienteId}` | `nombres`, `apellidos`, `nombre_busqueda`, `fecha_nacimiento`, `sexo`, `grupo_sanguineo`, `direccion`, `tipo_documento`, `numero_documento`, `estado`, `fecha_apertura`, `baja` |
| `responsables/{responsableId}` | `identificacion`, `tipo_documento`, `nombres`, `apellidos`, `telefono`, `correo`, `fecha_registro` |
| `pacientes/{pacienteId}/responsables/{responsableId}` | `responsable_id`, `parentesco`, `es_principal`, `autoriza_atencion`, `estado`, `fecha_registro`, `actor_id` |
| `pacientes/{pacienteId}/alergias/{alergiaId}` | `nombre`, `tipo`, `reaccion`, `severidad`, `estado`, `fecha_registro` |
| `pacientes/{pacienteId}/antecedentes/{antecedenteId}` | `tipo`, `descripcion`, `fecha_registro` |
| `pacientes/{pacienteId}/esquemas/{vacunaId}` | `vacuna_id`, `version_id`, `actor_id`, `fecha_asignacion`, `estado` |
| `pediatras/{pediatraId}` | `nombres`, `apellidos`, `colegiado`, `entidad_colegiacion`, `especialidad`, `telefono`, `correo`, `estado` |
| `citas/{citaId}` | `paciente_id`, `pediatra_id`, `fecha_hora`, `motivo`, `estado`, `fecha_creacion`, `motivo_cancelacion` |
| `consultas/{consultaId}` | `paciente_id`, `cita_id`, `pediatra_id`, `fecha_hora`, `motivo`, `sintomas`, `observaciones`, `estado`, `autorizacion_historica`, `control_crecimiento`, `diagnosticos`, `tratamientos`, `receta` |
| `consultas/{consultaId}/versiones/{versionId}` | `version`, `actor_id`, `fecha_hora`, `motivo`, `contenido_anterior` |
| `vacunas/{vacunaId}` | `nombre`, `enfermedad_objetivo`, `fabricante`, `version_vigente` |
| `vacunas/{vacunaId}/versiones/{versionId}` | `version`, `nombre`, `enfermedad_objetivo`, `fabricante`, `fecha_creacion`, `dosis` |
| `aplicaciones_vacuna/{aplicacionId}` | `paciente_id`, `vacuna_id`, `dosis_id`, `version_esquema_id`, `pediatra_id`, `fecha_aplicacion`, `lote`, `sitio_aplicacion`, `observaciones`, `estado`, `motivo_anulacion` |
| `aplicaciones_vacuna/{aplicacionId}/versiones/{versionId}` | `version`, `actor_id`, `fecha_hora`, `motivo`, `contenido_anterior` |
| `usuarios/{usuarioId}` | `auth_uid`, `proveedor_identidad`, `institucion_id`, `estado`, `rol_ids`, `pediatra_id`, `nombre_usuario`, `ultimo_acceso` |
| `roles/{rolId}` | `nombre`, `descripcion`, `permisos` |
| `auditoria/{eventoId}` | `usuario_id`, `auth_uid`, `institucion_id`, `fecha_hora`, `accion`, `tipo_recurso`, `recurso_id`, `correlacion`, `motivo`, `version_afectada`, `detalle` |
| `operaciones/{clave}` | `institucion_id`, `usuario_id`, `caso_uso`, `clave`, `hash_entrada`, `recurso_tipo`, `recurso_id`, `fecha_hora`, `codigo_respuesta`, `estado`, `respuesta` |
| `identidades_paciente/{clave}` | `tipo_documento`, `numero_documento`, `recurso_id`, `fecha_registro` |
| `identidades_responsable/{clave}` | `tipo_documento`, `numero_documento`, `recurso_id`, `fecha_registro` |
| `colegiados/{clave}` | `entidad_colegiacion`, `colegiado`, `pediatra_id`, `fecha_registro` |
| `configuracion/modelo` | `version_esquema`, `institucion_id`, `hash_modelo`, `rutas`, `limite_documento_bytes`, `limite_lista`, `fecha_creacion` |

### Atributos de objetos ampliados

Los objetos de crecimiento y las dosis mantienen sus atributos originales. Los cambios de objetos respecto a la primera entrega son:

| Objeto | Atributos actuales o adiciones |
|---|---|
| `pacientes.baja` | `causa`, `motivo`, `fecha`, `actor_id`. |
| `consultas.autorizacion_historica` | `responsable_id`, `identificacion`, `nombre`, `fecha`, `autoriza_atencion`; conserva quién autorizó esa atención. |
| `consultas.diagnosticos[]` | Añade `diagnostico_id` a los atributos originales. |
| `consultas.tratamientos[]` | Añade `tratamiento_id` e `indicaciones` a los atributos originales. |
| `consultas.receta` | Conserva `fecha_emision` y `medicamentos`; añade `receta_id`, `version`, `estado`, `prescriptor_id`, `prescriptor_nombre_historico`, `colegiado_historico`, `indicaciones_generales`. |
| `consultas.receta.medicamentos[]` | Añade `medicamento_id` a los atributos originales. |
| `operaciones.respuesta` | `data` y `meta`; `meta` contiene `correlacion`. |

### Relaciones y operaciones de soporte añadidas

- `responsables/{responsableId}` es la fuente común de contacto. Su vínculo con cada paciente guarda parentesco, principal y autorización; cambiar un contacto compartido no requiere duplicarlo en varios pacientes.
- `pacientes/{pacienteId}/esquemas/{vacunaId}` referencia una versión exacta de `vacunas/{vacunaId}/versiones/{versionId}`. Las aplicaciones registran la versión de esquema utilizada.
- El ID de aplicación combina paciente, vacuna y dosis. La aplicación debe crearlo de forma transaccional para evitar sobrescrituras y comprobar todas las referencias.
- Las subcolecciones `versiones` conservan el estado anterior de consultas o aplicaciones corregidas, con versión, actor, fecha y motivo.
- `usuarios` vincula Firebase UID, roles y pediatra opcional. `auditoria` registra actor y recurso; `operaciones` conserva la respuesta idempotente; las colecciones de identidades y colegiados reservan unicidad.

El inicializador escribe la configuración del modelo y cuatro roles; las colecciones clínicas aparecen al registrar documentos. Los validadores de servidor deben invocarse desde la aplicación; el script no implementa por sí solo todos los casos de uso. Para el detalle completo: [análisis de Firebase](ANALISIS_FIREBASE.md).
