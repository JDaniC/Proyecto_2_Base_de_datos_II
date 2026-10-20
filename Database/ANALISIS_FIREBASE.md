# Modelo e inicialización de Cloud Firestore: pediatría

Fecha: 19 de octubre de 2026. Corresponde al Centro Médico Pediátrico del diseño principal y al levantamiento de la primera entrega, pp. 47–54. Se usa **Cloud Firestore en modo Native**, no Realtime Database ni Firestore con compatibilidad MongoDB.

## 1. Archivos y resultado de la inicialización

| Archivo | Función |
|---|---|
| `centro_pediatrico_firestore.mjs` | Plan offline e inicialización transaccional de configuración y roles; proyecto/base explícitos. |
| `firebase/modelo_pediatrico.mjs` | Validadores de servidor para 22 patrones de documento y helpers de identificadores, tamaño y creación sin sobrescritura. |
| `firebase/firestore.rules` | Deniega todo acceso directo desde clientes; la aplicación utiliza el backend autorizado. |
| `firebase/firestore.indexes.json` | Diez índices compuestos y ocho exclusiones de indexación para campos de contenido. |
| `firebase/firebase.json` | Configuración de reglas, índices y emulador local. |
| `package.json` / `package-lock.json` | Dependencias fijadas y comandos reproducibles, sin credenciales. |
| `tests/centro_pediatrico_firestore*.test.mjs` | Pruebas de validación y pruebas reales contra el emulador; fixtures únicamente sintéticos. |

Firestore no necesita ni permite un `CREATE COLLECTION` equivalente a SQL/MongoDB. Las colecciones aparecen con su primer documento. Por eso el script **no crea pacientes ficticios ni documentos `_placeholder`** para mostrar carpetas vacías. Define 15 colecciones raíz y siete patrones de subcolección, pero en una base vacía escribe solamente **cinco documentos**: `configuracion/modelo` y cuatro roles iniciales. Las colecciones clínicas aparecen cuando el backend registra datos válidos.

El script no crea el proyecto Google Cloud, la instancia Firestore, usuarios de Firebase Authentication, credenciales ni permisos IAM. Tampoco publica reglas o índices automáticamente: se proporcionan sus archivos y el comando de publicación explícito.

## 2. Modelo documental adoptado

Las seis colecciones clínicas iniciales son pacientes, pediatras, citas, consultas, vacunas y aplicaciones de vacuna. Se conserva su información, con responsables compartidos y eventos longitudinales separados según las decisiones de las secciones 3.5 y 14 del diseño.

| Ruta | Contenido y motivo |
|---|---|
| `pacientes/{pacienteId}` | Perfil, fecha civil de nacimiento, nombre normalizado de búsqueda, apertura, estado y baja del historial. No contiene arreglos crecientes de consultas/vacunas. |
| `responsables/{responsableId}` | Fuente única de identificación, nombres y contacto del adulto compartido por varios menores. |
| `pacientes/{pacienteId}/responsables/{responsableId}` | Vínculo con parentesco, principal, autorización, vigencia y actor/fecha. Las autorizaciones pertenecen a cada menor, no al perfil global del adulto. |
| `pacientes/{pacienteId}/alergias/{alergiaId}` | Alergia, reacción, severidad, estado y fecha, separada del perfil para conservar crecimiento histórico. |
| `pacientes/{pacienteId}/antecedentes/{antecedenteId}` | Tipo, descripción y registro; correcciones con evidencia en auditoría. |
| `pacientes/{pacienteId}/esquemas/{vacunaId}` | Versión de esquema asignada expresamente al menor; no depende del catálogo más reciente. |
| `pediatras/{pediatraId}` | Datos profesionales, colegiación, especialidad, contacto y estado. |
| `citas/{citaId}` | Paciente/pediatra, fecha, motivo, estado y creación; cancelación con motivo. |
| `consultas/{consultaId}` | Atención, autorización histórica utilizada, diagnósticos, tratamientos, **un objeto opcional** de crecimiento y receta con medicamentos embebidos. |
| `consultas/{consultaId}/versiones/{versionId}` | Instantánea anterior, número de versión, motivo y actor/fecha de la corrección; no sustituye la versión previa. |
| `vacunas/{vacunaId}` | Identidad del catálogo y referencia `version_vigente`. |
| `vacunas/{vacunaId}/versiones/{versionId}` | Nombre, enfermedad, fabricante y dosis de esa versión, con ID estable, número y edad recomendada. |
| `aplicaciones_vacuna/{aplicacionId}` | Paciente/vacuna/dosis, versión exacta de esquema, pediatra, fecha, lote, sitio y estado. |
| `aplicaciones_vacuna/{aplicacionId}/versiones/{versionId}` | Versiones anteriores de rectificaciones o anulaciones controladas. |
| `usuarios/{usuarioId}` | Vínculo Firebase UID, institución, estado, roles y pediatra opcional; no guarda contraseñas. |
| `roles/{rolId}` | Permisos de aplicación. Administrador institucional no obtiene acceso clínico automáticamente. |
| `auditoria/{eventoId}` | Actor interno/UID, institución, acción, recurso, correlación, fecha y detalle protegido. |
| `operaciones/{clave}` | Reserva idempotente con hash de entrada y respuesta original; sin caducidad automática. |
| `identidades_paciente/{clave}` | Reserva de tipo/número de identificación y paciente propietario. |
| `identidades_responsable/{clave}` | Reserva de identificación del adulto y responsable propietario. |
| `colegiados/{clave}` | Reserva única de entidad/colegiado y pediatra. |
| `configuracion/modelo` | Versión, huella del modelo/reglas/índices/roles, rutas y límites de tamaño. Es metadato, no un validador nativo del motor. |

Se embeben los datos acotados que se leen como una unidad: crecimiento/diagnósticos/tratamientos/receta de consulta y dosis de una versión de vacuna. Se referencian pacientes, profesionales, responsables compartidos, aplicaciones y eventos, porque tienen vida o crecimiento independientes. Las revisiones permanecen fuera del agregado vigente.

## 3. Validación, identificadores e índices

- Los IDs clínicos y los IDs de revisión son UUID canónicos en minúsculas, guardados en la ruta y no duplicados como `_id` en el documento. La aplicación de vacuna usa la concatenación inequívoca de tres UUID: `pacienteId__vacunaId__dosisId`.
- `claveUnica()` normaliza tipo/número de documento o entidad/colegiado con Unicode NFKC, espacios y mayúsculas; obtiene un SHA-256 de la tupla. El hash evita poner la identificación en la ruta, pero no equivale a cifrado o anonimización. Los campos originales siguen protegidos.
- `claveOperacion()` conserva exactamente institución, actor, caso de uso y clave opaca. No cambia mayúsculas ni espacios de la clave idempotente, manteniendo semántica equivalente a MongoDB. El hash de entrada distingue repetición legítima de reutilización de una clave con otro contenido.
- Cada documento contiene `revision` entera positiva. `version` clínica, `version_vigente` y versión de esquema tienen significados distintos y no se sustituyen por el contador de escritura.
- Fechas de evento son Date/Timestamp; al leer el SDK se normalizan para validar. Nacimiento se guarda como fecha civil `YYYY-MM-DD`. No se guardan permanentemente edad o IMC; el backend los calcula cuando corresponda.
- Se rechazan campos desconocidos, `undefined`, tipos no soportados, NaN/infinito, fechas inválidas y listas directamente anidadas. Los opcionales desconocidos se omiten; no se guardan como cadenas vacías o `null` salvo en imágenes flexibles que lo admitan.
- El modelo limita los documentos a 256 KiB y listas a 100 elementos. El tamaño se calcula con nombres de ruta/campos, UTF-8 y valores, de acuerdo con la fórmula de almacenamiento de Firestore para los tipos admitidos; no incluye entradas de índices. Las imágenes históricas y respuestas también deben caber con su envoltorio.
- La consulta admite un solo objeto de crecimiento, mediciones positivas cuando corresponde, un diagnóstico principal cuando hay diagnósticos y receta con datos históricos completos. Prescriptor y pediatra deben coincidir. Los tratamientos validan su intervalo temporal; las dosis no repiten identificador o número dentro de una versión.
- Los índices compuestos cubren pacientes por estado/nombre; citas por profesional/fecha, paciente/fecha y estado/fecha; consultas por paciente/fecha y profesional/fecha; aplicaciones por paciente/fecha y paciente/estado/fecha; auditoría por recurso/fecha y actor/fecha. El desempate utiliza el ID del documento (`__name__`), no un campo `id` inventado. Los índices ascendentes incluyen ese desempate por defecto.
- Se excluyen de indexación automática receta, diagnósticos, tratamientos, autorización histórica, imágenes de revisiones, dosis versionadas, respuesta idempotente y detalle de auditoría, porque no se consultan por contenido y pueden crecer.

**Los validadores JavaScript no se instalan como restricciones de Firestore.** El backend debe llamar a `validarDocumento()` antes de escribir y conservar los controles de negocio. `crearDocumentoValidado()` combina validación con `create()` para no sobrescribir un documento existente; no implementa autorización ni una unidad de trabajo clínica completa. Acceder directamente con Admin SDK puede omitir los validadores y las reglas del cliente, como comprueba expresamente la suite.

## 4. Consistencia y seguridad pendientes en el backend

| Operación | Comprobaciones y transacción necesarias |
|---|---|
| Alta de paciente | Crear paciente/historial, al menos un vínculo principal, reservas de identificación cuando existan, operación/respuesta y auditoría juntos. No crear reservas vacías para menores sin identificación. |
| Responsable compartido | Actualizar una sola fuente de contacto; conservar autorización por menor. Cambiar vínculos debe leer y actualizar la revisión del paciente, evitando que dos bajas concurrentes eliminen a todos los principales. Se admite más de un principal. |
| Consulta | Validar paciente activo, pediatra autorizado y vínculo que autoriza; preservar los datos del responsable usados en esa atención; vincular cita solo si pertenece al paciente. |
| Crecimiento y receta | El objeto único impide dos controles en el mismo documento, pero el backend debe impedir sobrescritura silenciosa y conservar revisión. Una receta emitida no se reconstruye desde un catálogo actual. |
| Vacuna | Leer esquema asignado, versión/dosis y actores; usar `tx.create()` sobre ID determinista, auditoría y operación/respuesta en una transacción. La prueba de ID único no demuestra por sí sola existencia/compatibilidad de todas las referencias. |
| Dosis pendientes | Comparar edad civil con las dosis del esquema asignado y aplicaciones vigentes; separar futura, pendiente y cumplida. No usar el catálogo vigente como sustituto del esquema histórico. |
| Corrección y archivo | Crear versión anterior, motivo y auditoría en la misma transacción que cambia el documento vigente; no eliminar eventos. Validar transición previa y permisos. |
| Identidad y roles | Verificar token Firebase y revocación; cuenta activa/vínculo institucional y permisos vigentes por recurso. El alta de cuentas también debe reservar la unicidad del UID y nombre de usuario; el esquema no crea índices únicos nativos para esos campos. |

Las reglas entregadas deniegan lectura/escritura directa de **todas** las rutas, incluso a clientes autenticados; los catálogos públicos se sirven por la API con su proyección pública. Firebase Authentication administra identidad; los roles Firestore administran permisos de aplicación, no IAM.

El Admin SDK usa permisos de la cuenta de servicio y omite Security Rules. Por tanto, IAM debe restringirse al proyecto/base pediátrica y el backend debe validar lecturas, búsquedas, escrituras y correcciones. No guardar credenciales en Git, en respuestas, en logs ni en documentos clínicos. Las reglas de cliente no certifican por sí solas mínimo privilegio del servidor ni inmutabilidad de auditoría. Los callbacks transaccionales pueden repetirse y no deben producir notificaciones u otros efectos externos.

## 5. Instalación y ejecución local

Requisitos: Node.js **24.12 o superior**, Firebase CLI (probado con 15.33.0) y Java **21 o superior** para el emulador. Las dependencias Node se fijan en el archivo lock. Desde la raíz del repositorio:

```bash
npm --prefix Database ci
node Database/centro_pediatrico_firestore.mjs --plan
```

El plan es el modo por defecto y no conecta con Firebase. Enumera rutas, roles, huella, índices y límites.

En una terminal, iniciar el emulador del proyecto ficticio:

```bash
firebase emulators:start --only firestore --project demo-bdii-pediatria --config Database/firebase/firebase.json
```

En otra terminal, ejecutar inicialización local:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8188 node Database/centro_pediatrico_firestore.mjs --aplicar --project demo-bdii-pediatria
```

La primera ejecución crea cinco documentos; repetirla crea cero. No se cargan pacientes, responsables, vacunas ni cuentas. Los roles son administrador institucional, pediatra, secretaría y auditor; los permisos cambiados posteriormente por administración se conservan. Un rol con identidad incompatible, un manifiesto alterado o un modelo distinto se rechazan; una base con datos sin manifiesto requiere migración explícita.

El host de emulador debe ser loopback y el proyecto debe empezar con `demo-`. Un proyecto demo sin emulador se rechaza en vez de intentar usar credenciales remotas. Detener el emulador con Ctrl+C al terminar; no se exportan sus datos por defecto.

## 6. Preparación para un proyecto Firebase real

1. Crear o seleccionar un proyecto exclusivo de pediatría, habilitar la base **Firestore Native**, escoger ubicación y preparar una cuenta de servicio con los permisos necesarios. La herramienta no elige un proyecto a partir de una sesión Firebase existente.
2. Configurar Application Default Credentials de la cuenta autorizada fuera del repositorio. Para un archivo de servicio autorizado, usar `GOOGLE_APPLICATION_CREDENTIALS` apuntando a una ruta externa; no copiarlo al proyecto ni incluirlo en los comandos de ejemplo con valores reales.
3. Publicar los archivos declarativos con el proyecto explícito. `Database/firebase/firebase.json` apunta a la base `(default)`:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project ID_DEL_PROYECTO --config Database/firebase/firebase.json
```

4. Comprobar reglas publicadas e índices en estado READY. Después, ejecutar sobre la base ya creada y con `FIRESTORE_EMULATOR_HOST` sin definir:

```bash
node Database/centro_pediatrico_firestore.mjs --aplicar --project ID_DEL_PROYECTO
```

`ID_DEL_PROYECTO` es un marcador que debe reemplazarse; no es un proyecto conectado en esta sesión. Para una base nombrada, pasar `--database nombre-base` y agregar el mismo `database` al bloque `firestore` de `firebase.json` antes de publicar; no publicar reglas únicamente en `(default)` y asumir que protegen otra base. No se ejecutaron estos pasos remotos durante la creación del script.

La inicialización de cinco documentos sí es atómica. La creación administrativa de la base, el despliegue de reglas/índices y los registros de Firebase Authentication son operaciones separadas; no se promete una transacción distribuida. Cambiar la huella del modelo requiere una migración revisada, no restablecer o borrar la base.

## 7. Verificación reproducible

Validación sin conexión:

```bash
npm --prefix Database run test:firestore
```

Con el emulador ejecutándose:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8188 npm --prefix Database run test:firestore:emulator
```

Resultados: **82 pruebas de modelo y 99 de emulador, 181 PASS**, sin pruebas omitidas. Se usaron Node.js 24.22.0, Firebase Admin 14.5.0, Firebase CLI 15.33.0 y Firestore Emulator 1.22.0. La suite del emulador exige loopback, utiliza un proyecto `demo-pediatria-test-*` aislado y limpia solo sus datos al terminar.

Se verifican rutas y tipos, requeridos, principal, crecimiento único, receta, versiones y fechas, identidad y claves opacas, tamaño, bootstrap concurrente, reejecución sin restablecer permisos, rechazo de manifiesto incompatible, CLI, persistencia/lectura de 22 modelos, accesos anónimos/autenticados denegados, ID de aplicación no duplicado y rollback padre/vínculo. También se demuestra que Admin SDK puede escribir datos inválidos si el servidor omite el validador.

El emulador **no certifica** despliegue IAM, índices compuestos en producción, costes/latencias ni todos los casos de uso CA01–CA20. Las definiciones de índices están versionadas y su publicación real sigue pendiente. La autorización clínica, las reglas entre documentos y la conservación de historia deben integrarse y probarse con el backend.

## 8. Referencias oficiales

- [Estructuras de datos y subcolecciones](https://firebase.google.com/docs/firestore/manage-data/structure-data).
- [Reglas y acceso de bibliotecas de servidor](https://firebase.google.com/docs/firestore/security/rules-conditions).
- [Índices de Firestore](https://firebase.google.com/docs/firestore/query-data/indexing).
- [Cálculo de tamaño de almacenamiento](https://firebase.google.com/docs/firestore/storage-size).
- [Conexión al emulador](https://firebase.google.com/docs/emulator-suite/connect_firestore).
- [Configuración del emulador](https://firebase.google.com/docs/emulator-suite/install_and_configure).
