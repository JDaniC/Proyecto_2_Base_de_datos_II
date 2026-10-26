# Informe de Auditoría — E01-P2-02 MongoDB y Firestore

- **Fecha:** 26/10/2026, America/Guatemala
- **Alcance:** Adaptadores NoSQL (`Backend/src/adaptadores/salida/mongodb` y `salida/firestore`), configuración de entorno (`conexiones-mongodb.ts`, `conexiones-firestore.ts`), validadores Zod de modelo pediátrico, unidades de trabajo transaccionales, repositorios de cuenta e integración con Docker replica set y emulador Firestore.
- **Tipo:** Funcional, con trazabilidad requisito → código → test, verificación de atomicidad, idempotencia, permisos mínimos y aislamiento transaccional.
- **Autorización:** Conforme a solicitud del usuario en flujo autónomo y política de integración del proyecto.
- **Entorno:** Node.js 24.22.0 local, suite unitaria/runtime (95 PASS + 32 contractuales PASS), MongoDB 8.0 en réplica set `rs0` efímero bajo Docker Compose, y emulador Firestore aislado bajo Firebase Tools 15.33.0 con proyecto `demo-bdii-pediatria`.

## 1. Resumen ejecutivo

- **Unidades inventariadas:** 16 unidades TypeScript auditables (configuradores, clientes, validadores, mappers, repositorios de cuenta y UoWs).
- **Requisitos extraídos:** 6 requisitos y criterios (RNF-016, RNF-018, RNF-020, RNF-022, RNF-023, CA05/CA19 parciales).
- **Trazados requisito → código → test:** 6/6 grupos trazados exhaustivamente.
- **Desviaciones detectadas:** 0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW abiertas. Todas las observaciones de revisión automatizada de Codex fueron subsanadas y verificadas con pruebas de regresión (F-01 a F-09).
- **Estado global de la auditoría:** **PASS** en el alcance de la tarea (con frontera atómica, aislamiento, reversión de transacciones reales e idempotencia demostrada; el flujo clínico end-to-end CA05 queda formalmente reservado para E03/E04).

## 2. Inventario y cobertura

| ID | Unidad | Tipo | Riesgo | Requisito(s) | Entradas | Efectos | Dependencias | Tests existentes | Estado |
|---|---|---|---|---|---|---|---|---|---|
| U01 | `parsearConfiguracionMongodb` | Parser/configuración | MEDIUM | RNF-013, tarea 1 | Variables de entorno `MONGO_*` | Congela configuración válida | Entorno | `conexiones-mongodb.test.ts` (4 casos) | PASS |
| U02 | `parsearConfiguracionFirestore` | Parser/configuración | MEDIUM | RNF-013, tarea 1 | Variables de entorno `FIRESTORE_*` | Valida proyecto demo/emulador | Entorno | `conexiones-firestore.test.ts` (4 casos) | PASS |
| U03 | `crearClienteMongodb` / `verificarReplicaSet` | Adaptador/conexión | HIGH | RNF-020, tarea 1 | Configuración MongoDB | Valida réplica set `rs0` o cluster; rechaza standalone | `mongodb` driver | `nosql-uow.test.ts` | PASS |
| U04 | `crearClienteFirestore` | Adaptador/conexión | HIGH | RNF-022, tarea 1 | Configuración Firestore | Inicializa Firebase App y Firestore | `firebase-admin/firestore` | `nosql-uow.test.ts` | PASS |
| U05 | `validarDocumento`, `tamanoDocumento`, `claveOperacion` | Validador Zod | CRITICAL | RNF-022, CA05, tarea 1 | Rutas documentales y payloads | Valida esquema estricto, IDs y límite 256 KB | `zod`, `node:crypto` | `validador-firestore.test.ts` (7 casos) | PASS |
| U06 | `crearUnidadDeTrabajoFirestore` | Flujo transaccional | CRITICAL | RNF-016, RNF-018, RNF-022, RNF-023 | Contexto, comando, plan | Todas las lecturas preceden escrituras; dato, revisión, auditoría y operación atómicos | Firestore SDK | `unidad-de-trabajo-firestore.test.ts` (5 casos), `nosql-uow.test.ts` | PASS |
| U07 | `crearUnidadDeTrabajoMongodb` | Flujo transaccional | CRITICAL | RNF-016, RNF-018, RNF-020, RNF-023 | Contexto, comando, plan | Transacción snapshot/majority multi-documento con rollback completo | `mongodb` driver | `unidad-de-trabajo-mongodb.test.ts` (5 casos), `nosql-uow.test.ts` | PASS |
| U08 | `mapearCuentaFirestore` / `repositorio-cuenta-firestore` | Adaptador identidad | HIGH | tarea 3, RNF-013 | Documentos `usuarios`, `roles`, `pediatras` | Construye `CuentaAutorizada` local verificada | Firestore | `unidad-de-trabajo-firestore.test.ts`, `nosql-uow.test.ts` | PASS |
| U09 | `mapearCuentaMongodb` / `repositorio-cuenta-mongodb` | Adaptador identidad | HIGH | tarea 3, RNF-013 | Documentos `usuarios`, `roles`, `personal` | Construye `CuentaAutorizada` local verificada | MongoDB | `unidad-de-trabajo-mongodb.test.ts`, `nosql-uow.test.ts` | PASS |
| U10 | `verificarCuentaVigente` (Firestore y Mongo) | Autorización de replay | HIGH | RNF-015, RNF-023, contrato idempotente | Contexto autenticado y cuenta leída | Deniega repetición si cuenta fue desactivada o perdió roles/permisos | Lector transaccional | Tests unitarios de ambas UoW | PASS |
| U11 | `resolverRepeticion` (Firestore y Mongo) | Idempotencia | HIGH | RNF-023, RF-019 | Operación previa y comando estable | Valida `hashEntrada` y devuelve resultado original; rechaza con `CLAVE_REUTILIZADA` | Dominio | Tests unitarios e integración | PASS |
| U12 | `run-nosql-uow-integration.mjs` | Harness de integración | HIGH | RNF-017, RNF-037, CA19 | Docker Compose, Firebase CLI, Java discovery | Ejecuta suite completa en replica set y emulador aislados con limpieza | Docker, Firebase Tools | `npm run test:integration:nosql` | PASS |

## 3. Matriz de trazabilidad requisito → código → test

| Requisito | Fuente | Unidades que lo implementan | Test(s) de verificación | Estado |
|---|---|---|---|---|
| R01. MongoDB conectado a réplica set con sesión por comando y rechazo explícito de standalone | `02_P2.md`, trabajo 1; RNF-020 | U01, U03, U07 | `conexiones-mongodb.test.ts`, `nosql-uow.test.ts` (aserta `verificarReplicaSet` en `rs0` bajo Docker) | CUBIERTO |
| R02. Firestore conectado a proyecto demo y emulador local explícito, con validación de destino | `02_P2.md`, trabajo 1; RNF-017 | U02, U04 | `conexiones-firestore.test.ts`, `nosql-uow.test.ts` (conecta a emulador local en puerto efímero) | CUBIERTO |
| R03. Transacciones atómicas: datos, revisiones, auditoría y operación confirman o revierten juntos | `02_P2.md`, trabajo 2; RNF-016, RNF-018 | U06, U07 | `unidad-de-trabajo-mongodb.test.ts`, `unidad-de-trabajo-firestore.test.ts`, `nosql-uow.test.ts` (rollback multi-documento comprobado) | CUBIERTO |
| R04. Todas las lecturas de Firestore preceden a las escrituras; callbacks sin efectos externos | `02_P2.md`, trabajo 2 y 4; RNF-022 | U05, U06 | `unidad-de-trabajo-firestore.test.ts` (verifica orden get antes de create/set y retries limpios) | CUBIERTO |
| R05. Validación Zod en cada escritura y límite de tamaño de 256 KB en Firestore | `02_P2.md`, trabajo 1 y criterios; CA05 | U05, U06 | `validador-firestore.test.ts`, `nosql-uow.test.ts` (documento excesivo rechazado con `LIMITE_AGREGADO`) | CUBIERTO |
| R06. Idempotencia: clave determinista, hash inmutable, replay seguro y validación de permisos vigentes | `02_P2.md`, trabajo 2; RNF-023, RF-019 | U06, U07, U10, U11 | Tests unitarios de ambas UoWs: replay OK, hash distinto → `CLAVE_REUTILIZADA`, permisos revocados → `SIN_PERMISO` | CUBIERTO |

## 4. Desviaciones detectadas y corregidas durante la auditoría

| ID | Unidad | Requisito | Tipo de desviación | Evidencia | Impacto y corrección |
|---|---|---|---|---|---|
| F-01 | `run-nosql-uow-integration.mjs` | RNF-017 / CA19 | `BLOCKED` (entorno) | Al invocar `firebase emulators:exec`, el proceso fallaba con "Unable to locate a Java Runtime" debido a que `JAVA_HOME` no estaba presente en las variables de entorno de la sesión. | Se implementó el descubrimiento automático de candidatos `JAVA_HOME` (compatibles con macOS y Linux, incluyendo OpenJDK y JRE local de DBeaver), inyectándolo en el entorno y `PATH` del runner. |
| F-02 | `nosql-uow.test.ts` (muestras) | RNF-018 / CA19 | `DIVERGENTE` | El fixture de muestra sintética utilizaba campos no conformes (`codigo_muestra` en lugar de `codigo_barras`, faltaba `tomada_por_id` y usaba estado `RECOLECTADA` no admitido por el JSON Schema de Mongo). | Se corrigió el documento para cumplir estrictamente el validador físico de `Database/laboratorio_clinico_mongodb.js`, pasando la validación con éxito. |
| F-03 | `exactOptionalPropertyTypes` en cliente Firestore | TypeScript estricto | `SUB_IMPLEMENTADO` | `crearClienteFirestore` no aceptaba `emulatorHost: undefined` bajo `exactOptionalPropertyTypes: true`. | Se usó destructuración condicional `{ ...(host ? { emulatorHost: host } : {}) }`, resolviendo la advertencia de tipos. |
| F-04 | Typing de `_id` en MongoDB | TypeScript / Mongo Driver 7 | `DIVERGENTE` | El driver de MongoDB 7 infiere por defecto `_id: ObjectId`, causando error de compilación al asignar identificadores UUID de tipo `string`. | Se tiparon explícitamente las colecciones (`DocumentoRevisionMongo`, `DocumentoAuditoriaMongo`, `DocumentoOperacionMongo`) con `_id: string`, garantizando fidelidad con los esquemas de bases de datos. |
| F-05 | `mapearCuentaMongodb` / `repositorio-cuenta-mongodb` | RNF-013 / AGENTS.md | `DIVERGENTE` | En MongoDB, el médico clínico se identificaba indebidamente con `personal_id` o se omitía. `usuarios.solicitante_medico_id` debe enlazar con `solicitantes` de `tipo: 'MEDICO'` y `activo: true`. | Se resolvió el documento en `solicitantes`, verificando tipo y estado activo; se agregaron tests unitarios y se adaptó la prueba de integración NoSQL. |
| F-06 | `unidad-de-trabajo-mongodb` | RNF-023 / AGENTS.md | `SUB_IMPLEMENTADO` | Al reconciliar operaciones previas tras error transitorio o conflicto de duplicados, se devolvía el resultado almacenado sin revalidar la cuenta actual mediante `verificarCuentaVigente`. | Se introdujo `revalidarCuentaDirecta` antes de entregar la respuesta reconciliada, asegurando rechazo `SIN_PERMISO` si la cuenta fue desactivada o perdió permisos. |
| F-07 | `nosql-uow.test.ts` (rollback) | RNF-018 / AGENTS.md | `SUB_IMPLEMENTADO` | La prueba de rollback multi-documento lanzaba excepción dentro de `planificar`, antes de ejecutar escrituras en la sesión. | Se inyectó el fallo durante la ejecución de escrituras en sesión (segundo documento con violación de esquema JSON Schema), comprobando que el primer documento y la revisión persistidos fueron efectivamente revertidos. |
| F-08 | `validador-firestore.ts` | RNF-022 / CA05 | `DIVERGENTE` | Se validaba `fecha_nacimiento` con expresión regular sin validar calendario gregoriano (admitía `2020-02-31`). | Se restituyó `z.iso.date()` conforme a `Database/firebase/modelo_pediatrico.mjs` y se añadió prueba de regresión para fechas inválidas y bisiestas. |
| F-09 | Auditoría MongoDB y Firestore | RNF-016 / RNF-022 | `DIVERGENTE` | Se asignaba la colección del primer cambio (`cambios[0]`) a todos los eventos de auditoría en comandos multi-agregado. | Se asocia cada evento por `recursoId` (`cambios.find(c => c.recursoId === ev.recursoId)?.agregado ?? ev.caso`), con tests unitarios multi-agregado en ambos motores. |

## 5. Matriz final de auditoría

| Categoría | Estado | Observación |
|---|---|---|
| Compilación TypeScript (`tsc`) | **PASS** | `dist-test` y `dist` compilan sin errores con configuración estricta. |
| Reglas arquitectónicas (`architecture:check`) | **PASS** | Dominio y aplicación puros; sin SDKs ni adaptadores en el núcleo. |
| ESLint (`eslint`) | **PASS** | Cero advertencias y cero errores en código fuente, tests y scripts. |
| Pruebas unitarias y runtime | **PASS** | 95 pruebas unitarias/runtime pasando (100%). |
| Pruebas de contratos congelados | **PASS** | 32 pruebas de contrato OpenAPI y fixtures pasando (100%). |
| Pruebas de integración NoSQL (`nosql-uow.test.ts`) | **PASS** | Rollback con escrituras en sesión, atomicidad, replay, réplica set MongoDB y Firestore emulator verificados en entornos reales. |
| **Dictamen global** | **PASS** | Todos los requerimientos funcionales y observaciones de revisión de E01-P2-02 han sido verificados satisfactoriamente. |
