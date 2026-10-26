# Auditoría de seguridad · E01-P1-01

Fecha: 25/10/2026 (America/Guatemala). Revisión limitada al esqueleto HTTP, configuración, dependencias y superficie expuesta de esta tarea.

**CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0 · INFO: 1 · candidatos pendientes: 0.** No hay hallazgos `CONFIRMED` ni `PROBABLE` dentro del alcance probado.

| ID | Severidad | Estado | Categoría | Evidencia |
|---|---|---|---|---|
| SEC-INFO-01 | INFO | NOT_APPLICABLE como vulnerabilidad | Superficie pública | Solo se habilitan salud y documentación; el contrato no contiene secretos. No hay endpoints clínicos ni acceso a datos. |

## Controles revisados

- `.env` está excluido por `.gitignore`; `.env.example` solo contiene valores locales no secretos. La configuración exige `APP_ENV`, `HOST`, `PORT` y `INSTITUTIONS`, comprueba tipos/rangos y no imprime valores. Pruebas de proceso verifican fallo seguro ante falta/configuración institucional inválida.
- El host de ejemplo es loopback. Una dirección de escucha externa requiere edición explícita de `HOST`; no se habilita CORS ni proxy confiable en esta tarea.
- Correlación solo acepta UUID sintácticamente válido, normaliza a minúsculas o genera uno nuevo. Respuestas 4xx/5xx no incluyen mensajes del parser, excepciones o stack. Se comprobó con entradas sintéticas en localhost.
- `npm ci` se ejecutó con `ignore-scripts=true`; se encontró el postinstall de telemetría transitivo `@scarf/scarf` por `swagger-ui-dist`, pero no se ejecutó. No hay dependencias nativas necesarias para esta base.
- `npm audit` después de fijar el override `multer: 2.5.0` informó 0 vulnerabilidades. Todas las dependencias directas tienen versión exacta y `package-lock.json`.
- La especificación servida es el contrato canónico; salud/readiness y el controlador de tests no se añaden a sus 22 rutas clínicas. Readiness es 503 mientras no existan persistencias.
- No hay Firebase Auth, sesión clínica, permiso, datos de paciente, driver, archivo privado ni transacción en el código nuevo; las pruebas BOLA y Auth quedan NOT_IMPLEMENTED para E01-P1-03/E02–E06 y no se cuentan como aprobadas.

## Riesgo residual y siguiente puerta

Esta tarea no acredita seguridad del producto final. La verificación de token/revocación, cuenta vigente, institución, roles y permisos debe auditarse en E01-P1-03 antes de habilitar endpoints protegidos; luego se deben repetir pruebas de aislamiento al integrar cada adaptador. No se probaron infraestructura pública, TLS/proxy ni despliegue, que aún no existe en el alcance.
