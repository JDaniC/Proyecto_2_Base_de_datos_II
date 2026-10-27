# Auditoría funcional de la tarea E02-P1-01

- **Fecha:** 26/10/2026, America/Guatemala
- **Tarea:** `E02-P1-01` — Casos comunes de pacientes e identidad.
- **Tipo:** Funcional y de conformidad hexagonal con contrato OpenAPI.
- **Autorización:** Ejecución del flujo `/goal` de la fase E02 aplicando la skill `functional-requirements-auditor`.
- **Entorno:** Local aislado con datos sintéticos y repositorios en memoria; Node.js v24.22.0.
- **Rama:** `codex/e02-p1-01-casos-pacientes-identidad`.

## 1. Resumen ejecutivo

- **Unidades inventariadas:** 8 unidades funcionales (dominio, casos de uso, DTOs, controlador HTTP y repositorios de memoria). Ver [inventario.csv](inventario.csv).
- **Requisitos cubiertos:** 6 requisitos funcionales derivados de `docs/openapi.yaml` y la especificación de dominio (`RF-005` a `RF-008`, `RNF-001`, `RNF-025`, `RNF-029`, `RNF-035`). Ver [trazabilidad.csv](trazabilidad.csv).
- **Pruebas añadidas:**
  - 17 pruebas unitarias en `Backend/tests/unitarios/casos-uso-pacientes.test.ts`.
  - 18 pruebas runtime HTTP en `Backend/tests/runtime/pacientes-http.test.ts`.
  - Total suite Backend: 170 pruebas automáticas PASS + 32 pruebas contractuales PASS = 202 PASS, 0 FAIL.
- **Linter y arquitectura:** `npm run lint` pasa sin advertencias ni errores; `scripts/verificar-arquitectura.mjs` valida aislamiento estricto de dominio y aplicación sin librerías externas ni adaptadores.
- **Hallazgos abiertos:** 0.
- **Resultado:** **PASS**.

## 2. Cobertura de requisitos y verificación de contratos

1. **Alta e Identidad Atómica (`POST /pacientes`):**
   - Validación pura de dominio para nombres, apellidos, fecha civil (rechazando fechas futuras), sexo (`MASCULINO | FEMENINO | OTRO`), e identificación (`CUI | PASAPORTE`).
   - Política pediátrica: `CENTRO_MEDICO_PEDIATRICO` exige al menos un responsable con `es_principal: true`.
   - Validación exhaustiva de responsables: rechazo de tutores nuevos sin nombres, apellidos o teléfono; rechazo de tutores por ID que envíen datos de nuevo tutor.
   - Persistencia y vinculación de tutores pediátricos: creación y reserva atómica de identidad para responsables nuevos (`agregado: 'responsables'`, `tipo: 'CREAR'` y `agregado: 'identidades'`, `tipo: 'RESERVAR'`), o vinculación y revalidación de versión para existentes por `responsable_id`.
   - Mapeo canónico a esquema snake_case (`responsable_id`, `version_responsable`, `parentesco`, `es_principal`, `autoriza_atencion`, `version_vinculo`).
   - Restricción institucional: `grupo_sanguineo` y `contacto_emergencia` restringidos exclusivamente a `HOSPITAL_GENERAL`; rechazo con `400 SOLICITUD_INVALIDA` en altas no hospitalarias.
   - Idempotencia: el comando calcula el hash de entrada JCS con `prepararComandoEstable` y almacena la operación; una repetición con la misma clave devuelve el resultado durable idéntico preservando `correlacionOriginal` tanto en el header `X-Correlation-ID` como en `meta.correlacion`. Repetición con carga útil distinta es rechazada con `409 CLAVE_REUTILIZADA`.
   - Unicidad: rechazo determinista ante identificación duplicada (`409 PACIENTE_DUPLICADO`).
2. **Actualización Demográfica y Bloqueo Optimista (`PATCH /pacientes/:id`):**
   - Validación de `version_esperada` requerida (entero positivo).
   - Bloqueo optimista: rechazo determinista ante versión esperada discordante (`409 VERSION_DESACTUALIZADA`).
   - Restricción institucional: rechazo con `400 SOLICITUD_INVALIDA` si se intenta actualizar `grupo_sanguineo` o `contacto_emergencia` en instituciones no hospitalarias.
   - Preservación de correlación duradera en reintentos idempotentes y rechazo con `409 CLAVE_REUTILIZADA` si la carga útil difiere.
   - Semántica PATCH parcial: campos omitidos conservan el valor existente; valores `null` eliminan campos opcionales; campos obligatorios rechazan `null`.
   - Modificación/eliminación de documento: libera atómicamente la reserva previa de identidad y registra la nueva reserva dentro de la misma UoW sin perder revisiones.
   - Invariante de estado: rechazo de modificaciones sobre pacientes archivados (`ESTADO_INVALIDO`).
   - Validación de contrato: rechazo con `400 SOLICITUD_INVALIDA` si no se envía ningún campo a modificar aparte de `version_esperada`.
3. **Consulta Individual y Aislamiento Institucional (`GET /pacientes/:id`):**
   - Resolución del paciente por UUID.
   - Aislamiento estricto por bundle: si un usuario de otra institución consulta un paciente ajeno, responde `404 RECURSO_NO_ENCONTRADO` sin revelar existencia.
4. **Búsqueda y Paginación (`GET /pacientes`):**
   - Búsqueda por término `q` (requerido, 1-120 caracteres).
   - Búsqueda por coincidencia de texto que admite nombres y apellidos almacenados de longitud combinada mayor a 120 caracteres sin aplicar falsos límites de consulta al registro guardado.
   - Soporte para cursor opaco base64url que codifica y valida `q`, `orden`, `estado` e `id`, rechazando cursores alterados, malformados o discordantes con `400 SOLICITUD_INVALIDA`.
   - Envoltorio común `{ data, meta: { correlacion, siguiente_cursor } }`.

## 3. Desviaciones detectadas y resueltas

- **D-01 (Resuelta):** `AltaPacienteDto` transformado por `class-transformer` fallaba en `serializarJCS` con `JCS solo admite objetos JSON simples` al conservar prototipo de clase.
  - *Corrección:* `prepararComandoEstable` normaliza la entrada plana antes de la serialización JCS eliminando propiedades `undefined` y prototipos no planos.
- **D-02 (Resuelta):** `PATCH /pacientes/:id` admitía cuerpos con solo `version_esperada` sin campos adicionales debido a propiedades `undefined` en el DTO de clase.
  - *Corrección:* Validación explícita en `PacientesController.actualizar` para exigir al menos un campo definido a modificar además de `version_esperada`.
- **D-03 (Resuelta):** `RespuestaInterceptor` anidaba doblemente respuestas que ya entregaban cursor o sobre parcial.
  - *Corrección:* El interceptor detecta objetos que ya contienen estructura de datos y meta, combinando limpiamente la correlación sin duplicar el sobre `{ data, meta }`.
- **D-04 (Resuelta - Codex P1):** Los responsables pediátricos y sus vínculos no se persistían en el plan de escrituras de la UoW.
  - *Corrección:* `RegistrarPaciente` procesa `entrada.responsables`, creando los cambios planificados `{ agregado: 'responsables', tipo: 'CREAR' }` e identidades para nuevos tutores, vinculando tutores existentes vía `lector.responsables.porId`, y añadiéndolos al estado final del paciente.
- **D-05 (Resuelta - Codex P2):** Al reintentar una mutación con clave de idempotencia existente se descartaba `correlacionOriginal`.
  - *Corrección:* `RegistrarPaciente` y `ActualizarPaciente` retornan `ResultadoDurable<PacienteDto>`, el controlador y `RespuestaInterceptor` conservan la correlación duradera en cabecera `X-Correlation-ID` y `meta.correlacion`.
- **D-06 (Resuelta - Codex P2):** Esquema de vínculos anidados de responsables usaba camelCase en lugar de snake_case requerido por OpenAPI.
  - *Corrección:* `mapearPacienteDto` y `ResponsablePacienteDto` mapean explícitamente `responsable_id`, `version_responsable`, `parentesco`, `es_principal`, `autoriza_atencion`, `version_vinculo`.
- **D-07 (Resuelta - Codex P2):** Campos `grupo_sanguineo` y `contacto_emergencia` no se restringían exclusivamente a `HOSPITAL_GENERAL` durante actualización.
  - *Corrección:* Validación en `ActualizarPaciente` y `RegistrarPaciente` para rechazar con `400 SOLICITUD_INVALIDA` si se envían en instituciones no hospitalarias.
- **D-08 (Resuelta - Codex P2):** `ResponsableAltaDto` admitía tutores nuevos sin nombres, apellidos o teléfono al tener todos los campos como opcionales.
  - *Corrección:* Validación condicional en `ResponsableAltaDto` (`@ValidateIf`) y validación estricta de dominio en `RegistrarPaciente` para asegurar que tutores nuevos contengan nombres, apellidos y teléfono obligatorios, y que tutores por ID no incluyan datos de nuevo tutor.
- **D-09 (Resuelta - Codex P1):** `RepositorioPacientesMemoria` y casos de uso no comparaban `hashEntrada` ante repeticiones de la misma clave de idempotencia con diferente cuerpo.
  - *Corrección:* Verificación explícita de `hashEntrada` en UoW en memoria y en los casos de uso `RegistrarPaciente` y `ActualizarPaciente`, arrojando `CLAVE_REUTILIZADA` (HTTP 409) ante discrepancias de payload.
- **D-10 (Resuelta - Codex P2):** `normalizarNombreBusqueda` limitaba a 120 caracteres el nombre completo concatenado del paciente almacenado, haciendo inencontrables a pacientes con nombres largos legítimos.
  - *Corrección:* Separación de la función `normalizarTextoBusqueda` (sin límite arbitrario) para el texto almacenado del paciente, reservando el límite de 120 caracteres exclusivamente para el término de búsqueda ingresado `q`.
- **D-11 (Resuelta - Codex P2):** El cursor de búsqueda de pacientes trataba UUIDs sin verificar que coincidieran con la consulta o el orden de la página.
  - *Corrección:* Cursor opaco codificado en base64url que encapsula `{ q, orden, estado, id }`, validando estrictamente que el cursor pertenezca a la misma consulta, orden y estado; si hay discrepancia o alteración, rechaza con `400 SOLICITUD_INVALIDA`.
- **D-12 (Resuelta - Codex P2):** El orden de búsqueda de pacientes ordenaba por `nombres` en lugar del orden canónico por `(fecha_registro, UUID)`.
  - *Corrección:* `RepositorioPacientesMemoria.buscar` ordena primero por `fechaRegistro` (comparación cronológica ISO UTC) y usa `id` (UUID) como desempate determinista, admitiendo orden `ASC` y `DESC`.
- **D-13 (Resuelta - Codex P2):** `ContactoEmergencia` y `ContactoEmergenciaDto` utilizaban el formato preliminar `{ nombre, telefono, relacion }` en lugar de los campos canónicos publicados en `Contacto` del contrato OpenAPI `{ nombres, apellidos, parentesco, telefono }`.
  - *Corrección:* `ContactoEmergencia` en el dominio y `ContactoEmergenciaDto` en el DTO HTTP alineados con `Contacto` de OpenAPI: `nombres` (1-80), `apellidos` (1-80), `parentesco` (1-60) y `telefono` (1-30). Se actualizaron validaciones de dominio y pruebas unitarias y de runtime.
- **D-14 (Resuelta - Codex P2):** Comandos concurrentes en memoria contra el mismo recurso podían completar la fase de planificación sobre un estado no actualizado antes de que el otro confirmara.
  - *Corrección:* `RepositorioPacientesMemoria.crearUnidadDeTrabajo` serializa la secuencia completa read-plan-write a través de una cola encadenada de promesas (`colaUow`). Se añadieron pruebas unitarias para registrar en paralelo con la misma clave de idempotencia (devolviendo el mismo registro) y para actualizar concurrentemente con la misma versión esperada (rechazando la segunda con `VERSION_DESACTUALIZADA`).
- **D-15 (Resuelta - Codex P2):** El ciclo de confirmación en la UoW en memoria descartaba `plan.revisiones`, `plan.auditoria` e historiales, impidiendo consultar versiones previas del paciente (`porVersion` devolvía `null`).
  - *Corrección:* `RepositorioPacientesMemoria` almacena las revisiones indexadas por `(recursoId, versionAnterior)`, eventos de auditoría e historiales; `porVersion` resuelve tanto la versión actual como las instantáneas históricas registradas.
- **D-16 (Resuelta - Codex P2):** Si un alta pediátrica incluía múltiples tutores nuevos con el mismo documento, la consulta a identidades previas no detectaba la duplicidad interna dentro de la misma solicitud.
  - *Corrección:* `RegistrarPaciente` acumula las identidades procesadas en la solicitud en `identidadesEnEstaSolicitud` y rechaza con `PACIENTE_DUPLICADO` cualquier colisión entre responsables o con el paciente.
- **D-17 (Resuelta - Codex P2):** La búsqueda de pacientes por documento no normalizaba el término `q`, impidiendo encontrar al paciente mediante formatos con guiones o espacios (ej. `2099-12345-0101`).
  - *Corrección:* `RepositorioPacientesMemoria.buscar` normaliza `q` según las reglas de documento y limpia caracteres de separación, permitiendo coincidencias deterministas con documentos formateados.
- **D-18 (Resuelta - Codex P2):** La serialización de paciente archivado emitía `baja` con campos internos de dominio `{ fecha, actorId }` en lugar de los campos canónicos `{ causa, motivo, fecha_hora, actor_id }` requeridos por OpenAPI.
  - *Corrección:* Se introdujo `ArchivoRegistradoDto` y `mapearPacienteDto` proyecta explícitamente `fecha_hora` y `actor_id` conforme al esquema `ArchivoRegistrado`.

## 4. Conclusión

La implementación de `E02-P1-01` satisface íntegramente los contratos y reglas de negocio sin violaciones de arquitectura hexagonal.
