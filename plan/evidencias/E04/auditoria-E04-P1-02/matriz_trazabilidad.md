# Matriz de Trazabilidad Requisito → Código → Test — E04-P1-02

| Requisito | Código Implementado | Tests de Verificación | Estado |
|---|---|---|---|
| `RF-H06` (Ingreso hospitalario y asignación inicial) | `Backend/src/aplicacion/casos-uso/hospital/gestionar-hospitalizaciones.ts`<br>`Backend/src/adaptadores/salida/postgresql/hospital/puertos-hospital-postgresql.ts` | `Backend/tests/runtime/clinica-http.test.ts`<br>`Backend/tests/integracion/clinica-sql.test.ts`<br>`Frontend/src/test/http/HospitalHttp.test.tsx` | PASS |
| `RF-H07` (Control de camas y traslados atómicos) | `Backend/src/adaptadores/salida/postgresql/hospital/puertos-hospital-postgresql.ts`<br>`Backend/src/adaptadores/entrada/http/hospital/hospital.controller.ts` | `Backend/tests/integracion/clinica-sql.test.ts`<br>`Frontend/src/test/http/HospitalHttp.test.tsx` | PASS |
| `CA17` (Exclusión concurrente y liberación en egreso) | `Database/hospital_general_postgresql.sql`<br>`Backend/src/adaptadores/salida/postgresql/hospital/puertos-hospital-postgresql.ts` | `Backend/tests/integracion/clinica-sql.test.ts`<br>`Backend/tests/runtime/clinica-http.test.ts` | PASS |
| `DEC07` (Aislamiento institucional y roles verificados) | `Backend/src/adaptadores/entrada/http/hospital/hospital.controller.ts`<br>`Backend/src/adaptadores/entrada/http/guardia-autorizacion.ts` | `Backend/tests/runtime/clinica-http.test.ts` | PASS |
