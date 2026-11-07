# Interfaz clínica

Guía única del frontend vigente. Sustituye los documentos usados para construir el prototipo, el catálogo de 53 vistas y los informes narrativos anteriores. Para tareas, contratos y decisiones del backend consultar [el plan](../plan/00_PLAN_MAESTRO.md).

## Estado real

React 19, TypeScript y Vite. En modo API están conectados sesión, pacientes, expediente, atención y archivo en las cuatro instituciones. El servidor verifica identidad y cuenta local y resuelve la institución. La conexión del circuito analítico de laboratorio corresponde a E05. Para probar el candidato, configurar `VITE_SERVICE_MODE=api` explícitamente. La interfaz usa el modo de simulación si falta ese valor.

## Ejecutar y comprobar

Desde la raíz del repositorio:

```sh
npm --prefix Frontend ci
npm --prefix Frontend run dev
npm --prefix Frontend run build
npm --prefix Frontend test -- src/test/product-scope/ src/services/errors.test.ts src/services/dates.test.ts
```

El servidor local usa el puerto 5173. `build` comprueba tipos y genera `dist/`, que no se versiona. `npm --prefix Frontend run preview` permite probar la compilación. Las dependencias se fijan con package-lock.json.

### Conexión con el backend HTTP

El cliente HTTP (`Frontend/src/services/http`) se comunica con el servidor mediante la ruta canónica `/api/v1`. Durante el desarrollo local (`npm run dev` o `npm run preview` en el puerto 5173), Vite redirige automáticamente todas las peticiones bajo `/api` hacia el backend en `http://127.0.0.1:3000` (configurable mediante la variable `VITE_BACKEND_TARGET`). Adicionalmente, el servidor backend tiene CORS habilitado con soporte para las cabeceras `Authorization`, `X-Correlation-ID`, `Idempotency-Key` e `If-Match`, permitiendo también el consumo cross-origin directo si se define `VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1`.

Las pruebas seleccionadas comprueban el alcance vigente, fechas, mensajes y carga de pantallas. La suite histórica contiene expectativas de pantallas retiradas; no se usa su exclusión como prueba de que todo el producto está validado. Su reconciliación sigue en E06-P2-02 y DEC12 del plan.

### Pacientes HTTP (E02-P1-03)

Ejecutar con `VITE_SERVICE_MODE=api` y un backend configurado. Para ensayo aislado configurar `VITE_FIREBASE_AUTH_EMULATOR_URL`; para Firebase real usar su configuración de identidad. No hay selector de institución ni respaldo clínico en localStorage. Abrir pacientes no lista registros: requiere un término, con páginas por cursor y orden de registro. Los conflictos de documento ofrecen búsqueda para reutilizar el perfil; un conflicto de versión conserva la edición. Ante resultado incierto el formulario conserva datos y clave UUID y permite reintentar la misma solicitud.

El perfil administrativo se obtiene sin solicitar historial clínico. Las cuentas con `historial.leer` reciben perfil e índice paginado de eventos; datos legados ausentes muestran «Sin dato». El índice enlaza la atención y su detalle clínico versionado; no representa antecedentes, consultas o recetas no recibidos como registros vacíos confirmados. Editar demografía conserva los vínculos pediátricos. Para registrar hermanos se puede buscar otro menor, seleccionar su responsable y enviar su UUID/versión con un vínculo nuevo; los datos personales del adulto se conservan. Las operaciones especializadas pendientes rechazan explícitamente hasta integrar su adaptador.

La ficha HTTP permite registrar atención completa y archivar con versión/motivo; pediatría permite reactivar. El asistente envía las versiones observadas del paciente, cita y vínculo autorizante. La cita dental se vincula por su identificador y se verifica en servidor. El detalle permite corregir el agregado y consultar versiones anteriores. La autoridad del profesional proviene de la cuenta verificada; los adaptadores omiten los nombres/autores de presentación. Ante respuesta incierta, los campos de la atención/corrección se bloquean y el reintento conserva clave y contenido. Cambiar de cuenta desmonta los formularios.

El adaptador de agenda ofrece lectura para vincular citas existentes. En modo API se deshabilita el selector de profesionales hasta cargar opciones reales; una caída muestra error y reintento. Su alta/reprogramación/cancelación y los módulos especializados conservan rechazo explícito hasta su integración; no se acreditan por el recorrido clínico.

Comprobaciones reproducibles:

```sh
npm --prefix Frontend test -- src/test/http/ src/test/product-scope/ src/services/errors.test.ts src/services/dates.test.ts
npm --prefix Frontend exec -- playwright install chromium
npm --prefix Backend run test:integration:pacientes:ui
node Backend/scripts/run-historial-integration.mjs --clinica-ui
```

El recorrido requiere Docker, Java y Firebase CLI del entorno local ya descrito en Database. Prepara PostgreSQL, MySQL y MongoDB con proyecto, puertos, volúmenes y secretos aleatorios; Auth/Firestore usan proyecto `demo-*` y emuladores locales. No utiliza los volúmenes de desarrollo. Para Chrome instalado puede usarse `PLAYWRIGHT_CHANNEL=chrome`; `PLAYWRIGHT_PACKAGE` permite señalar el paquete Playwright del runtime de Codex. `PATIENTS_UI_RESULTS` guarda solo resultados saneados. El recorrido de pacientes E02 usa fixtures explícitos del índice de lectura. El recorrido `--clinica-ui` usa escritores clínicos reales, tres motores aislados y emulador Firestore; `CLINICA_UI_EVIDENCE` guarda sus resultados saneados. Los errores HTTP controlados de interfaz se distinguen de la persistencia real.

## Flujos conservados

| Institución | Secciones y operaciones |
|---|---|
| Todas | Acceso, inicio, pacientes, alta/edición, expediente, consulta, diagnósticos, tratamientos, recetas e historial; archivo con causa y confirmación |
| Hospital | Agenda, ingresos/egresos, disponibilidad y asignación de camas, órdenes/resultados de examen, pólizas y procedimientos del paciente |
| Odontología | Agenda de secretaría/odontólogo, cita obligatoria, consulta y seguimiento, selectores clínicos y recetas |
| Laboratorio | Bandeja, órdenes, muestras/eventos, resultados/versiones, informes, cobros, inventario, equipos/calidad, catálogos y cuentas con roles fijos; núcleo clínico común desde expediente |
| Pediatría | Responsables y autorizaciones, antecedentes/alergias, consulta/crecimiento, vacunas/dosis/aplicaciones, archivo y reactivación |

No se añade editor de permisos, selector de motor, agenda visible de laboratorio, reactivación fuera de pediatría, CRUD de camas/médicos, IA, notificaciones ni pantallas administrativas por cada tabla. Menús y rutas se filtran por institución; el servidor deberá aplicar la autorización real.

## Estructura para trabajar

- `src/app/`: rutas, sesión, alcance por institución y composición de servicios.
- `src/layouts/`: navegación, cabecera y contenido autenticado.
- `src/features/`: pantallas y diálogos clínicos por área.
- `src/design-system/`: componentes, tokens y estilos compartidos.
- `src/services/`: contratos, tipos, fechas, mensajes y catálogos comunes.
- `src/mocks/`: adaptadores simulados; reemplazarlos en la frontera de composición según el plan.
- `src/test/product-scope/`: regresiones del producto vigente y carga de pantallas.

La API no confía en actor, rol o institución enviados por formularios. El backend resuelve permisos y motor; `ServiceContext` compone sesión y pacientes con el mismo cliente HTTP. Ver [contratos](../plan/03_CONTRATOS_Y_FLUJOS.md).

## Diseño implementado

Interfaz clara, sin modo oscuro. Los valores vigentes están en `src/design-system/tokens.ts`, `tokens.css` y `responsive.css`; evitar copiarlos a especificaciones paralelas.

- Primario `#20666B`, texto `#0C3B45`, fondo blanco y superficies verde grisáceo suave.
- Botones de 16 px de radio, campos 12 px, paneles 16 px y diálogos 20 px. Usar paneles para agrupaciones funcionales.
- Formularios con etiquetas, errores por campo y mensajes comprensibles. Badges de estado con texto y contraste.
- Tablas anchas con desplazamiento horizontal; navegación móvil plegable. Conservar foco, teclado y confirmaciones de acciones sensibles.
- Fechas civiles sin cambios de día por zona horaria; dinero con moneda y formato legible.

## Carga y recuperación

Acceso y estructura común se cargan al inicio; las pantallas autenticadas se descargan al abrirlas. Durante la espera se mantiene la navegación y se anuncia “Cargando pantalla”. Si falla una descarga o el render de una vista, aparece un mensaje de recuperación sin detalles internos; se puede navegar a otra sección o recargar. Recargar puede perder datos de formularios no guardados.

En la compilación de limpieza del 24/10/2026, el JavaScript inicial total pasó de aproximadamente 1,18 MB a 535.540 bytes (aproximadamente 55 % menos), con 25 pantallas diferidas. El archivo mayor quedó en 297.819 bytes. Son medidas del bundle compilado, no tiempos de carga medidos en una red real.

La optimización de carga no acredita persistencia ni transacciones. La evidencia de integración de pacientes se conserva por separado en [E02-P1-03](../plan/evidencias/E02/E02-P1-03.md).

## Evidencia histórica y límites

La auditoría de producto del 23/10/2026 informó 35 pruebas específicas PASS, compilación PASS y 124 combinaciones de ruta/tamaño recorridas con datos sintéticos. Se conservan [inventario](../plan/evidencias/UI/2026-10-23/inventario.json) y [recorrido](../plan/evidencias/UI/2026-10-23/recorrido-playwright.json). Sus conteos y líneas corresponden a ese corte, no al código actual.

Esos resultados acreditan presentación y simulación; no las cuatro bases integradas ni seguridad clínica real. Las precisiones vigentes de responsables compartidos, archivo y contratos están en el plan. La limpieza documental y la carga diferida requieren sus propias comprobaciones actuales; no se presentan como una auditoría completa de todos los flujos.

## Hospitalizaciones HTTP (E04-P1-02)

Hospital conecta ingreso, evolución, traslado/liberación y egreso con PostgreSQL.
El formulario busca pacientes y permite vincular consultas reales del expediente;
el servidor atribuye el ingreso al médico autenticado. Listado: resúmenes en
páginas de 25, con detalle clínico por ID al abrir la estancia. Búsqueda y servicio
se aplican a la página visible; el estado se filtra en servidor. Las métricas de
estancias indican el alcance de la página; las camas se consultan por separado.

Los comandos envían revisión observada y clave UUID estable para reintentos.
El motivo de traslado se conserva al recargar. La disponibilidad refleja los
intervalos efectivos: un cambio futuro conserva la ocupación de origen hasta su
inicio. Los formularios de traslado/egreso usan hora local de Guatemala con
precisión suficiente para estancias recién ingresadas. La historia enlaza el
detalle hospitalario. Exámenes/pólizas siguen la tarea E04-P1-03; no se habilita
mantenimiento administrativo de camas ni médicos.


### Servicios hospitalarios E04-P1-03

La ficha HTTP de Hospital General incorpora Exámenes, Procedimientos y Seguros.
Órdenes y procedimientos seleccionan una consulta real del paciente; el servidor
firma con el médico vigente. Resultados conservan emisiones y admiten corrección
con motivo/versiones. Coberturas conservan titular con nombres/apellidos explícitos,
fechas civiles y copago cero. General permite ampliar antecedentes y alergias con
severidad/reacción explícitas. Las listas usan páginas y hayMas del servidor.
La migración 008 debe estar LISTO; un error de preparación no habilita simulación.
Ver [contrato y preparación](../Backend/docs/servicios-hospitalarios-v1.md).

### Pediatría HTTP · responsables, antecedentes y crecimiento

La ficha usa responsables compartidos con búsqueda exacta por documento, alta,
edición del contacto común y vínculos por menor. Principalidad y autorización
son decisiones independientes; la baja conserva historia y exige otro principal.
Los formularios capturan versiones observadas y conservan la misma intención al
reintentar una respuesta incierta, sin asumir éxito ni cambiar el cuerpo enviado.

Alergias, perinatales e historia general usan `antecedentes-pediatricos`; requieren
la preparación 009 LISTO. Las versiones se consultan bajo demanda con motivo y
snapshot anterior/actual. Un expediente archivado permite rectificar antecedentes
ya existentes con autorización clínica y motivo; no habilita nuevas atenciones.
El crecimiento se pagina por fecha desde consultas vigentes; sus correcciones
se realizan en la revisión de consulta. Sin talla/peso suficiente no hay IMC,
y la interfaz no ofrece curvas ni interpretación clínica automática.

### Pediatría HTTP · vacunación versionada

La ficha consulta el esquema asignado y las aplicaciones por HTTP. Antes de
administrar se selecciona y asigna explícitamente una versión del catálogo;
un cambio posterior del catálogo conserva las dosis de la versión asignada.
El formulario de aplicación utiliza esas dosis, no las de una versión nueva.
El servidor calcula pendientes, futuras y aplicadas desde la fecha civil de
nacimiento y las aplicaciones vigentes; la interfaz no envía una edad autoritativa.

Registro, corrección y anulación conservan claves estables para reintentos.
Corregir o anular exige motivo y revisión observada; el historial muestra el
nombre y dosis del esquema histórico. La autoría procede de la sesión verificada,
no del nombre mostrado en el formulario. Un expediente archivado bloquea nuevas
administraciones. Las acciones clínicas requieren el permiso vigente del servidor.

En API se capturan fecha, lote, sitio anatómico y observaciones; no se ofrecen
hora ni reacciones como campos separados porque el contrato no los persiste.
Cuando no hay vía registrada se muestra «Vía no registrada» y el sitio se captura
explícitamente. Una falla de lectura presenta un error con reintento y nunca se
interpreta como un esquema vacío ni activa datos simulados.

La administración pediátrica permite crear vacunas con fabricante explícito y
publicar nuevas versiones con dosis de UUID estable. La revisión envía la versión
anterior observada para detectar cambios concurrentes; publicar no reasigna los
esquemas de pacientes existentes. La vía y la etiqueta libre de versión no se
ofrecen en API: el servidor identifica las versiones de forma estable.
