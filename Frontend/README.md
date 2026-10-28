# Interfaz clínica

Guía única del frontend vigente. Sustituye los documentos usados para construir el prototipo, el catálogo de 53 vistas y los informes narrativos anteriores. Para tareas, contratos y decisiones del backend consultar [el plan](../plan/00_PLAN_MAESTRO.md).

## Estado real

React 19, TypeScript y Vite. En modo API están conectados sesión, alta, búsqueda, edición de pacientes y expediente/cronología paginados para las cuatro instituciones. El servidor verifica identidad y cuenta local y resuelve la institución. Las capacidades clínicas E03–E05 continúan según el plan; los simuladores solo se usan cuando se elige explícitamente ese modo.

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

El perfil administrativo se obtiene sin solicitar historial clínico. Las cuentas con `historial.leer` reciben perfil e índice paginado de eventos; datos legados ausentes muestran «Sin dato». El índice mantiene referencias de versión para su detalle clínico futuro; no representa antecedentes, consultas o recetas no recibidos como registros vacíos confirmados. Editar demografía conserva los vínculos pediátricos. Las operaciones especializadas pendientes rechazan explícitamente hasta integrar su adaptador.

Comprobaciones reproducibles:

```sh
npm --prefix Frontend test -- src/test/http/ src/test/product-scope/ src/services/errors.test.ts src/services/dates.test.ts
npm --prefix Frontend exec -- playwright install chromium
npm --prefix Backend run test:integration:pacientes:ui
```

El recorrido requiere Docker, Java y Firebase CLI del entorno local ya descrito en Database. Prepara PostgreSQL, MySQL y MongoDB con proyecto, puertos, volúmenes y secretos aleatorios; Auth/Firestore usan proyecto `demo-*` y emuladores locales. No utiliza los volúmenes de desarrollo. Para Chrome instalado puede usarse `PLAYWRIGHT_CHANNEL=chrome`; `PLAYWRIGHT_PACKAGE` permite señalar el paquete Playwright del runtime de Codex. `PATIENTS_UI_RESULTS` guarda solo resultados saneados. La cronología usa fixtures explícitos del índice de lectura, sin acreditar escritores clínicos E03–E05.

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
