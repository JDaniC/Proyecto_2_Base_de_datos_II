# Cierre funcional E04 — Hospital, odontología y pediatría

Corte verificado: 03/11/2026, America/Guatemala. Responsable: JDaniC. Este acta registra criterios funcionales acreditados; su publicación e integración documental se tramitan en PR #75, sin anticipar la revisión de ese PR.

## Implementaciones integradas

| Tarea | PR / commit integrado | Evidencia |
|---|---|---|
| E04-P1-01 Agenda | #67 / d4e5a68 | [detalle](E04-P1-01.md) |
| E04-P1-02 Hospitalización | #68 / baa763e | [detalle](E04-P1-02.md) |
| E04-P1-03 Servicios hospitalarios | #70 / fbe58e3 | [detalle](E04-P1-03.md) |
| E04-P2-01 Pediatría | #71 / f4310a1 | [detalle](E04-P2-01.md) |
| E04-P2-02 Vacunas | #73 / 02910f0 | [detalle](E04-P2-02.md) |
| E04-P2-03 Integración | #74 / 8c2a5d1 | [detalle](E04-P2-03.md) |

Las dependencias constan en develop. PR #74 fue fusionado el 02/11/2026 (03:01 UTC del día 03), con CodeRabbit APPROVED sobre 94d86ed y revision-coderabbit SUCCESS. El check nativo aparece CANCELLED después del merge; no se confunde con el resultado de la aprobación anterior. La revisión del cierre documental #75 se verificará antes de integrarlo.

## Demostración y criterios

[Demostración final con huella corregida](auditoria-cierre-2026-11-02/integral-huella-final.json): 87/87 PASS, exit0, sobre d4b3a8e. Se verificó que desde ese SHA hasta develop 8c2a5d1 solo hay diferencias en tres documentos. Esta es evidencia existente comprobada, no una nueva ejecución de 03/11. El [informe funcional](auditoria-cierre-2026-11-02/INFORME.md) conserva el diagnóstico, fallos de intentos previos y reparaciones; sus estados administrativos anteriores son cortes históricos sustituidos por las verificaciones de esta acta.

| Criterio de salida | Evidencia | Resultado |
|---|---|---|
| Cita dental y agendas hospital/pediatría; recarga, móvil/escritorio, cancelación y conflicto | Recorridos hospital28/dental15/pediatría32 | PASS |
| Estancia, traslado/liberación de cama, evolución y egreso | Hospital28 | PASS |
| Exámenes, parámetros versionados, procedimientos y póliza/cobertura | Hospital28 | PASS |
| Responsable compartido, autorización independiente, antecedentes y crecimiento | Pediatría32 | PASS |
| Catálogo versionado, esquema asignado, aplicación, corrección, anulación e historia | Pediatría32, pruebas Firestore vacunas10 | PASS en emulador |
| Persistencia tras reinicio y reintentos idempotentes | Recorrido87, reinicio de proceso y migraciones reejecutadas | PASS |
| Restricciones institucionales y errores recuperables | Recorrido87 y negativas HTTP/scope citadas en informe | PASS en escenarios declarados |
| Índices ASC/DESC y actualización explícita de huella sin pérdida | Contrato y migración010,20 clínicas emuladas | PASS; disponibilidad cloud no probada |

Entorno: Chromium y HTTP reales; PostgreSQL/MySQL/MongoDB aislados; Firebase Auth/Firestore emulados. Las 32 pediátricas forman parte de las87, no se suman de nuevo. Suites finales citadas en E04-P2-03:326 runtime/unitarias+34 contratos,118 HTTP frontend,20 clínicas emuladas, lint/arquitectura/build PASS. No se ejecutaron de nuevo para este cambio documental.

## Continuidad

Instalación nueva y existente deben aplicar las migraciones explícitas correspondientes, incluidas008/009/010. Para cloud, publicar/verificar índices listos antes de010; si resulta RECONCILIAR, detener escritores hasta conciliación verificable. No basta modificar inicializadores.

E05 implementará órdenes, muestras, análisis/resultados, inventario/calidad, informes y cobro de laboratorio. E06 conserva reconciliación de pruebas históricas y auditoría global; E07 conserva instalación en otro equipo, comparativo y retroalimentación docente. Esta acta no acredita esos entregables ni producción Firestore. La puerta E05 se habilita únicamente después de integrar el cierre documental con revisión automática real.
