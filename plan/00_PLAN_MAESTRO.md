# Plan de construcción y entrega final

Actualizado el 07/11/2026. E00–E04 están integradas. El trabajo técnico pendiente se concentra en **una sola fase, E05**, con tres tareas encadenadas. E06 y E07 se conservan como historial del plan anterior.

## 1. Resultado que debe alcanzarse

Una aplicación cliente-servidor que use la interfaz React existente, un backend hexagonal común y cuatro persistencias: Hospital/PostgreSQL, Odontología/MySQL, Laboratorio/MongoDB y Pediatría/Firestore. Debe permitir alta/búsqueda de pacientes, mantenimiento de consultas, diagnósticos, tratamientos y recetas, historial ordenado y archivo sin pérdida. La institución se obtiene de la identidad autenticada. El cierre técnico incluye la visualización y persistencia de resultados analíticos en el laboratorio, junto con la verificación del recorrido común en los cuatro motores.

La [base de alcance](01_ALCANCE_Y_DECISIONES.md) resume la consigna suministrada y resuelve las diferencias de los documentos locales. La arquitectura es un medio para demostrar modelado, consistencia y seguridad; no requiere microservicios ni pantallas nuevas para cada tabla.

## 2. Dos integrantes y una cola compartida

Daniel (JDaniC) y David (Davidix888) pueden tomar tareas de ambos lotes. P1/P2 conservan la agrupación original y los IDs, no asignaciones exclusivas. Consultar [protocolo de continuidad](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md).

Cada tarea tiene un único ejecutor activo registrado en el tablero. CodeRabbit revisa el PR. La revisión del compañero es opcional. El ejecutor puede cambiar mediante traspaso sin crear otra tarea, rama o ID. Las fechas corresponden al trabajo, no a una persona.

Priorizar la siguiente tarea libre cuyas dependencias estén integradas. No esperar a que el compañero ejecute una tarea marcada originalmente P2/P1: si está libre, puede tomarla quien esté disponible. Las dependencias técnicas y las puertas de fase siguen siendo obligatorias.

## 3. Entregas y puertas de cierre

| Fase | Resultado demostrable | Lote P1 (cualquiera) | Lote P2 (cualquiera) | Puerta para cerrar |
|---|---|---|---|---|
| E00 | Base de trabajo y contrato acordado; bloqueos de auditoría tratados | [Alcance, corrección PG, API](entregas/E00_base_y_contratos/01_P1.md) | [Entornos, inventario UI, arnés de pruebas](entregas/E00_base_y_contratos/02_P2.md) | Regresión PG corregida; MySQL/Firestore ejecutables o bloqueo explícito que impide cerrar E00; contrato v1 revisado |
| E01 | Backend arranca, valida identidad y selecciona conexión institucional | [Esqueleto, núcleo/puertos, autenticación](entregas/E01_fundacion_backend/01_P1.md) | [Unidades de trabajo SQL/NoSQL y cliente HTTP](entregas/E01_fundacion_backend/02_P2.md) | Sesión real de ensayo para cuatro instituciones; aislamiento y rollback básico |
| E02 | Alta, búsqueda, edición e historial inicial persistidos | [Casos comunes, adaptadores SQL, UI pacientes](entregas/E02_pacientes_historial/01_P1.md) | [Adaptadores Mongo/Firestore, consultas cronológicas](entregas/E02_pacientes_historial/02_P2.md) | Alta atómica, duplicados y búsquedas probados en cuatro motores |
| E03 | Atención clínica común completa y archivo | [Casos clínicos, SQL, revisión/archivo](entregas/E03_nucleo_clinico/01_P1.md) | [Mongo, Firestore, UI clínica/equivalencia](entregas/E03_nucleo_clinico/02_P2.md) | Consulta + diagnóstico + tratamiento + receta; fallo revierte; archivo conserva historia |
| E04 | Hospital, odontología y pediatría completos | [Agenda dental, hospitalización/cama, exámenes/seguros](entregas/E04_hospital_dental_pediatria/01_P1.md) | [Responsables/crecimiento, vacunas, UI institucional](entregas/E04_hospital_dental_pediatria/02_P2.md) | Demostraciones reales de las tres instituciones, incluidas carreras y revisiones |
| E05 | Cierre técnico. Laboratorio analítico y candidato reproducible | [Validación final del candidato](entregas/E05_laboratorio/01_P1.md#e05-p1-04) | [Resultados y conexión clínica](entregas/E05_laboratorio/02_P2.md) | Instalación limpia y recorridos en modo API sobre el mismo commit, con los cuatro motores |

**Alcance del cierre E00:** sus seis tareas y la puerta de fase verifican la corrección PostgreSQL, cuatro entornos de ensayo y contrato v1. Los escenarios CA01–CA20 que necesitan servidor y adaptadores pueden seguir `NOT_IMPLEMENTED` en las fases posteriores; eso no bloquea E00 ni significa que la aplicación final esté lista o persistida.

Cada fase contiene `01_P1.md` y `02_P2.md` en `entregas/`. Los dos índices de la cola compartida están en [lote P1](COLA_P1.md) y [lote P2](COLA_P2.md); ambos son ejecutables por cualquiera. El [tablero](06_TABLERO.md) es la fuente única de estados de tareas.

## 4. Orden y trabajo en paralelo

Resultados y circuito analítico integrados mediante [PR #78](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/78) y [PR #82](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/82). La [verificación final de instalación y recorridos](entregas/E05_laboratorio/01_P1.md#e05-p1-04) y el [cierre técnico E05](evidencias/E05/CIERRE.md) están registrados.

La consulta de resultados validados por orden cubre la visualización clínica del laboratorio. La emisión de archivos oficiales, inventario/calidad y la ampliación de cobros o administración quedan fuera de la ruta de cierre. Se mantienen los módulos ya integrados, las estructuras del modelo y las referencias del trabajo aplazado. La ruta de presentación se limita a capacidades disponibles en modo API.

Las dependencias se cumplen al integrar en `develop`. Para preparar fixtures independientes o coordinar archivos compartidos, consultar el tablero, los PR y las reservas. El [cronograma inicial](09_CRONOGRAMA_HASTA_05_NOV.md) es histórico.

## 5. Protocolo de cada entrega pequeña

1. Leer el estado actual y tomar una tarea disponible de cualquiera de los dos lotes; comprobar PR y reservas y adquirir la referencia remota exclusiva según plan/11.
2. Leer las fuentes y rutas indicadas. Registrar discrepancias antes de cambiar contratos.
3. Crear una rama `codex/eXX-pX-NN-descripcion` desde la integración acordada, si se trabaja con ramas. Mantener cambios ajenos intactos.
4. Implementar el alcance de la tarea y sus pruebas de éxito, rechazo y excepciones. Ejecutar con datos sintéticos y motores aislados.
5. Guardar evidencia y actualizar la fila del tablero a `EN_REVISION`, con commit/rama, resultados y limitaciones. Usar [la plantilla](plantillas/CIERRE_TAREA.md).
6. Abrir PR después de ambas auditorías de alcance en PASS. El responsable valida los casos decisivos y atiende la revisión real de CodeRabbit. Marcar `HECHA` después de integrar y verificar el resultado.
7. Al cerrar las tareas vigentes de la fase, ejecutar su demostración integrada y llenar [CIERRE_ENTREGA](plantillas/CIERRE_ENTREGA.md). Una prueba fallida devuelve la tarea al responsable; no se oculta cambiando el criterio.

## 6. Reglas para impedir retrabajo

- Preservar la UI auditada y conectar por HTTP las pantallas de laboratorio requeridas para el cierre.
- Los contratos TypeScript actuales contienen actor e institución enviados por la UI y carecen de versión en varios métodos. Son una interfaz de presentación que debe mapearse al API, no una autoridad de seguridad.
- El ejecutor de la tarea coordina puertos, OpenAPI, composición, dominio, `ServiceContext` y arnés cuando su alcance los afecte. Reservar esos archivos en el seguimiento; no editarlos simultáneamente en dos tareas.
- Una migración SQL se entrega junto al cambio del inicializador y pruebas en instalación nueva/existente. No borrar volúmenes para esconder deriva del manifiesto.
- El plan no autoriza publicar, enviar mensajes o modificar una base compartida. La implementación se valida en entornos de desarrollo/prueba.

## 7. Índice de guías

- [Alcance, fuentes y decisiones](01_ALCANCE_Y_DECISIONES.md).
- [Arquitectura hexagonal y construcción del backend](02_ARQUITECTURA_HEXAGONAL.md).
- [Contratos, API, errores y transacciones](03_CONTRATOS_Y_FLUJOS.md).
- [Pruebas y aceptación de la entrega](04_PRUEBAS_Y_ENTREGA.md).
- [Trazabilidad de consigna, RF, RNF y CA](05_TRAZABILIDAD.md).
- [Tablero de ejecución](06_TABLERO.md).
- [Auditoría y actualización de AGENTS.md](07_AUDITORIA_AGENTES.md).
- [Validación documental del plan](08_VALIDACION_DEL_PLAN.md).
- [Guía raíz del agente](../AGENTS.md) y [contexto académico](../Agente/AGENTS.md).

## 8. Definición de cierre técnico

Un mismo candidato se instala desde cero en otro equipo y usa persistencia por HTTP en modo API. Los cuatro motores se demuestran con cuentas institucionales y datos sintéticos. El recorrido común acredita alta, consulta ordenada, atención completa y archivo con historia. El circuito de laboratorio acredita captura, validación y lectura de resultados de estructura variable. Quedan registrados el commit y los resultados reales, sin fallos ni bloqueos de pruebas obligatorias.

## 9. Calendario e integración GitHub

- [Cronograma original hasta el 05/11/2026](09_CRONOGRAMA_HASTA_05_NOV.md).
- [Flujo de integración y revisores](10_INTEGRACION_GITHUB.md).

- [Estado para chats nuevos](ESTADO_ACTUAL.md).
- [Cola compartida, reservas y traspaso](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md).
