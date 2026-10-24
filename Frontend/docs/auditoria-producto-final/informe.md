# Auditoría de vistas del producto final

- **Fecha:** 23 de octubre de 2026.
- **Alcance autorizado:** adaptar las vistas y sus acciones a la especificación final aportada por Daniel. El backend se construirá después.
- **Fuente de alcance:** `Texto pegado.txt`, adjunto c6cc83f6-a118-4679-aa70-7433009bda77. Sus apartados E2, E1-OP, E1-DOM y NO EXIGIDO prevalecen sobre los identificadores antiguos del prototipo.
- **Entorno:** frontend local, repositorios simulados y datos de prueba. Sin conexiones a bases de producción.

## 1. Resumen ejecutivo

**Las vistas se ajustaron al alcance indicado.** Se retiraron las pantallas de permisos avanzados, firma digital de personal, altas independientes de médicos/procedimientos odontológicos y la ficha redundante de sesión. Se limitaron menús, rutas directas y pestañas por institución. El inicio quedó como acceso a tareas del paciente, sin métricas gerenciales ni actividad ficticia del centro.

Se corrigieron también campos y operaciones exigidos: grupo sanguíneo hospitalario, documento opcional en odontología, conservación de tutores, concentración de medicamentos, mantenimiento de consultas, catálogos documentados del laboratorio, precios acordados y relación muestra/prueba/orden.

- Inventario de código: **113 archivos y 410 funciones/métodos identificados**, incluidos contratos, simuladores, componentes y estilos.
- Componentes de vistas y diálogos: **59**.
- Rutas declaradas: **33**, contando alias, redirecciones y ruta desconocida.
- Navegador: **124 combinaciones de ruta/variante y tamaño**, en 1440 y 375 píxeles. Sin desbordamientos de los controles inspeccionados, recortes de texto detectados ni códigos internos detectados en las pantallas recorridas. Las tablas conservan su desplazamiento horizontal.
- Pruebas ejecutadas: **35 PASS** (22 sobre el producto final, 7 sobre mensajes y 6 sobre fechas).
- Compilación: **PASS**.

**Resultado del trabajo de vistas:** PASS para las comprobaciones descritas. **Producto completo con persistencia real:** NOT_IMPLEMENTED en este frontend; los simuladores no sustituyen los cuatro adaptadores del servidor.

## 2. Inventario y cobertura

El [inventario completo](inventario.json) enumera archivos, funciones/métodos con línea y controles de acción. Es un inventario técnico, no una lista de funcionalidades nuevas que deba implementar el backend; el alcance visible es el de la tabla siguiente. El [recorrido del navegador](recorrido-playwright.json) conserva resultados por ruta y tamaño.

### Vistas que deben guiar al backend

| Institución | Vistas y secciones conservadas | Acciones que corresponden |
|---|---|---|
| Todas | Acceso; inicio; pacientes; alta/edición; expediente; consulta; diagnósticos; tratamientos; recetas; historial ordenado | Autenticar una cuenta; buscar/reutilizar paciente; crear/actualizar datos; registrar/corregir consulta; registrar diagnóstico/tratamiento/receta; archivar con causa y confirmación |
| Hospital | Agenda; hospitalizaciones; ingreso/detalle/egreso; camas vinculadas al ingreso; órdenes/resultados de examen; pólizas y procedimientos del paciente | Atender citas; registrar ingreso/egreso; asignar/trasladar/liberar cama por período; gestionar órdenes y resultados; afiliar cobertura; registrar procedimientos clínicos |
| Odontología | Agenda dental; ficha; consulta y seguimiento | Programar, reprogramar, cancelar y atender citas; distinguir quién creó la cita y el profesional asignado; seleccionar diagnósticos/tratamientos y emitir receta |
| Laboratorio | Bandeja; orden; muestras/eventos; captura/validación; informe; cobros; inventario/movimientos; equipos/calidad; catálogos; cuentas con rol fijo | Ciclo paciente→orden→muestras→resultados→informe; corregir con versión/repetir con serie; facturar y cobrar; administrar insumos y referencias; crear/habilitar/suspender cuentas |
| Pediatría | Responsables; antecedentes/alergias; agenda; consulta con crecimiento; mediciones por fecha; vacunación/aplicaciones; catálogo de vacunas/dosis; registro de cambios | Mantener responsables y principal autorizado; consultar evolución; registrar/corregir aplicaciones; mantener dosis y edades; archivar y reactivar con motivo |

Los catálogos clínicos de consulta siguen disponibles dentro de los formularios. No se añade una pantalla administrativa por cada tabla del modelo. Las funciones hospitalarias permanecen vinculadas al paciente o su ingreso.

### Exclusiones aplicadas

- Sin selector de motor, institución o perfil en el acceso. El usuario introduce cuenta y contraseña.
- Sin agenda de laboratorio: E1 documenta órdenes y muestras. La atención clínica común del laboratorio se inicia desde el expediente.
- Sin matriz editable de permisos, firma digital configurable, portal externo, notificaciones automáticas, inteligencia artificial, sincronización entre instituciones ni panel gerencial.
- Sin catálogos de hospital/odontología como módulos administrativos independientes. Sus selectores clínicos siguen en el flujo que los utiliza.
- Sin seguros, exámenes hospitalarios o procedimientos hospitalarios en expedientes de otras instituciones, ni mediante parámetros de URL.
- Sin control de crecimiento independiente de una consulta y sin curvas atribuidas a la OMS dibujadas sin datos de referencia.
- Sin reactivación fuera de pediatría. El documento solo la exige allí.
- Sin controles de mantenimiento de camas como operación adicional. Se conserva consulta de disponibilidad y asignación por ingreso.

## 3. Matriz de trazabilidad requisito → código → comprobación

| Requisito | Fuente | Implementación de la vista | Evidencia / estado |
|---|---|---|---|
| R1: cliente/servidor y persistencia real | E2 | `app/ServiceContext.tsx` expone contratos; actualmente inyecta simuladores | **NOT_IMPLEMENTED (backend)**. No se atribuye esta capacidad al prototipo |
| R2: institución automática tras acceso | E2; §4–5 | `src/features/auth/LoginPage.tsx:21`; `src/app/AuthGuard.tsx:14`; `app/productScope.ts:3` | Sin selector; recorrido de cuatro cuentas. **CUBIERTO en presentación / PARCIAL extremo a extremo** |
| R3: PostgreSQL/MySQL/MongoDB/Firestore una vez | E2 | Sin pantalla ni selector de motor | **NOT_APPLICABLE a una vista**; adaptadores del servidor pendientes |
| R4: consulta/diagnóstico/receta comunes | E2; §9 | `NewConsultationWizardPage`, `PatientRecordPage`, `EmitirRecetaModal` | Prueba parametrizada en cuatro instituciones; entrada clínica de laboratorio comprobada en navegador. **CUBIERTO en simulación** |
| R5: nuevo/existente, buscar/reutilizar | E2; §6 | `src/features/patients/PatientsListPage.tsx:26`; `src/features/patients/PatientFormPage.tsx:21` | Formularios por institución, conflicto de documento y búsqueda. **CUBIERTO en vistas** |
| R6: mantenimiento clínico | E2 | `src/features/consultations/ModificarConsultaModal.tsx:19`; `mockConsultationRepository.ts` | Corrección incluye diagnósticos, tratamientos, receta y medición pediátrica; conserva revisión anterior. Prueba en cuatro instituciones. **CUBIERTO en simulación** |
| R7: archivo administrativo conserva historial | E2; §6 | `ArchivePatientModal`, `PatientRecordPage`, `MockPatientRepository.archivar` | Causa y confirmación; historial retenido; reactivación solo pediatría. **CUBIERTO en vistas** |
| R8: consultas equivalentes entre motores | E2 | Contratos comunes en `services/contracts.ts`; presentación común | **PARCIAL**: presentación común disponible, equivalencia de los cuatro adaptadores requiere backend |
| R9: historial ordenado | E2 | `ClinicalTimeline`, expediente, tablas por fecha | Listado usa las consultas corregidas y recetas actuales sin eliminar el resto. **CUBIERTO en simulación** |
| R10: explicar embeds/referencias | E2 | No necesita módulo en la aplicación | **NOT_APPLICABLE a vistas**; documentación de modelado pendiente del backend |
| R11: documento comparativo | E2 | No necesita pantalla administrativa | **NOT_APPLICABLE a vistas**; este informe de UI no es el documento comparativo de motores |
| R12: correcciones docentes | E2 | No se inventan funcionalidades sin observación recibida | **BLOCKED para comprobar observaciones docentes**: no se adjuntaron |
| Hospital: datos y procesos clínicos | §6; §7.1, E1-DOM | Formulario con grupo sanguíneo; módulos hospitalarios; pólizas/exámenes/procedimientos limitados al hospital | 32 comprobaciones de ruta/tamaño; pruebas de grupo sanguíneo y ámbito. **CUBIERTO en presentación** |
| Dental: agenda y consulta | §7.2, E1-OP | Agenda dental, datos/contacto, documento opcional, consulta y catálogos de selección | 16 comprobaciones de ruta/tamaño; sin administración adicional. **CUBIERTO en presentación** |
| Laboratorio: operaciones 1–12 | §7.3, E1-OP | Orden, catálogos, muestras/eventos, resultados/versiones/informe, cobros, inventario, calidad y cuentas | 48 comprobaciones de ruta/tamaño y pruebas locales de los cambios. **CUBIERTO en presentación**; concurrencia y transacciones reales pendientes |
| Pediatría: operaciones 1–11 | §7.4, E1-OP | Responsables, consulta/crecimiento, vacunas/dosis/aplicaciones y cambios | 28 comprobaciones de ruta/tamaño, pruebas de tutores y crecimiento sin registro independiente. **CUBIERTO en presentación** |

## 4. Desviaciones detectadas y corregidas

| ID | Tipo | Antes → resultado esperado aplicado | Severidad |
|---|---|---|---|
| F01 | DIVERGENTE | Rutas directas permitían abrir módulos ajenos → restricción de presentación por institución, compartida con el menú | HIGH |
| F02 | SOBRE_IMPLEMENTADO | Permisos avanzados, personal con firma y altas administrativas no documentadas → vistas eliminadas | MEDIUM |
| F03 | SOBRE_IMPLEMENTADO | Métricas/actividad del centro y selector de perfiles de demostración → inicio de tareas y acceso por cuenta | LOW |
| F04 | SOBRE_IMPLEMENTADO | Seguros/exámenes/procedimientos en todos los pacientes → solo hospital; URLs de pestañas ajenas vuelven a General | MEDIUM |
| F05 | DIVERGENTE | Crecimiento local fuera de consulta y curvas OMS sin fuente → medición única por consulta, tabla cronológica | HIGH |
| F06 | SUB_IMPLEMENTADO | Faltaba grupo sanguíneo hospitalario → capturado y mostrado; emergencia marcada como opcional | MEDIUM |
| F07 | SOBRE_IMPLEMENTADO | Documento obligatorio en odontología → opcional; ausencia de documento no identifica a dos pacientes como uno | MEDIUM |
| F08 | DIVERGENTE | Editar al menor reemplazaba todos los tutores → conserva sus identidades y modifica al principal | HIGH |
| F09 | SUB_IMPLEMENTADO | Concentración se descartaba o se confundía con dosis → campo separado, conservación y visualización | HIGH |
| F10 | SUB_IMPLEMENTADO | Corregir consulta solo cambiaba notas → incluye diagnóstico, tratamiento, receta y medición con revisión anterior | HIGH |
| F11 | DIVERGENTE | Orden usaba edad 30, precio 150 y nombres de prueba genéricos → datos del paciente, precios acordados y snapshot de catálogo | HIGH |
| F12 | SUB_IMPLEMENTADO | Sin mantenimiento visible de solicitantes/tipos/métodos/proveedores/reactivos → referencias del laboratorio en sus catálogos | MEDIUM |
| F13 | SUB_IMPLEMENTADO | Faltaban traslado y procesamiento en eventos → acciones y trazabilidad en la misma vista de muestras | MEDIUM |
| F14 | DIVERGENTE | Captura podía tomar una muestra apta de otra orden → vínculo de orden/paciente/prueba comprobado, selección compatible | HIGH |
| F15 | SOBRE_IMPLEMENTADO | Mantenimiento de cama como acción administrativa adicional → retirado, conserva disponibilidad/asignación | LOW |

## 5. Evidencia y reproducción segura

| Hallazgo | Localización principal | Comprobación reproducible |
|---|---|---|
| F01/F04 | `app/productScope.ts:3`, `AuthGuard.tsx:32`, `PatientRecordPage.tsx:171` | Abrir `/hospital/camas` desde odontología o laboratorio: acceso restringido. Abrir `?tab=seguros` en odontología: General |
| F02/F03 | `UsersManagementPage.tsx`, `CatalogosManagementPage.tsx`, `DashboardPage.tsx`, `LoginPage.tsx` | `?tab=roles` en cuentas de laboratorio presenta la lista de cuentas; no existe matriz. Acceso no tiene selector de perfil |
| F05 | `src/features/patients/components/PediatricGrowthView.tsx:36` | Abrir crecimiento del menor: tabla por consulta sin botón de control independiente ni curvas OMS |
| F06/F07/F08 | `PatientFormPage.tsx:40`, `:145`, `:200` | Formulario hospital muestra grupo sanguíneo; dental acepta ausencia de documento; prueba de edición conserva todos los tutores |
| F09/F10 | `ModificarConsultaModal.tsx`, `EmitirRecetaModal.tsx`, `mockConsultationRepository.ts:452` | Registrar/corregir en las cuatro instituciones; abrir historial después y comprobar receta/corrección; revisión retiene valores anteriores |
| F11/F12 | `NewOrderPage.tsx`, `LaboratoryReferencesView.tsx`, `mockLaboratoryRepository.ts:1120` | Seleccionar prueba: solicita su precio; referencia puede crearse, editarse y desactivarse sin eliminarla |
| F13/F14 | `SamplesManagementPage.tsx`, `ResultsCapturePage.tsx`, `mockLaboratoryRepository.ts:1392` | Registrar traslado desde muestra; prueba intenta guardar un resultado con muestra de otra orden: rechazo sin resultado creado |

Las comprobaciones se realizaron con datos locales. El registro temporal creado desde la pantalla de catálogos se retiró restaurando el valor anterior de esa clave de almacenamiento.

## 6. Pruebas ejecutadas

```text
npm run test -- src/test/product-scope/ProductScope.test.tsx src/services/errors.test.ts src/services/dates.test.ts
22 pruebas de producto + 7 de mensajes + 6 de fechas = 35 PASS
npm run build
PASS
```

Playwright recorrió las 62 variantes de ruta indicadas en el JSON en dos tamaños (124 comprobaciones). Además se comprobaron límites por URL, pestañas del expediente de laboratorio, creación/edición/desactivación de referencia, precio por prueba, diálogo de traslado, edición de dosis y diálogo de corrección clínica en móvil.

La suite histórica completa no se ejecutó: varias pruebas antiguas todavía describen rótulos y pantallas retiradas (por ejemplo, matriz de permisos y curvas OMS). No se presentan como cobertura del nuevo alcance.

## 7. Decisiones y dependencias pendientes del backend

1. **Laboratorio (§9):** se mantiene la opción 1 en la UI: consulta/diagnóstico/tratamiento/receta como registros clínicos comunes vinculados al paciente. No se equipara un resultado analítico con un diagnóstico o una receta. El servidor MongoDB deberá implementar ese caso común; vincularlo adicionalmente a una orden requerirá una regla explícita.
2. **Autenticación:** el acceso actual utiliza cuentas sintéticas y repositorio simulado. No acredita validación real de contraseñas, sesiones ni autorización del servidor. El servidor debe resolver institución y adaptador; ocultar una ruta en React no reemplaza la autorización del API.
3. **Persistencia y consistencia:** los contratos están preparados para sustituir los simuladores. Atomicidad, aislamiento, restricciones, concurrencia, pagos duplicados y versiones definitivas se deben garantizar en los adaptadores reales.
4. **Responsables compartidos (§8.3):** se conservan los tutores del paciente, pero el documento aún requiere decidir si una persona compartida se referencia o se copia y cómo se propagan cambios.
5. **R10–R11 y observaciones docentes:** la justificación documental de modelos/motores y las correcciones académicas no se convierten en pantallas del producto.

## 8. Matriz final de resultados

| Comprobación | Estado | Evidencia |
|---|---|---|
| Inventario del código y rutas | PASS | `inventario.json` |
| Menú/rutas/pestañas por institución | PASS | Pruebas parametrizadas y límites por URL en navegador |
| Casos clínicos comunes del prototipo | PASS | Registro y corrección en cuatro instituciones |
| Campos y mantenimiento corregidos | PASS | 22 regresiones del producto final |
| Mensajes de error | PASS | 7 regresiones de mensajes; validación de corrección inspeccionada en móvil |
| Presentación de las rutas recorridas | PASS | 124 resultados sin incidencias detectadas |
| Compilación | PASS | TypeScript y Vite |
| API y cuatro bases reales | NOT_IMPLEMENTED | Inyección actual de repositorios simulados |
| Transacciones/carreras entre usuarios reales | BLOCKED | Requieren API y bases de ensayo aisladas |
| Explicaciones de modelado / comparación de motores como UI | NOT_APPLICABLE | Requisitos documentales, sin interfaz adicional |

## 9. Riesgos residuales y límites de la conclusión

- Esta auditoría entrega vistas y contratos de presentación. No certifica que el producto con cuatro bases esté implementado.
- Las pruebas locales comprueban las regresiones indicadas; no demuestran todas las transiciones ni todas las categorías de entrada de un API todavía inexistente.
- La medición de desbordamientos complementa la inspección; no certifica todas las combinaciones posibles de datos, idiomas o dispositivos.
- La compilación conserva el aviso existente de tamaño del paquete JavaScript. No se amplió el trabajo a optimización del empaquetado.
- Los roles concretos siguen siendo una decisión de implementación mínima. No se añade un editor de permisos ni se atribuye una matriz detallada a la rúbrica.


## 10. Comprobación final con Computer Use

Se recorrieron las cuatro instituciones desde la interfaz local con cuentas sintéticas:

| Institución | Recorrido final |
|---|---|
| Hospital | Inicio, pacientes, expediente, consulta, hospitalizaciones, detalle, cambio de cama y órdenes de examen |
| Odontología | Inicio, agenda, nueva cita, expediente y pasos del formulario de consulta; validación del motivo obligatorio |
| Laboratorio | Bandeja, captura, validación, muestras, inventario, calidad, cobros, catálogos y usuarios |
| Pediatría | Inicio, pacientes, expediente, responsables, crecimiento, vacunación y confirmación de archivo |

Se corrigieron horas de formularios hospitalarios a America/Guatemala, fechas de calendario que retrocedían un día, separación y legibilidad de códigos/importes en tablas, alineación de la cita, identificación de su creador, ejemplos odontológicos y mensajes de diagnóstico opcional. Se sustituyó STAT por su etiqueta comprensible y se aclararon los estados de muestras aptas. Se retiró la suma de inventario que mezclaba unidades diferentes. En pediatría se ajustaron los rótulos administrativos, las edades de vacunación y las afirmaciones no sustentadas sobre un esquema oficial o políticas de archivo.

La revisión final volvió a abrir vacunación e inventario para comprobar los cambios visibles: títulos separados del contenido, códigos de lote sin fragmentarse y vencimientos con el día correcto. Los diálogos de archivo, cambio de cama y citas se cancelaron; esta revisión final no guardó registros clínicos, cobros ni cuentas.

Resultado: 35 pruebas específicas aprobadas, compilación TypeScript/Vite aprobada y revisión de espacios del diff sin incidencias. El inventario técnico de la sección 1 corresponde al corte anterior a este recorrido; se añadió posteriormente el módulo compartido de fechas y sus seis pruebas. No se ejecutó la suite histórica completa.
