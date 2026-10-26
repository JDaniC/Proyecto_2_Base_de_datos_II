# Contrato común v1 — E00-P1-03

Este directorio define el contrato canónico. El esqueleto ejecutable de E01-P1-01 añade el arranque HTTP, salud operativa y documentación, pero las operaciones clínicas siguen `NOT_IMPLEMENTED` hasta sus tareas E01–E03/E04. No hay persistencia UI→API acreditada por estas pruebas.

- [`openapi.yaml`](openapi.yaml): fuente canónica OpenAPI 3.1.0; 22 rutas bajo `/api/v1`, DTO cerrados, políticas, respuestas y errores.
- [`puertos-v1.ts`](puertos-v1.ts): firmas de diseño compilables, puras, sin framework/SDK/motor. E01-P1-02 las materializa con tipos de dominio; no importar este documento desde producción.
- [`mapa-ui-v1.json`](mapa-ui-v1.json): los 117 métodos de presentación, incluidos los 96 activos, clasificados como `COMUN_V1`, `EXTENSION_PENDIENTE` o `EXCLUIDO`. Las propuestas históricas de rutas se conservan como fuente, nunca como autorización para implementarlas.
- [`fixtures/contrato-v1.json`](fixtures/contrato-v1.json): solicitudes/respuestas sintéticas y rechazos de esquema reutilizables por ambos integrantes.
- [Contrato de flujos](../../plan/03_CONTRATOS_Y_FLUJOS.md): semántica que complementa los esquemas (concurrencia, idempotencia, permisos, paginación y extensiones).

## Servidor base E01-P1-01

Desde el directorio `Backend/`, con Node.js 24 LTS y npm:

```sh
npm ci
cp .env.example .env
npm run build
npm run lint
npm test
npm start
```

La configuración requerida es `APP_ENV`, `HOST`, `PORT` y `INSTITUTIONS`. El ejemplo incluye las cuatro instituciones canónicas. Si falta una variable o la lista no contiene exactamente las cuatro instituciones reconocidas, el proceso termina antes de abrir el puerto e informa solo los nombres de las variables que se deben revisar. `.env` está excluido de Git; el ejemplo no incluye credenciales.

El prefijo HTTP es `/api/v1`. `GET /api/v1/health/live` confirma que el proceso responde. `GET /api/v1/health/ready` devuelve 503 mientras no existan adaptadores de persistencia; el cuerpo declara ese estado sin valores de entorno. Swagger UI y el documento JSON/YAML se sirven en `/api/v1/docs`, `/api/v1/openapi.json` y `/api/v1/openapi.yaml`. Swagger usa el contrato canónico sin incorporar los controladores técnicos; las 22 rutas clínicas aún dicen `NOT_IMPLEMENTED`.

Validación global de DTO rechaza propiedades desconocidas y errores inesperados usan el sobre común con una correlación UUID. El parser JSON limita el cuerpo a 262144 bytes UTF-8; supera ese límite responde 413 sin el mensaje del parser. Los casos de uso son clases TypeScript ordinarias construidas con providers `useFactory`; los cuatro bundles actuales son descriptores inmutables con persistencia `NO_CONFIGURADA`. El listado sirve para probar composición sin base; no se expone como endpoint clínico.

El runtime y las dependencias se fijaron con versiones exactas verificadas el 25/10/2026: Node.js 24 LTS (mínimo 24.22.0), NestJS 12.2.0, `@nestjs/swagger` 12.0.4 y TypeScript 6.0.3; el resto también está fijado en `package.json` y `package-lock.json`. Fuentes primarias: [descargas y releases de Node.js](https://nodejs.org/en/download), [NestJS ValidationPipe](https://docs.nestjs.com/techniques/validation), [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction), [`@nestjs/core` en npm](https://www.npmjs.com/package/%40nestjs/core), [`@nestjs/swagger` en npm](https://www.npmjs.com/package/%40nestjs/swagger), [TypeScript en npm](https://www.npmjs.com/package/typescript).

## Adaptadores SQL E01-P2-01

PostgreSQL (Hospital) y MySQL (Odontología) usan sus cuentas `hospital_app` y `clinica_app`. Las fábricas reciben una ruta `*_PASSWORD_FILE`; nunca registran ni incorporan el secreto a errores. Configuración SQL valida host/puerto y fija base y usuario de aplicación; rechaza cuentas administrativas. Pools: máximo 10 conexiones por defecto, timeout de conexión/consulta y espera acotada de 3 segundos con una cola máxima de 20 peticiones. `crearUnidadDeTrabajoSql` conserva una conexión hasta confirmar o revertir; lector, mapper institucional y aplicación de cambios reciben el mismo executor.

Una confirmación escribe revisiones antes de aplicar cambios protegidos por triggers, y luego auditoría y resultado idempotente en el mismo commit. Las tablas de auditoría/revisiones/operaciones son inmutables para el usuario de runtime; por eso las claves de idempotencia se leen sin bloqueo de escritura y las carreras se resuelven por la restricción única seguida de reconciliación. Un deadlock reintenta el comando completo hasta tres intentos con los IDs fijados por el caso de uso. Rechazos SQL definitivos conservan su error de dominio; un acuse de commit incierto se reconcilia tras liberar la conexión, con la misma clave, o responde 503.

Desde `Backend/`, `npm run test:integration:sql` inicia PostgreSQL y MySQL bajo un proyecto Docker aleatorio, secretos temporales y volúmenes exclusivos. Prueba rollback tardío (después de guardar datos y revisión), orden revisión/cambio, escritura durable, dos invocaciones concurrentes con la misma clave, rechazo de reutilización con contenido distinto, errores de FK y permisos, rechazo de DDL/borrado/lectura del manifiesto, señal de trigger odontológico, mapper de cuenta y reintento de deadlock. Al terminar elimina solo su propio proyecto y volúmenes con `down --volumes`; no escribe en los servicios del proyecto de desarrollo.

La UoW SQL aún no está conectada a los bundles del runtime. `/health/ready` sigue indicando persistencia `NO_CONFIGURADA`, por lo que esta entrega no habilita operaciones clínicas. Las cuentas de aplicación no pueden leer `modelo_database`; el preflight de huella/versiones debe quedar en el arranque de composición o en el verificador administrativo antes de habilitar persistencia. Esta comprobación de runtime sigue pendiente y no se acredita con estas pruebas.

`Backend/.npmrc` desactiva scripts de instalación de dependencias; los paquetes de producción requeridos para este esqueleto son JavaScript/TypeScript y no necesitan compilación nativa. Esto evita ejecutar el postinstall de telemetría transitivo de `swagger-ui-dist` durante la instalación limpia.

La regla `npm run architecture:check` analiza el AST de TypeScript de `src/dominio` y `src/aplicacion`; bloquea imports de HTTP, Nest, UI, SDK, drivers, configuración y acceso al proceso.

La verificación de estas capacidades se ejecuta con `npm test`, sobre módulos HTTP de prueba y puertos locales efímeros. No conecta motores, Firebase ni datos reales. El arranque de esta tarea no implementa login, autorización clínica, persistencia ni operaciones de `openapi.yaml`.

## Validación reproducible del contrato

Desde la raíz, con Python 3.11 o posterior (verificado aquí con 3.14.7):

```sh
python3 -m venv /tmp/contrato-v1-venv
/tmp/contrato-v1-venv/bin/python -m pip install -r Backend/docs/requirements-contrato.txt
/tmp/contrato-v1-venv/bin/python Backend/scripts/validar_contrato.py
```

Comprobación adicional de firmas usando el TypeScript del frontend instalado con su lockfile:

```sh
npm --prefix Frontend ci
Frontend/node_modules/.bin/tsc --strict --noEmit --target ES2022 Backend/docs/puertos-v1.ts Backend/docs/fixtures/puertos-v1.test-d.ts
```

El validador usa OpenAPI Spec Validator 0.7.2, jsonschema 4.23.0 con comprobación de `format` activada y PyYAML 6.0.2. Valida referencias locales, estructuras OpenAPI, esquemas JSON Schema 2020-12, fixtures válidos e inválidos, ejemplos de error, cobertura de cada request y correspondencia de los 117 métodos con `contracts.ts`/exclusiones vigentes. La instalación descarga dependencias; la validación funciona sin API, credenciales, motores ni red.

Los fixtures con `valid: false` deben ser rechazados por el esquema. Los de cuatro instituciones comparten el mismo DTO y añaden overlays para cita dental y autorización pediátrica. Ningún fixture acredita token real, pertenencia, permisos efectivos, autorización del responsable, transacciones, rollback o reglas concurrentes: son pruebas de integración futuras. El esquema `Dinero` es una convención para extensiones; no publica todavía facturación.

## Lectura del contrato

`x-permisos` es una conjunción de requisitos. Un elemento con `|` admite cualquiera de esos permisos. Los requisitos condicionales (por ejemplo `recetas.emitir` al incluir o retirar receta) están en la descripción de la operación. `x-instituciones` es la lista permitida. `x-esquemas-institucionales` agrega validación según la institución de la sesión; no habilita un selector en el body. E01 debe aplicar estas políticas; son metadatos contractuales que un middleware OpenAPI genérico no aplica automáticamente.

`operationId` es el identificador estable para puertos/cliente HTTP. Solo aparecen endpoints comunes congelados; una extensión pendiente exige un contrato revisado, fixtures y permisos antes de implementarla. No se aceptan objetos libres para simular cobertura especializada. Los endpoints de componentes clínicos trabajan sobre la consulta, nunca sobre un diagnóstico/receta sin consulta asociada.

Los campos se serializan en `snake_case`. Identificación ausente se omite: no mandar objeto vacío, número vacío ni valores `SIN_DOCUMENTO` como reserva de identidad. La demografía no reemplaza vínculos pediátricos; se modifican en el comando especializado. En el alta se pueden enviar responsables nuevos sin ID, o referencias existentes con UUID y versión; el backend crea/revalida y vincula todo en la misma unidad de trabajo. La versión devuelta del paciente sirve para coordinar comandos que afecten el historial. Versión de consulta, cita y vínculo son revisiones separadas.

La ficha administrativa contiene datos de contacto; notas, diagnósticos y recetas exigen `historial.leer`. El expediente devuelve una página de eventos con UUID de recurso, no todos los detalles históricos embebidos. El cliente carga detalles autorizados por recurso y continúa mediante cursor; los adaptadores institucionales amplían proyecciones en E04/E05 antes de conectar sus pestañas. No mezclar IDs nativos ni referencias externas al ámbito.

## Puerta para extensiones

El campo `responsable` del mapa indica la tarea del ejecutor que reserve ese ID, no una persona asignada. Hospital: E04-P1-02/P1-03; odontología: E04-P1-01; responsables, crecimiento y vacunas: E04-P2-01/P2-02/P2-03; laboratorio: E05-P1/P2 según agregado; cuentas/auditoría: E05-P2-03. Catálogo profesional: E03-P1-01. Estas tareas deben completar URI/método, DTO de entrada/salida cerrado, permiso/capacidad, versión y clave, revisión/auditoría, límites, errores y ejemplos antes de implementar o conectar el método. E01-P2-03 prepara la infraestructura HTTP; los métodos sin contrato aún deben fallar explícitamente y nunca usar mocks.

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


La revisión propia de lectura clínica separa además entradas de diagnósticos/tratamientos/medicamentos de sus snapshots registrados. Respuesta contiene UUID de cada componente y fecha/autor reales de diagnóstico/tratamiento; el cliente no controla esos metadatos ni los deriva de fecha de consulta. El plan confirma eventos del historial con UUID del componente para preservar fecha/autor cuando el modelo físico los guarda en eventos/revisiones en vez de embebidos. E03 debe materializar esa proyección transaccional y cualquier migración explícita antes de conectar la lectura; no modifica los modelos desde este contrato.


Historial de componentes clínicos: los eventos DIAGNOSTICO/TRATAMIENTO/RECETA incluyen consulta_id, recurso_id y version_consulta. El cliente carga GET /consultas/{consulta_id}?version={version_consulta} y selecciona el UUID hijo dentro de ese snapshot confirmado. Los eventos CONSULTA también incluyen version_consulta y usan recurso_id como padre. Una versión ausente/ajena produce 404, nunca la versión vigente. RepositorioConsulta.porVersion resuelve la clave exacta; no barre revisiones ni reconstruye clínica desde perfiles actuales. Evento y snapshot corresponden al mismo paciente/ámbito y se confirman atómicamente.

Precisión de signos: presiones sistólica/diastólica y frecuencias cardiaca/respiratoria son enteras. Peso admite 3 decimales, talla/saturación 2, temperatura 1, según capacidad común preservable en el modelo hospitalario; rechazar precisión excedida sin redondeo clínico. El validador documental usa Decimal para evaluar multipleOf de forma exacta y acepta enteros matemáticos como 120.0; E01/E03 deben evitar residuos binarios de flotantes al aplicar esa validación.


Compatibilidad física congelada por DEC16: [extensiones tipadas y protocolo de migración](COMPATIBILIDAD_PERSISTENCIA_V1.md). Laboratorio conserva signos mediante nueva propiedad cerrada en consultas_clinicas, odontología mediante tabla 1:1 y pediatría mediante ampliación cerrada de consultas, con propietarios E03 y pruebas de instalación nueva/existente antes de publicar adaptadores. E02 cubre las diferencias de perfil. Esta tarea no modifica inicializadores ni afirma que esas migraciones existan. Contacto de emergencia hospitalario exige nombres/apellidos separados; nombres/apellidos de alta/cambio se limitan a 80 por grupo. Lectura usa hasta 200 para conservar grupos legados (SQL/Mongo hasta 161, Firestore 200), y contacto legado hasta 161 por grupo; nunca truncar. Lectura legada puede devolver fecha_nacimiento/sexo desconocidos como null y duración/fin de cita como null, sin inventar datos. Altas mantienen sus requisitos. E02/E03 deben adaptar los estados de presentación antes de conectar la UI.

Coordinación de agenda/catálogo profesional: E03-P1-01 congela casos/contrato, E03-P1-02 y E03-P2-02 implementan SQL/Firestore y E03-P2-03 conecta UI; E03-P2-01 corresponde al núcleo Mongo sin agenda pública. Las tareas del mapa v1 prevalecen sobre referencias de ejecución históricas del inventario UI.

## Regresiones de auditoría funcional

Ejecutar también `python -m unittest discover -s Backend/scripts -p 'test_*.py' -v` con el mismo venv. Cubre lectura legada por institución, límites dentales en los tres comandos, referencia de versión obligatoria y coherencia de snapshots después de modificar/retirar componentes. `fixtures/historia-versionada-v1.json` son representaciones sintéticas, no dobles de persistencia ni evidencia de API ejecutada.

Política dental de diagnóstico: nombre ≤180 en consulta completa, adición y corrección; los otros contratos conservan 200. La institución verificada selecciona los overlays antes de la UoW. Las respuestas históricas mantienen 200 y los nombres/apellidos de pacientes legados también; no truncar al leer ni reenviar campos de perfil no editados.
