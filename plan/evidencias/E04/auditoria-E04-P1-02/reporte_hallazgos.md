# Reporte de Hallazgos y Evaluación Funcional — E04-P1-02

## Resumen Ejecutivo
- Requisitos evaluados: `RF-H06`, `RF-H07`, `CA17`, `DEC07`.
- Veredicto funcional: **PASS** (0 desviaciones, 0 bloqueos).
- Entornos probados:
  - Pruebas unitarias y de arquitectura backend: 283/283 PASS.
  - Pruebas de contrato y fixtures: 32/32 PASS.
  - Pruebas de integración SQL (PostgreSQL & MySQL locales reales): 6/6 PASS, incluyendo caso `CA17` de no solapamiento temporal y traslado atómico.
  - Pruebas HTTP Frontend: 76/76 PASS.
  - Pruebas E2E de extremo a extremo cuatro motores: 52/52 PASS.

## Detalle de Casos de Prueba

### Caso 1: Ingreso Hospitalario y Asignación de Cama
- **Entrada:** `POST /api/v1/hospital/hospitalizaciones` con `pacienteId`, `camaId`, `diagnosticoIngresoCIE: 'I10'`, `motivoIngreso`.
- **Comportamiento esperado:** Crear hospitalización en estado `ACTIVA`, asignar cama inicial con `fecha_hora_inicio`, marcar cama como `OCUPADA`.
- **Resultado:** PASS (verificado en suite runtime y en base PostgreSQL real).

### Caso 2: Exclusión Concurrente de Camas (`CA17`)
- **Entrada:** Segundo intento de asignación sobre cama ya ocupada sin intervalo cerrado.
- **Comportamiento esperado:** Rechazo inmediato con código `ESTADO_INVALIDO` / `CAMA_NO_DISPONIBLE` protegiendo la restricción `EXCLUDE USING gist` en PostgreSQL.
- **Resultado:** PASS (verificado en integración SQL).

### Caso 3: Traslado Atómico de Cama
- **Entrada:** `POST /api/v1/hospital/hospitalizaciones/{id}/asignacion-cama` con `nuevaCamaId`.
- **Comportamiento esperado:** En una sola transacción, cerrar asignación previa fijando `fecha_hora_fin` y abrir nueva asignación con `fecha_hora_inicio`. Cama previa vuelve a `DISPONIBLE` y nueva pasa a `OCUPADA`.
- **Resultado:** PASS (verificado en integración SQL y Frontend).

### Caso 4: Egreso Hospitalario y Liberación de Cama
- **Entrada:** `POST /api/v1/hospital/hospitalizaciones/{id}/egreso` con diagnóstico y resumen clínico.
- **Comportamiento esperado:** Estado pasa a `FINALIZADA`, se fija `fecha_egreso`, se cierra asignación de cama abierta y la cama queda liberada (`DISPONIBLE`).
- **Resultado:** PASS (verificado en integración SQL, runtime y Frontend).

### Caso 5: Aislamiento Institucional (`DEC07`)
- **Entrada:** `GET /api/v1/hospital/camas` con token perteneciente a `CLINICA_ODONTOLOGICA`.
- **Comportamiento esperado:** HTTP 403 `SIN_PERMISO`.
- **Resultado:** PASS (verificado en `clinica-http.test.ts`).
