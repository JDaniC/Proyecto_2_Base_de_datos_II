# Reporte de Hallazgos y Correcciones — E04-P2-01

## 1. Hallazgos Detectados Durante la Revisión Automática y Auditoría

### HALLAZGO-01: Contrato PatientRepository acoplado a DTO de transporte y snake_case (Resuelto)
- **Severidad:** MEDIUM
- **Archivo/Línea:** `Frontend/src/services/contracts.ts`, `Frontend/src/services/types.ts`
- **Condición inicial:** `PatientRepository` importaba `AntecedentesPediatricosDto` desde el adaptador HTTP y exponía campos en `snake_case` (`version_vinculo`, `consulta_id`, `edad_meses`).
- **Corrección aplicada:** Se definieron tipos de dominio camelCase (`RevisionAntecedentesPediatricos`, `MedicionPediatrica`, `ResponsableEncontrado`) en `types.ts`. `httpPatientRepository.ts` mapea explícitamente desde los DTOs de red a las formas del dominio.

### HALLAZGO-02: Esquemas de respuesta ausentes en operaciones pediátricas de OpenAPI (Resuelto)
- **Severidad:** MEDIUM
- **Archivo/Línea:** `Backend/docs/openapi.yaml`
- **Condición inicial:** 16 operaciones nuevas de pediatría tenían `200` y `201` sin `content.application/json.schema`, y parámetros de crecimiento débilmente tipados.
- **Corrección aplicada:** Se declararon los esquemas de respuesta correspondientes (`RespuestaAntecedentesPediatricos`, `RespuestaCrecimientoPediatrico`, `RespuestaResponsablePediatricoEncontrado`, etc.), se tiparon `desde`/`hasta` como `InstanteUTC` y `cursor` como `Cursor`, y se ajustaron las descripciones para no repetir cláusulas exclusivas de mutación en endpoints GET.

### HALLAZGO-03: Desalineación criptográfica de hash de modelo Firestore por modificación de índices (Resuelto)
- **Severidad:** CRITICAL
- **Archivo/Línea:** `Database/firebase/firestore.indexes.json`
- **Condición inicial:** Se había agregado un índice no versionado a `firestore.indexes.json`, alterando el sha256 canónico del modelo (`a39fdac43acefecf82145f3dfde06c89a3adbfe96240f637cf79c0a1a6073e08`) e impidiendo la ejecución de la migración 006 con error `MANIFIESTO_CLINICO_INCOMPATIBLE`.
- **Corrección aplicada:** Se restableció `Database/firebase/firestore.indexes.json` al modelo oficial. Los índices compuestos necesarios para el entorno de prueba se combinan dinámicamente en el arnés de ejecución aislada sin modificar el archivo canónico.

### HALLAZGO-04: Validación estricta de cadenas en tipos de dominio (Resuelto)
- **Severidad:** LOW
- **Archivo/Línea:** `Backend/src/dominio/pediatria/antecedentes.ts`
- **Condición inicial:** Validaciones de `tipoParto` y `severidad` admitían implícitamente arreglos u objetos antes de coerción.
- **Corrección aplicada:** Se agregaron guardas explícitas `typeof e.tipoParto === 'string'` y `typeof e.severidad === 'string'`.

### HALLAZGO-05: Limpieza de modales y formulario de alergia tras reintento exitoso (Resuelto)
- **Severidad:** MINOR
- **Archivo/Línea:** `Frontend/src/features/patients/components/PediatricHistoryAllergiesView.tsx:233-248`
- **Condición inicial:** El botón de reintento de respuesta incierta no cerraba modales ni reseteaba los campos de alergia al tener éxito.
- **Corrección aplicada:** Se invocan los setters de limpieza (`setModalAlergiaAbierto(false)`, etc.) en la rama exitosa de reintento, cubierto por regresión automatizada.

## 2. Resumen de Pruebas Ejecutadas y Estado Final
- Pruebas Backend Unitarias/Runtime: 308 PASS (0 FAIL)
- Pruebas Backend Contratos: 32 PASS (0 FAIL)
- Integración Clínica Firestore Aislada: 19 PASS (0 FAIL)
- Integración Pacientes Firestore Aislada: 8 PASS (0 FAIL)
- Pruebas Frontend src/test/http: 105 PASS (0 FAIL)
- Validador Contractual Offline: 58 rutas, 65 operaciones, 168 esquemas, 327 fixtures PASS
- Estado de la Tarea: PASS
