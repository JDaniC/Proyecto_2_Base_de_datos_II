# Catálogo de Requisitos — E04-P2-01

## Fuentes Normativas
- `plan/entregas/E04_hospital_dental_pediatria/02_P2.md#e04-p2-01`
- `Database/centro_pediatrico_firestore.md`
- `Frontend/src/services/contracts.ts` (PatientRepository)
- `Backend/docs/openapi.yaml` y `Backend/docs/mapa-ui-v1.json`

## Requisitos Evaluados

| ID Requisito | Descripción | Criterio de Aceptación | Fuente |
|---|---|---|---|
| `RF-P01` | Identificación y filiación pediátrica | Menores con responsables adultos. Al menos un responsable principal activo por menor. | `02_P2.md#e04-p2-01`, `centro_pediatrico_firestore.md` |
| `RF-P02` | Responsables compartidos | Raíz de adultos compartida (`responsables/{id}`). Un adulto puede vincularse a múltiples pacientes sin duplicar sus datos personales ni contacto. | `02_P2.md#e04-p2-01` |
| `RF-P03` | Principalidad y autorización independientes | La condición de responsable principal y la autorización de atenciones se configuran por separado en cada vínculo `pacientes/{id}/responsables/{rid}`. | `02_P2.md#e04-p2-01` |
| `RF-P04` | Baja lógica y concurrencia | Bajas lógicas de vínculos sin pérdida de historia. Dos bajas concurrentes actualizan la misma revisión del paciente y rechazan dejar al paciente sin principal activo. | `02_P2.md#e04-p2-01`, `CA09` |
| `RF-P05` | Antecedentes y alergias estructuradas | Alergias con severidad ('LEVE', 'MODERADA', 'SEVERA'), reacción y estado; perinatales con Apgar (cero admitido) y parto; historia general de 4 listas. | `02_P2.md#e04-p2-01` |
| `RF-P06` | Inmutabilidad y versionado de antecedentes | Snapshot inmutable por revisión en `pediatria_antecedentes/{id}/versiones`; evento `ANTECEDENTE` en historial clínico; motivo y autor registrados. | `02_P2.md#e04-p2-01` |
| `RF-P07` | Control de crecimiento | Paginación por consulta; cálculo exacto de edad en meses y IMC si talla y peso son positivos; sin talla no se inventa IMC ni curvas automáticas. | `02_P2.md#e04-p2-01`, `CA10` |
| `RF-P08` | Rectificación clínica autorizada en archivo | El archivo bloquea nuevas atenciones pero permite rectificar antecedentes existentes con autorización clínica explícita y motivo justificado. | `02_P2.md#e04-p2-01`, `DEC18` |
| `CA09` | Transacciones atómicas Firestore | Raíz compartida y vínculos se actualizan en la misma UoW con revisión, auditoría y clave determinista; rechazo de último principal revierte la transacción. | `plan/00_PLAN_MAESTRO.md` |
| `CA10` | Fechas gregorianas y años bisiestos | Cálculo de edad en meses sobre fecha civil sin conversión horaria de nacimiento ni años bisiestos rotos. | `plan/00_PLAN_MAESTRO.md` |
| `DEC06` | Canónico de institución pediátrica | Servidor y persistencia usan `CENTRO_MEDICO_PEDIATRICO`; UI usa alias `CENTRO_PEDIATRICO` mediante mappers. | `plan/01_ALCANCE_Y_DECISIONES.md` |
| `DEC07` | Contexto de autenticación seguro | Institución y permisos provienen exclusivamente de token verificado y cuenta local, nunca del body cliente. | `plan/01_ALCANCE_Y_DECISIONES.md` |
