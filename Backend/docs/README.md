# Contrato común v1 — E00-P1-03

Este directorio define el contrato, **no un servidor operativo**. Las 26 operaciones están `NOT_IMPLEMENTED` hasta sus tareas E01–E03/E04. No hay persistencia UI→API acreditada por estas pruebas.

- [`openapi.yaml`](openapi.yaml): fuente canónica OpenAPI 3.1.0; 22 rutas bajo `/api/v1`, DTO cerrados, políticas, respuestas y errores.
- [`puertos-v1.ts`](puertos-v1.ts): firmas de diseño compilables, puras, sin framework/SDK/motor. E01-P1-02 las materializa con tipos de dominio; no importar este documento desde producción.
- [`mapa-ui-v1.json`](mapa-ui-v1.json): los 117 métodos de presentación, incluidos los 96 activos, clasificados como `COMUN_V1`, `EXTENSION_PENDIENTE` o `EXCLUIDO`. Las propuestas históricas de rutas se conservan como fuente, nunca como autorización para implementarlas.
- [`fixtures/contrato-v1.json`](fixtures/contrato-v1.json): solicitudes/respuestas sintéticas y rechazos de esquema reutilizables por ambos integrantes.
- [Contrato de flujos](../../plan/03_CONTRATOS_Y_FLUJOS.md): semántica que complementa los esquemas (concurrencia, idempotencia, permisos, paginación y extensiones).

## Validación reproducible

Desde la raíz, con Python 3.11 o posterior (verificado aquí con 3.14.7):

```sh
python3 -m venv /tmp/contrato-v1-venv
/tmp/contrato-v1-venv/bin/python -m pip install -r Backend/docs/requirements-contrato.txt
/tmp/contrato-v1-venv/bin/python Backend/scripts/validar_contrato.py
```

Comprobación adicional de firmas usando el TypeScript del frontend instalado con su lockfile:

```sh
npm --prefix Frontend ci
Frontend/node_modules/.bin/tsc --strict --noEmit --target ES2022 Backend/docs/puertos-v1.ts
```

El validador usa OpenAPI Spec Validator 0.7.2, jsonschema 4.23.0 con comprobación de `format` activada y PyYAML 6.0.2. Valida referencias locales, estructuras OpenAPI, esquemas JSON Schema 2020-12, fixtures válidos e inválidos, ejemplos de error, cobertura de cada request y correspondencia de los 117 métodos con `contracts.ts`/exclusiones vigentes. La instalación descarga dependencias; la validación funciona sin API, credenciales, motores ni red.

Los fixtures con `valid: false` deben ser rechazados por el esquema. Los de cuatro instituciones comparten el mismo DTO y añaden overlays para cita dental y autorización pediátrica. Ningún fixture acredita token real, pertenencia, permisos efectivos, autorización del responsable, transacciones, rollback o reglas concurrentes: son pruebas de integración futuras. El esquema `Dinero` es una convención para extensiones; no publica todavía facturación.

## Lectura del contrato

`x-permisos` es una conjunción de requisitos. Un elemento con `|` admite cualquiera de esos permisos. Los requisitos condicionales (por ejemplo `recetas.emitir` al incluir o retirar receta) están en la descripción de la operación. `x-instituciones` es la lista permitida. `x-esquemas-institucionales` agrega validación según la institución de la sesión; no habilita un selector en el body. E01 debe aplicar estas políticas; son metadatos contractuales que un middleware OpenAPI genérico no aplica automáticamente.

`operationId` es el identificador estable para puertos/cliente HTTP. Solo aparecen endpoints comunes congelados; una extensión pendiente exige un contrato revisado, fixtures y permisos antes de implementarla. No se aceptan objetos libres para simular cobertura especializada. Los endpoints de componentes clínicos trabajan sobre la consulta, nunca sobre un diagnóstico/receta sin consulta asociada.

Los campos se serializan en `snake_case`. Identificación ausente se omite: no mandar objeto vacío, número vacío ni valores `SIN_DOCUMENTO` como reserva de identidad. La demografía no reemplaza vínculos pediátricos; se modifican en el comando especializado. En el alta se pueden enviar responsables nuevos sin ID, o referencias existentes con UUID y versión; el backend crea/revalida y vincula todo en la misma unidad de trabajo. La versión devuelta del paciente sirve para coordinar comandos que afecten el historial. Versión de consulta, cita y vínculo son revisiones separadas.

La ficha administrativa contiene datos de contacto; notas, diagnósticos y recetas exigen `historial.leer`. El expediente devuelve una página de eventos con UUID de recurso, no todos los detalles históricos embebidos. El cliente carga detalles autorizados por recurso y continúa mediante cursor; los adaptadores institucionales amplían proyecciones en E04/E05 antes de conectar sus pestañas. No mezclar IDs nativos ni referencias externas al ámbito.

## Puerta para extensiones

El campo `responsable` del mapa indica la tarea del ejecutor que reserve ese ID, no una persona asignada. Hospital: E04-P1-02/P1-03; odontología: E04-P1-01; responsables, crecimiento y vacunas: E04-P2-01/P2-02/P2-03; laboratorio: E05-P1/P2 según agregado; cuentas/auditoría: E05-P2-03. Catálogo profesional: E03-P2-01. Estas tareas deben completar URI/método, DTO de entrada/salida cerrado, permiso/capacidad, versión y clave, revisión/auditoría, límites, errores y ejemplos antes de implementar o conectar el método. E01-P2-03 prepara la infraestructura HTTP; los métodos sin contrato aún deben fallar explícitamente y nunca usar mocks.

Las firmas de puertos ilustran operaciones comunes y la frontera transaccional. Las extensiones agregan uniones tipadas por capacidad (incluidos archivos de informes y su hash), sin añadir repositorios genéricos por tabla o escritura arbitraria. La provisión Auth/cuenta se especifica en E01-P1-03 y E05-P2-03 como proceso recuperable, fuera de la UoW clínica.

## Fuentes técnicas

Se fijó OpenAPI 3.1.0 deliberadamente; no se sigue automáticamente la versión más reciente. Fuentes primarias consultadas el 25/10/2026: [especificación OpenAPI 3.1.0](https://spec.openapis.org/oas/v3.1.0.html), [OpenAPI Spec Validator](https://openapi-spec-validator.readthedocs.io/en/latest/), [validación JSON Schema y FormatChecker](https://python-jsonschema.readthedocs.io/en/stable/validate/).


## Edición y metadatos conservados

En PATCH, omitir un campo conserva el valor anterior; enviar null elimina solo campos opcionales; un valor lo reemplaza. Correo vacío o identificación/contacto borrados explícitamente en UI se mapean a null. El snapshot de respuesta omite campos retirados. La reserva de identificación cambia o se libera atómicamente con la demografía y su revisión histórica. La creación no acepta null como sustituto de campos requeridos.

Paciente archivado contiene baja con causa, motivo, fecha y actor; la lectura y el plan de confirmación la conservan. Reactivación guarda la baja previa y justificación en eventos de estado antes de retirar la baja vigente. El vínculo pediátrico conserva parentesco. Los filtros estado/q de agenda llegan al repositorio antes de paginar; no filtrar una página ya seleccionada.


Las cancelaciones conservan motivo_cancelacion sin reemplazar el motivo de atención. Cancelación/reprogramación producen revisiones atómicas con horarios/estados anterior y actual; GET /citas/{id}/revisiones las pagina para el historial de agenda. Los puertos de revisiones de consulta y cita reciben el rango temporal antes de paginar. Los snapshots clínicos incluyen datos históricos del profesional y autorización; las revisiones de paciente preservan demografía previa.


Responsable pediátrico nuevo exige documento, nombres y apellidos explícitos; la identificación ya es obligatoria en M04. El formulario se adapta en E02/E04 antes de conectarlo; no inventar identificaciones ni dividir nombres libres sin captura explícita. Las referencias a responsables existentes conservan su UUID y versión.

Receta de entrada contiene solo medicamentos/observaciones. RecetaEmitida es el snapshot de lectura/persistencia con UUID, código, versión, estado, fecha_emision y prescriptor histórico: el servidor sella estos metadatos. Su fecha corresponde a la emisión real, incluso si ocurre después de abrir la consulta; corrección conserva emisión original y registra fecha de modificación en revisión. La política pediátrica exige concentración explícita y vía ≤100 caracteres en medicamentos para preservar M04; hay overlays para consulta completa, emisión y corrección.

La recarga pediátrica usa RepositorioResponsables.porPaciente con paginación, que devuelve cada vínculo con su snapshot global de responsable. Está expuesto tanto en el lector transaccional como en BundleInstitucional de lectura; no requiere conocer previamente IDs/documentos de responsables. La proyección de ficha aplica permisos y límites, y las extensiones E04 paginan vínculos adicionales antes de conectar su mantenimiento.


Lectura sin comandos: BundleInstitucional expone citas, profesionales e identidades además de pacientes/consultas/responsables/cuenta/historial. Los GET no abren una UoW de comando ni generan operación/auditoría de cambio para leer.

Invariante común comprobada contra los cuatro modelos: concentración e indicaciones de cada medicamento son obligatorias y no vacías; vía tiene máximo 100 caracteres. Dosis incluye unidad en el mismo texto; el mapper combina ambos campos de captura una vez antes de enviar y recupera ese texto para lectura/impresión. Cita conserva fecha_creacion propia además de sus horarios y revisiones. Texto vacío en campos clínicos opcionales (síntomas/observaciones de consulta, observación de diagnóstico y observaciones generales de receta) significa ausencia: el mapper de persistencia omite ese opcional cuando su modelo no acepta vacío y rehidrata síntomas ausentes como cadena vacía para el DTO común. Nunca se aplica esta regla a indicaciones/concentración obligatorias ni se inventa texto clínico.
