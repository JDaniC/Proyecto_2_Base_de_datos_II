# Auditoría de seguridad — E05-P1-04

## Veredicto

**PASS en el alcance de instalación y recuperación.** Cero hallazgos confirmados o probables aplicables pendientes. No es una certificación global del repositorio.

Los paquetes invocables `security-auditor` y `functional-requirements-auditor` no estaban expuestos por el runtime; se aplicó el protocolo equivalente completo de inventario, trazabilidad, revisión, corrección y revalidación antes del PR.

## Superficie revisada

- Orquestación aislada de PostgreSQL, MySQL, MongoDB 8.0 y Firestore Emulator.
- Inicializador MongoDB, contratos conocidos de migraciones 011/012 y montaje de solo lectura del esquema publicado.
- Migración 013 de la huella Firestore, respaldo de configuración y recuperación ante interrupción/deriva.
- Runner Windows, cuentas y datos sintéticos, UI→HTTP→persistencia y eliminación de recursos efímeros.

## Controles

| Control | Resultado |
|---|---|
| Destinos aislados | PASS: nombres únicos por ejecución, servicios en loopback, Firestore `demo-*` y volúmenes destruidos al finalizar |
| Secretos y datos clínicos | PASS: secretos temporales fuera de Git; fixtures exclusivamente sintéticos; evidencia saneada |
| Autoridad institucional | PASS: los recorridos usan token/cuenta vigente; rechazo 403 del analista al validar y ausencia de selector de motor |
| Migraciones y datos existentes | PASS: Mongo acepta solo huellas publicadas con manifiesto `LISTO`; una deriva continúa fallando antes de escribir |
| Índices y validadores | PASS: se cotejan nombre, claves y opciones; 011 usa contrato versionado de solo lectura y 012 enlaza huella de manifiesto/validador |
| Recuperación | PASS: rollback y reanudación en PostgreSQL, MySQL y Firestore; reaplicación Mongo sobre orden real conserva los documentos |
| Dependencias Frontend | PASS: `npm audit --json`, 0 vulnerabilidades |
| Dependencias Backend | ACEPTADO: 14 avisos moderados heredados en tooling ESLint/glob y cadena Firestore; 0 high/critical y sin entrada controlada por el flujo de instalación |

## Hallazgos corregidos

1. **S01 — HIGH:** el runner de Firestore invocaba ejecutables de forma no portable en Windows. Se usa Node con los CLI locales y rutas citadas.
2. **S02 — HIGH:** la huella vigente de Firestore no coincidía con el manifiesto persistido. Se añadió migración 013 con preflight, respaldo, recuperación y rechazo de deriva.
3. **S03 — HIGH:** `mongo-init` rechazaba los validadores válidamente evolucionados después de crear una orden real. El preflight reconoce solo los destinos publicados de 011/012 con manifiesto `LISTO`, huellas e índices compatibles; no ejecuta un `collMod` silencioso.
4. **S04 — MEDIUM:** el contrato 011 no estaba disponible dentro del contenedor de inicialización. Se monta el JSON exacto como archivo de solo lectura.

Revalidación: lint/arquitectura PASS; backend 372/372 y contratos 46/46 PASS; Firestore offline 82/82 PASS; instalación integrada en cuatro motores PASS. Los fallos de la suite histórica de UI se clasifican en la auditoría funcional y no acreditan persistencia.


## Revalidación macOS de la retoma

Candidato `f56455b`. Superficie cambiada: resolución de CLI y fixtures
de ensayo, preparación Firestore 013, preflight Mongo y verificación de
reaplicación. El proceso usa proyecto `demo-*`, puertos loopback, credenciales
sintéticas temporales y volúmenes exclusivos. No publica datos, huellas de
documentos, credenciales ni tokens. La transacción de Firestore coteja rutas,
versión, institución, estado, contrato y ambas huellas antes de respaldar y
actualizar. El inicializador Mongo exige validadores/índices compatibles;
cuando falta el esquema montado, falla con un error explícito. Las pruebas
reales confirman rechazo 404 cruzado, 403 del analista, receta inválida sin
parcialidad y rechazo 409 de atención nueva tras archivo. SCA: 0 en frontend;
14 moderados heredados y 0 altos/críticos en backend. No cambian lockfiles.
Resultado PASS del alcance. El detalle reproducible está en
[la evidencia](../E05-P1-04.md).

Huella 011 alterada: el runner de prueba modificó temporalmente el manifiesto en MongoDB efímero, comprobó que `mongo-init` rechazara la deriva, restauró la huella válida y comprobó una reaplicación sin pérdida.
