# 16 — Contratos de Datos y Futura Integración con Backend (`/api/v1`)

**Fecha:** 19 de octubre de 2026  
**Fuentes:** [`Agente/DISENO_PROYECTO.md`](../../Agente/DISENO_PROYECTO.md) (§5.3, §5.5–5.7) y [`Agente/REQUERIMIENTOS_NO_FUNCIONALES.md`](../../Agente/REQUERIMIENTOS_NO_FUNCIONALES.md) (`RNF-028` a `RNF-034`).

---

## 1. Envoltura común de respuestas y errores

Todas las respuestas de los adaptadores (tanto `Mock*Repository` hoy como `Http*Repository` cuando se integre `Backend/`) cumplen el contrato de `DISENO_PROYECTO.md` §5.6:

### Respuesta exitosa (`200 OK` / `201 Created`)
```ts
export interface ApiResponse<T> {
  data: T;
  meta: {
    correlacion: string;          // Ej. "corr-20261019-8f3a1c"
    siguiente_cursor?: string;    // Presente en listados paginados
  };
}
```

### Respuesta de error (`400`, `401`, `403`, `404`, `409`, `413`, `503`)
```ts
export type ErrorCode =
  | 'SOLICITUD_INVALIDA'          // 400: campos/tipos/fechas/cursor inválidos
  | 'NO_AUTENTICADO'              // 401: token ausente, inválido, vencido o revocado
  | 'CUENTA_NO_HABILITADA'        // 403: cuenta PENDIENTE, INACTIVO o sin vínculo institucional
  | 'SIN_PERMISO'                 // 403: el rol activo no posee el permiso requerido
  | 'RECURSO_NO_ENCONTRADO'       // 404: no existe o pertenece a otra institución
  | 'PACIENTE_DUPLICADO'          // 409: identidad normalizada ya registrada
  | 'VERSION_DESACTUALIZADA'      // 409: conflicto de concurrencia optimista
  | 'CLAVE_REUTILIZADA'           // 409: misma Idempotency-Key con payload distinto
  | 'ESTADO_INVALIDO'             // 409: transición de estado no permitida
  | 'REFERENCIA_INCOMPATIBLE'     // 409: recursos de distinto paciente o flujo
  | 'RECETA_EXISTENTE'            // 409: segunda emisión ordinaria sobre la misma consulta
  | 'LIMITE_AGREGADO'             // 413: supera 256 KiB o 100 elementos en arreglo
  | 'PERSISTENCIA_NO_DISPONIBLE'; // 503: fallo temporal de almacenamiento/red

export interface ApiErrorPayload {
  error: {
    codigo: ErrorCode;
    mensaje: string;
    campos?: Record<string, string>;
  };
  meta: {
    correlacion: string;
  };
}
```

---

## 2. Reglas de transporte y formato

1. **Identificadores públicos (`id_publico`):** Todo recurso expuesto usa UUID v4 como texto (`string`). Los códigos legibles (`HC-HOSP-0101`, `ORD-2026-0041`) son campos descriptivos adicionales y nunca sustituyen al UUID público en rutas o referencias.
2. **Fechas y zonas horarias (`RNF-030`):**
   - Eventos (`fecha_hora`, `creado_en`, `actualizado_en`): ISO 8601 en UTC (`2026-10-19T19:45:00.000Z`). La interfaz los formatea con `Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', ... })`.
   - Fechas civiles (`fecha_nacimiento`, `fecha_diagnostico`): `YYYY-MM-DD` sin conversión de zona horaria para evitar desplazamientos de $\pm 1$ día.
3. **Concurrencia e Idempotencia (`RNF-023`):**
   - Comandos de creación/movimiento envían `idempotencyKey: string` (cabecera futura `Idempotency-Key`).
   - Comandos de actualización/cambio de estado envían `version_esperada: number`.

---

## 3. Operaciones del contrato común (`/api/v1`) y endpoints previstos

| Puerto Frontend (`src/services/contracts.ts`) | Método | Endpoint REST previsto en `DISENO_PROYECTO.md` §5.6 | Notas de contrato |
|---|---|---|---|
| `AuthRepository` | `loginWithDemoAccount` / `loginWithCredentials` | `POST /api/v1/sesion` *(propuesta de endpoint de sesión para intercambiar/verificar ID Token)* | En producción envía `Authorization: Bearer <FirebaseIdToken>` y recibe el perfil interno e institución verificada. |
| `AuthRepository` | `logout` | `POST /api/v1/sesion/cierre` *(propuesta para revocar sesión en servidor)* | Limpia sesión local y solicita revocación de refresh tokens (§5.3.1). |
| `PatientRepository` | `createPatient` | `POST /api/v1/pacientes` | Crea paciente e historial juntos; requiere `Idempotency-Key`. |
| `PatientRepository` | `searchPatients` | `GET /api/v1/pacientes?q=...&estado=...&cursor=...&limite=20` | Identificación exacta o prefijo normalizado; devuelve `siguiente_cursor`. |
| `PatientRepository` | `getPatientById` | `GET /api/v1/pacientes/{id}` | Filtra campos según permisos del rol activo. |
| `PatientRepository` | `archiveRecord` | `POST /api/v1/pacientes/{id}/archivo` | Exige `causa` (`TRASLADO` \| `FALLECIMIENTO` \| `OTRA_ADMINISTRATIVA`), `motivo` y `version`. |
| `PatientRepository` | `reactivateRecord` | `POST /api/v1/pacientes/{id}/reactivacion` | Exige `motivo`, `version` y permiso `historial.archivar`. |
| `AppointmentRepository` | `createAppointment` | `POST /api/v1/citas` | Crea cita `PROGRAMADA`; requiere `Idempotency-Key`. |
| `AppointmentRepository` | `updateAppointment` | `PATCH /api/v1/citas/{id}` | Reprogramación o cambio de estado (`PROGRAMADA → ATENDIDA / CANCELADA` con motivo). |
| `ConsultationRepository` | `createConsultation` | `POST /api/v1/consultas` | Crea consulta `ABIERTA`; profesional se deriva de la sesión del servidor. |
| `ConsultationRepository` | `addDiagnosis` | `POST /api/v1/consultas/{id}/diagnosticos` | Agrega diagnóstico; mantiene invariante de 1 principal. |
| `ConsultationRepository` | `addTreatment` | `POST /api/v1/consultas/{id}/tratamientos` | Valida `fecha_fin >= fecha_inicio`. |
| `ConsultationRepository` | `issuePrescription` | `POST /api/v1/consultas/{id}/receta` | Emite receta inmutable; segunda emisión ordinaria devuelve `409 RECETA_EXISTENTE`. |
| `ConsultationRepository` | `finalizeConsultation` | `POST /api/v1/consultas/{id}/finalizacion` | Pasa consulta a `FINALIZADA` verificando `version`. |
| `ConsultationRepository` | `registerFullConsultation` | `POST /api/v1/consultas/completas` | Comando compuesto atómico para el Stepper de 4 pasos (`V10`). |
| `ClinicalRecordRepository` | `getTimeline` | `GET /api/v1/pacientes/{id}/historial` | Filtra por `tipos[]`, `desde`, `hasta`, `cursor` y `limite`. |
