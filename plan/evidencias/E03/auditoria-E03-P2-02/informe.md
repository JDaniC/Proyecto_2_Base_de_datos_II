# Auditoría funcional E03-P2-02

29/10/2026, America/Guatemala. Aplicada la skill
`functional-requirements-auditor` antes del commit de implementación; revisión
complementaria de autorización con `security-auditor`. Alcance: cambios de
Firestore y enlace con los casos clínicos/agenda ya integrados. No acredita
cierre E03 ni UI clínica ni SQL. Datos sintéticos, proyectos demo únicos y
puertos loopback; ningún proyecto remoto ni secreto se utilizó.

## Fuentes e invariantes

Tarea `plan/entregas/E03_nucleo_clinico/02_P2.md#e03-p2-02`, RF-P04/P06/P08,
CA05/09/10, `plan/03_CONTRATOS_Y_FLUJOS.md` y
`Backend/docs/COMPATIBILIDAD_PERSISTENCIA_V1.md` §§2–5.
Lecturas preceden a escrituras; cada comando incluye datos, revisiones,
eventos, operación y auditoría en una transacción. Principal no implica
consentimiento. La cuenta/profesional y vínculo vigentes se releen; el snapshot
histórico no depende de perfiles actuales. Versiones exactas sin fallback.

## Inventario y trazabilidad por unidad

| Unidad auditable | Riesgo | Requisito y contrato | Prueba | Estado |
|---|---|---|---|---|
| documentoConsultaFirestore | HIGH | Signos completos, null, precisión, crecimiento único, receta y metadatos sin pérdida; límite UTF-8/físico | mapper-clinica-firestore; integración completa/límites | PASS |
| mapearConsultaFirestore | HIGH | Snapshot cerrado, pertenencia/versión y coherencia con proyección; no inventar legado | mapper-clinica-firestore; recarga/cambio de perfiles | PASS |
| crearClinicaFirestore/preparar/get/query | HIGH | Puerta 004/006, huella v2, lector transaccional; errores sin datos del motor | migración requerida/legado; fallos UoW existentes | PASS |
| pacientes.porId (reutilizado) | HIGH | Revisión común con archivo/responsables | carrera de atenciones; suite pacientes | PASS |
| profesionales.porId | HIGH | Pediatra vigente de cuenta, no autor del cliente | suite común parametrizada; receta histórica; cuenta/roles vigente | PASS |
| consultas.porId | HIGH | Consulta reconstruida sin pérdida | completa/componentes | PASS |
| consultas.porVersion | HIGH | Clave exacta, anteriores inmutables, versión ausente null | apertura/componentes/finalización y versión 99 | PASS |
| consultas.porCita | HIGH | Unicidad de consulta por cita y estado derivado | cita atendida única, repetición rechazada | PASS |
| responsables.autorizacion | CRITICAL | Vínculo activo/autorizante, versión y documento/nombre histórico | principal sin permiso, inactivo y retirada concurrente | PASS |
| citas.porId | HIGH | Identidad, pertenencia, duración legada desconocida, estado derivado y cancelación | cita compuesta; cancelación/reprogramación | PASS |
| citas.listar | MEDIUM | Filtros antes de página, rango civil, orden, cursor autenticado por actor/permisos/filtros | dos páginas, filtro estado/q/DESC y otra cuenta | PASS |
| citas.solapamientos | CRITICAL | Reserva por pediatra, intervalo semiabierto, legado indeterminado bloquea | dos pacientes reservan el mismo intervalo; adyacencia 09:00/09:30 | PASS |
| aplicarCambiosClinicosFirestore | CRITICAL | Una UoW, lectura previa, consulta+cita+revisión de paciente+eventos/versiones | compuesta, fallo antes de auditoría, concurrencia | PASS |
| aplicarCambiosAgendaFirestore | HIGH | Agenda/revisión/paciente/auditoría/operación juntas; reserva por pediatra | creación/reprogramación/cancelación y carrera | PASS |
| crearUnidadDeTrabajoPacientesFirestore (enlace) | CRITICAL | Enrutado por caso a escritor; operaciones y revisión con la misma transacción | integración clínica; suite UoW/pacientes | PASS |
| snapshotClinicoV1/signosV1 (ambos esquemas) | HIGH | Objeto cerrado y límites; campos desconocidos rechazados | mapper/límites; 82 pruebas modelo | PASS |
| prepararClinicaFirestore (migración) | CRITICAL | Huella conocida, respaldo, cursor durable, nueva/existente, reanudación sin pérdida | instalación nueva; interrupción/legado/respaldo/deriva | PASS |
| ConsultarCitas.listar / PuertosClinicos | MEDIUM | Añadir ámbito de cuenta/permisos al cursor sin dependencia externa en aplicación | cursor de otra cuenta rechazado; arquitectura | PASS |
| ejecutor de integración | HIGH | Solo emulador loopback/proyecto demo, temporales y puertos propios | ejecución local con destino validado al inicio del test | PASS |

## Segunda pasada y desviaciones corregidas

- No existía persistencia clínica Firestore: se implementó lector, mapper,
  escritor y enlace UoW (NOT_IMPLEMENTED inicial, ahora PASS).
- El modelo omitía signos/metadatos contractuales: extensión cerrada v2,
  snapshot por versión, medición común y migración 006 (SUB_IMPLEMENTADO
  inicial, ahora PASS).
- La migración de ensayo no validaba el manifiesto existente ni tenía cursor:
  se sustituyó por migración con respaldo y reanudación (ahora PASS).
- Dos copias del SDK no reconocían FieldPath/Timestamp de la otra instalación:
  clave documental portable en migración y normalización a Date comprobada
  con destino real del emulador (regresión de migración existente PASS).
- La suite del inicializador esperaba diez índices. Se actualizó a once y se exige explícitamente el índice cita_id+estado; no cambia ninguna regla clínica.
- Contención puede agotar tres intentos y dar 503; no se oculta ni se cambia
  versión automáticamente. La prueba verifica único commit y que una nueva
  invocación con versión vieja obtiene VERSION_DESACTUALIZADA tras cesar la
  contención. No se reintenta silenciosamente sobre datos nuevos.

Las clases de equivalencia de entrada/estado/permisos/idempotencia se heredan
de `atencion-clinica.test.ts` y `clinica-http.test.ts` y se ejecutaron otra vez;
no se reemplazaron por mocks como prueba de persistencia. El test nuevo cubre
fallo después de datos antes de auditoría, colecciones/revisión sin cambios,
reintento, componentes ilegales y límites. Pruebas de frontend y cuatro motores
son NOT_APPLICABLE al cierre individual de este adaptador; pertenecen a la
integración E03-P2-03 y al cierre de fase.

## Seguridad complementaria

No se añadió endpoint ni se aceptó autoridad de UI. Revocación de permisos al
recuperar una operación ya confirmada y cursor de otra cuenta se rechazan en
el emulador. Vínculo retirado concurrentemente ordena la atención antes de la
retirada o impide confirmarla; una atención posterior falla. No se halló
vulnerabilidad confirmada en este alcance; no es auditoría global de seguridad.

## Ejecución y matriz final

Resultados y comandos exactos en `../E03-P2-02.md`. PASS: unidades e invariantes
anteriores. FAIL: 0 al cerrar esta pasada. BLOCKED: 0 en las pruebas individuales
requeridas. NOT_IMPLEMENTED: 0 en este adaptador. No se acredita corrección de
consulta finalizada por HTTP (E03-P1-03), UI clínica (E03-P2-03), despliegue de
índices/IAM remotos ni equivalencia integrada de cuatro motores.

Revisión nativa de Codex e integración: pendientes al preparar este informe;
solo se registrarán como completadas después de comprobar el SHA revisado.


## Segunda pasada tras publicación 98682e5

Se amplió el caso de rollback del emulador con fallo de persistencia de receta
(concentración inválida inyectada después del plan aceptado), además del fallo
de auditoría. En ambos se comparan tamaños de consultas/operaciones/auditoría/
eventos y revisión del paciente, sin cambios. Este ajuste añade evidencia CA05;
no cambia implementación ni contrato. Se ejecuta y audita antes del siguiente
commit, y se requiere revisión nativa sobre el nuevo SHA.

## Hallazgo de Codex sobre be31a87 y nueva auditoría

CF01, DIVERGENTE/MEDIUM, confirmado estáticamente: `citas.listar` combina
`pediatra_id ==` con rango/orden DESC por `fecha_hora`; el manifiesto solo
incluía ASC. Una ejecución en emulador no detecta un índice remoto faltante.
La [documentación oficial de índices](https://firebase.google.com/docs/firestore/query-data/index-overview#queries_supported_by_manual_indexes)
exige la dirección adicional para esa consulta. No se realizó prueba contra
proyecto remoto compartido.

Corrección: índice `citas(pediatra_id ASCENDING, fecha_hora DESCENDING)`,
manifiesto objetivo/huella regenerados y aserción explícita de los dos campos
y direcciones en la suite del modelo; hay doce índices compuestos. El caso de
agenda añade profesional_id+DESC a los filtros probados. Se repite clínica,
modelo offline/emulador, backend, lint y build antes de publicar.

La nueva ejecución de contención mostró que dos reservas pueden agotar
reintentos antes de que alguna confirme. El contrato permite 503 tras tres
intentos. El test conserva las dos claves/DTO, exige como máximo un commit
concurrente y recupera ambas mismas intenciones cuando ambas recibieron 503:
una confirma y la otra devuelve CITA_SOLAPADA; la lectura acredita exactamente
una cita. No se transforma 503 en éxito ni se omite la conservación de datos.
La evidencia ya no depende de que el emulador elija un ganador antes del plazo.


Resultado de la pasada CF01 antes de commit: 12 clínica emulador, 82 modelo
offline y 99 modelo emulador PASS; 270+32 backend PASS; lint/build PASS;
diff-check PASS. Estado CF01 corregido con prueba de configuración; pendiente
validación nativa del nuevo SHA. No se atribuye al emulador la comprobación de
los requisitos de índices de un servicio remoto.


## CF02 · Pareja versión/huella del migrador

Segunda pasada de requisitos §4: la condición inicial comprobaba versión y
huella como dos listas independientes. El análisis de esa condición admitía
v2 con huella v1, combinación no documentada como origen válido. Se sustituyó
por dos parejas explícitas (v1+huella origen, v2+huella objetivo). La prueba
nueva presenta v2+huella origen y exige error de manifiesto y ausencia de
configuración clínica creada; después restaura la pareja origen conocida y
comprueba interrupción/reanudación como antes. 12 pruebas clínicas PASS, lint
y diff-check PASS antes del commit. Es una corrección de precondición de la
migración, sin cambio del esquema ni del contrato HTTP.
