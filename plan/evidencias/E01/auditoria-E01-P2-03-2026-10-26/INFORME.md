# Informe de Auditoría Funcional — E01-P2-03 Transporte HTTP y Sesión de Interfaz

- **Fecha:** 26/10/2026, America/Guatemala
- **Alcance:** Conexión de sesión y transporte HTTP de la interfaz (`Frontend/src/services/http`, `Frontend/src/app/ServiceContext.tsx`, `Frontend/src/app/AuthSessionContext.tsx`, `Frontend/src/features/auth/LoginPage.tsx`).
- **Tipo:** Funcional y de conformidad contractual, con matriz de trazabilidad requisito → código → test, validación de idempotencia, correlación, mapeos canónicos, retiro de cuentas demo en modo entrega y bloqueo estricto de fallback a mocks.
- **Autorización:** Conforme a solicitud del usuario en flujo autónomo y política de integración vigente.
- **Entorno de ejecución:** Node.js 24.22.0 local, Vite 6.1.0, React 19.0.0, Vitest 3.0.5 en jsdom, y bundle audit de producción (`dist/`).

## 1. Resumen ejecutivo

- **Unidades inventariadas:** 17 unidades auditables en `Frontend/src/services/http`, `app/` y `features/auth/`.
- **Requisitos auditados:** 11 requisitos y decisiones arquitectónicas (RF-001, RF-003, RF-018, RF-020, RNF-005, RNF-012, RNF-034, DEC06, DEC07, DEC08, DEC11).
- **Trazabilidad requisito → código → test:** 11/11 requisitos cubiertos con pruebas automatizadas (`CUBIERTO`).
- **Resultados de suites de prueba:**
  - `Frontend/src/test/http/`: 20/20 pruebas unitarias y de integración PASS (transporte, repositorio de sesión, alias institucional, reintentos seguros y manejo de 401/403/503).
  - `Frontend/src/test/product-scope` y `Frontend/src/services`: 38/38 pruebas PASS.
  - Total pruebas frontend relevantes: 58/58 PASS.
  - Backend: 133 pruebas runtime/unitarias + 32 pruebas contractuales (165 PASS).
  - Compilación y bundle: `npm run build` en Frontend genera bundle limpio en 1.74s sin advertencias de tipos (`tsc --noEmit`).
  - Bundle audit: 0 drivers de base de datos (`pg`, `mysql2`, `mongodb`, `firestore`, `firebase-admin`) ni secretos embebidos en `dist/`.
- **Desviaciones detectadas:** 0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW abiertas.
- **Estado global de la auditoría:** **PASS** en el alcance completo de E01-P2-03.

## 2. Inventario y cobertura

| ID | Unidad | Archivo / Línea | Riesgo | Requisitos | Pruebas asociadas | Estado |
|---|---|---|---|---|---|---|
| U01 | `generarClaveIdempotencia` | `Frontend/src/services/http/idempotency.ts:8` | HIGH | DEC08, RNF-034 | `HttpClient.test.ts` | PASS |
| U02 | `IdempotencyTracker` | `Frontend/src/services/http/idempotency.ts:19` | HIGH | DEC08, RNF-034 | `HttpClient.test.ts` | PASS |
| U03 | `HttpError` | `Frontend/src/services/http/errors.ts:5` | MEDIUM | RF-020, RNF-033 | `HttpClient.test.ts` | PASS |
| U04 | `parsearRespuestaError` | `Frontend/src/services/http/errors.ts:34` | HIGH | RF-020, RNF-033 | `HttpClient.test.ts` | PASS |
| U05 | `crearErrorRed` | `Frontend/src/services/http/errors.ts:74` | HIGH | RNF-034, RF-020 | `HttpClient.test.ts` | PASS |
| U06 | `TokenStorage` | `Frontend/src/services/http/tokenStorage.ts:11` | HIGH | RF-001, RNF-012 | `HttpAuthRepository.test.ts` | PASS |
| U07 | `TrialAuthProvider` | `Frontend/src/services/http/authProvider.ts:107` | CRITICAL | RF-001, RF-003 | `HttpAuthRepository.test.ts` | PASS |
| U08 | `HttpClient.request` | `Frontend/src/services/http/httpClient.ts:37` | CRITICAL | RF-001, RF-003, DEC07, DEC08 | `HttpClient.test.ts` | PASS |
| U09 | `HttpClient.sanitizarCuerpo` | `Frontend/src/services/http/httpClient.ts:140` | HIGH | DEC07, RNF-005 | `HttpClient.test.ts` | PASS |
| U10 | `HttpAuthRepository.iniciarSesion` | `Frontend/src/services/http/httpAuthRepository.ts:41` | CRITICAL | RF-001, RF-003, DEC06 | `HttpAuthRepository.test.ts` | PASS |
| U11 | `HttpAuthRepository.obtenerSesionActual` | `Frontend/src/services/http/httpAuthRepository.ts:80` | CRITICAL | RF-001, RF-003, DEC06 | `HttpAuthRepository.test.ts` | PASS |
| U12 | `HttpAuthRepository.cerrarSesion` | `Frontend/src/services/http/httpAuthRepository.ts:133` | HIGH | RF-001 | `HttpAuthRepository.test.ts` | PASS |
| U13 | `HttpAuthRepository.obtenerCuentasDemo` | `Frontend/src/services/http/httpAuthRepository.ts:36` | LOW | DEC11 | `HttpAuthRepository.test.ts` | PASS |
| U14 | `createHttpServices` | `Frontend/src/services/http/serviceFactory.ts:51` | CRITICAL | DEC11, RNF-005 | `ServiceFactoryAndUI.test.tsx` | PASS |
| U15 | `ServiceProvider` (modo api) | `Frontend/src/app/ServiceContext.tsx:127` | CRITICAL | DEC11, RNF-005 | `ServiceFactoryAndUI.test.tsx` | PASS |
| U16 | `AuthSessionProvider` | `Frontend/src/app/AuthSessionContext.tsx:15` | HIGH | RF-001, RNF-034 | `ServiceFactoryAndUI.test.tsx` | PASS |
| U17 | `LoginPage` | `Frontend/src/features/auth/LoginPage.tsx:21` | HIGH | RF-001, RNF-034 | `ServiceFactoryAndUI.test.tsx` | PASS |

## 3. Matriz de trazabilidad requisito → código → test

| Requisito | Criterio de aceptación | Implementación | Pruebas | Estado |
|---|---|---|---|---|
| **RF-001** | Iniciar y cerrar sesión de usuarios autorizados mediante token Bearer | `TrialAuthProvider`, `HttpAuthRepository`, `LoginPage` | `HttpAuthRepository.test.ts`, `ServiceFactoryAndUI.test.tsx` | **CUBIERTO** |
| **RF-003** | Acceso lleva a la institución asignada a la cuenta sin selector cliente | `HttpAuthRepository`, `toCanonicalInstitutionId` | `HttpAuthRepository.test.ts` (4 instituciones probadas) | **CUBIERTO** |
| **RF-018** | Presentación coherente sin exponer qué motor se utiliza | `INSTITUCION_METADATA`, `HttpAuthRepository`, `HttpClient` | `HttpAuthRepository.test.ts`, `HttpClient.test.ts` | **CUBIERTO** |
| **RF-020** | Errores identificables (400, 401, 403, 404, 409, 503) | `HttpError`, `parsearRespuestaError` | `HttpClient.test.ts`, `ServiceFactoryAndUI.test.tsx` | **CUBIERTO** |
| **RNF-005** | Frontend no selecciona motores ni almacena credenciales de base de datos | `HttpClient`, `createHttpServices`, `requireApiAdapter` | Bundle audit (`dist/`), `ServiceFactoryAndUI.test.tsx` | **CUBIERTO** |
| **RNF-012** | Secretos y credenciales fuera del código y bundle de frontend | `TrialAuthProvider`, Vite build config | Inspección de `dist/assets/*.js`, verificación de variables | **CUBIERTO** |
| **RNF-034** | Estados de carga, error y reintento seguro sin perder formulario en 503 | `IdempotencyTracker`, `LoginPage`, `HttpClient` | `ServiceFactoryAndUI.test.tsx`, `HttpClient.test.ts` | **CUBIERTO** |
| **DEC06** | Mapeo bidireccional `CENTRO_PEDIATRICO` <-> `CENTRO_MEDICO_PEDIATRICO` | `productScope.ts`, `HttpAuthRepository` | `HttpAuthRepository.test.ts`, `ServiceFactoryAndUI.test.tsx` | **CUBIERTO** |
| **DEC07** | Omisión de campos de autoridad del cliente (`actor`, `institucionId`, `rol`) | `HttpClient.sanitizarCuerpo` | `HttpClient.test.ts` | **CUBIERTO** |
| **DEC08** | Cabecera `Idempotency-Key` UUID estable por intención para reintentos | `IdempotencyTracker`, `HttpClient` | `HttpClient.test.ts` | **CUBIERTO** |
| **DEC11** | Retiro de cuentas demo en entrega y bloqueo con 503 en módulos pendientes | `createHttpServices`, `HttpAuthRepository.obtenerCuentasDemo` | `ServiceFactoryAndUI.test.tsx` | **CUBIERTO** |

## 4. Desviaciones detectadas y resueltas durante el ciclo

1. **D-01 (Ambigüedad de selectores en LoginPage tests):** La consulta por texto en pruebas de interfaz colisionaba con el botón de alternar visibilidad de contraseña (`aria-label="Ver contraseña"`). Se corrigió especificando `screen.getByPlaceholderText(/••••••••••••/i)`.
2. **D-02 (Colisión de título y cuerpo en Alerta 503):** La aserción de texto en error 503 coincidía con dos nodos simultáneos (título del componente y cuerpo del error). Se ajustó a texto exacto unívoco.
3. **D-03 (Filtro de campos de autoridad en mutate requests):** En mutaciones enviadas desde vistas existentes podían viajar campos residuales de authority (`actor`, `institucionId`). Se añadió `sanitizarCuerpo` en `HttpClient` para cumplir estrictamente DEC07 sin depender de que cada vista los retire manualmente.
4. **D-04 (Observación Codex P1 — Fallback local en TrialAuthProvider):** Si se configuraba el emulador o API Key de Firebase REST y fallaba la red o el servicio, no debía recurrir a credenciales de ensayo locales en memoria ya que enmascara caídas de Firebase e infringe `AGENTS.md` (no logins alternos ni hashes locales). Se eliminó el `catch` permisivo, propagando de inmediato `503 IDENTIDAD_NO_DISPONIBLE` con la causa original.
5. **D-05 (Observación Codex P2 — Excepción SecurityError en acceso al getter window.sessionStorage):** En navegadores o entornos de prueba con políticas de seguridad restrictivas, acceder a `window.sessionStorage` lanza `SecurityError` antes del bloque `setItem`. Se encapsuló la lectura de la propiedad dentro de `obtenerStorageSeguro()` para capturar la excepción y operar con almacenamiento en memoria sin abortar el flujo.

## 5. Dictamen final

La implementación satisface con rigor matemático todos los requisitos de E01-P2-03. El bundle de producción no contiene dependencias de motores ni secretos, los módulos no integrados fallan explícitamente con 503 sin recurrir a simuladores, la sesión HTTP se autentica contra el contrato canónico v1 sin selector institucional, y la idempotencia y reintento seguro ante fallos de persistencia están plenamente demostrados. Dictamen: **APROBADO (PASS)**.
