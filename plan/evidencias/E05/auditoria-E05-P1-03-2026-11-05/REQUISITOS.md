# Requisitos auditados de E05-P1-03

Fuentes: Agente/REQUERIMIENTOS_FUNCIONALES.md RF-L11/L12; Agente/REQUERIMIENTOS_NO_FUNCIONALES.md RNF-023/024/026/027; Agente/DISENO_PROYECTO.md §3.4.2 y CA14/16; plan/entregas/E05_laboratorio/01_P1.md §03; plan/02 y plan/03; M03 facturas/pagos; contrato OpenAPI de las siete operaciones. Alcance backend de esta tarea, sin acreditar módulos futuros.

| ID | Fuente | Criterio verificable | Prioridad |
|---|---|---|---|
| R01 | RF-L11; tarea E05-P1-03 §1 | Emitir factura con receptor, moneda y líneas de precios acordados congelados. | CRITICAL |
| R02 | RNF-026; tarea §1 | Centavos enteros GTQ y total seguro por línea, sin redondeo decimal implícito. | CRITICAL |
| R03 | RF-L11; CA14; tarea §2 | Pago positivo parcial/exacto, sin superar saldo ni mezclar moneda. | CRITICAL |
| R04 | RNF-023/027; CA14 | Idempotencia en emisión/pago/reversión/anulación y rechazo de clave con otra entrada. | CRITICAL |
| R05 | RNF-027; CA14; tarea excepciones | Serializar pagos por revision_cobro, sin dos éxitos por último saldo. | CRITICAL |
| R06 | RF-L11; tarea §3; diseño §3.4.2 | Revertir una vez con motivo/actor/fecha, conservar el pago original. | CRITICAL |
| R07 | RF-L11; tarea §3; RNF-024 | Anular solo tras reversión de pagos; conservar receptor/líneas y revisiones. | CRITICAL |
| R08 | RNF-027; tarea criterio | Datos, revisión, operación y auditoría atómicos; fallo no deja escritura parcial. | CRITICAL |
| R09 | RF-L12; tarea §4; plan/03 §7 | Detalle y filtros por orden/paciente/estado/rango; listas paginadas estables y cursor correcto. | HIGH |
| R10 | plan/01 DEC; tarea §4 | Cobro previo continúa tras archivo de paciente. | HIGH |
| R11 | AGENTS; plan/03 §7 | Identidad e institución verificadas y cuenta/permiso vigente, sin autoridad del cliente. | HIGH |
| R12 | plan/03 §7; tarea fallos | Entrada cerrada, versiones UUID y límites; errores saneados, sin éxito ante caída. | HIGH |
| R13 | AGENTS persistencia; M03 | Reutilizar esquema/índices; fallar cerrado ante deriva/legado incompatible, sin modificar inicializadores. | HIGH |
| R14 | plan/02; AGENTS arquitectura | Dominio/aplicación puros, session compartida y efectos externos fuera de callbacks. | HIGH |
| R15 | Petición humana05/11 y plan/11 | Para PR nuevos: ambas auditorías PASS antes de abrir y reserva exclusiva adquirida antes de implementar, con desempate por primera creación atómica y liberación con SHA esperado. Excepción PR79, ya abierto al recibirse la política: auditar antes de continuar revisión/integración y conservar su reserva por el PR existente, sin adquisición retroactiva | HIGH |
