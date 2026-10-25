# Auditoría de requerimientos — E00-P1-03

> Corte histórico conservado. Las correcciones y resultados posteriores están en [REVALIDACION.md](REVALIDACION.md). Este informe registra los tres fallos originales; no representa el estado posterior a su corrección.

- Fecha: 25/10/2026, America/Guatemala.
- Alcance confirmado por Daniel: la entrega que se estaba preparando, **API y puertos comunes versionados E00-P1-03**. No es una auditoría de cierre de toda la Entrega II.
- Corte auditado: `126bf9b09435bc21ee5b72d35031e4aea27926ac`, rama `codex/e00-p1-03-api-puertos`, PR [#15](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/15).
- Tipo: funcional, contrato y trazabilidad. Entorno local, datos sintéticos, sin API ni conexiones a motores. No se ejecutaron migraciones, escrituras clínicas ni pruebas de seguridad efectiva.
- Autorización: petición humana de auditar antes de continuar publicando commits. El PR quedó en borrador. **Este informe y sus pruebas están LOCAL_NO_PUBLICADO**; no se creó un commit ni se integró el PR durante la auditoría.

## 1. Resumen ejecutivo

**Resultado: FAIL. E00-P1-03 todavía no debe declararse terminada ni integrarse como contrato congelado.**

Se inventariaron 208 unidades del artefacto y 117 trazas de métodos UI: 26 operaciones especificadas, 88 esquemas, 66 declaraciones TypeScript, 24 firmas de métodos y 4 funciones Python. El inventario clasifica 19 entradas CRITICAL y 306 HIGH, incluyendo trazas. Riesgo expresa el impacto de implementar mal el contrato; no certifica vulnerabilidades.

La validación existente sigue pasando sus **169 fixtures**. La auditoría añadió **25 comprobaciones independientes: 22 PASS y 3 FAIL**, además de compilación estricta PASS y una comprobación del modelo Firestore offline PASS. Los tres fallos son desviaciones del contrato/documentación, no fallos medidos de un servidor existente.

Hallazgos: **0 CRITICAL · 2 HIGH · 1 MEDIUM · 0 LOW**. Los 26 endpoints siguen correctamente declarados NOT_IMPLEMENTED. Su ausencia de ejecución en E00 no es un hallazgo: la tarea exige especificarlos, no construir el backend.

## 2. Inventario y cobertura

Inventario completo: [inventario.csv](inventario.csv), [inventario-puertos.json](inventario-puertos.json), [inventario-python.csv](inventario-python.csv). Fuentes: AST TypeScript, AST Python de la skill, OpenAPI y mapa UI.

| Familia | Unidades | Riesgo | Alcance efectivamente comprobado | Límite |
|---|---:|---|---|---|
| Operaciones HTTP especificadas | 26 | 16 CRITICAL / 10 HIGH | Método/URI, referencias, políticas declaradas, respuestas, requests con ejemplos positivos/negativos cuando tienen body | Cero endpoints ejecutados |
| Esquemas | 88 | HIGH | Sintaxis de todos; fixtures y fronteras indicadas en resultados; compatibilidad selectiva con modelos | No hay cobertura de todos los valores/reglas por esquema |
| Tipos/interfaces de puertos | 66 | 1 CRITICAL / 65 HIGH | Inventario, compilación estricta, separación de dependencias y revisión del plan transaccional | Declaraciones sin comportamiento ejecutable |
| Firmas de métodos | 24 | 2 CRITICAL / 22 HIGH | Inventario y compilación; lectores/UoW contrastados con contrato | No implementan persistencia |
| Funciones Python | 4 | HIGH | `decimal_values`, `is_integer`, `require`, `validate_artifacts`: éxito, tipos/fronteras y excepciones en copias temporales | No se midió cobertura de ramas |
| Métodos UI trazados | 117 | HIGH | Igualdad con firmas y exclusiones; revisión de destinos/puertas | La igualdad del inventario no demuestra compatibilidad de cada mapper futuro |

Mapa actual: 20 COMUN_V1, 87 EXTENSION_PENDIENTE, 10 EXCLUIDO. De los 96 métodos vigentes en UI, 20 apuntan al núcleo y 76 a extensiones pendientes. Esa distribución está permitida por el trabajo concreto 4; no significa 96 acciones integradas.

Fuentes normativas: `plan/entregas/E00_base_y_contratos/01_P1.md:90–121`; `plan/01_ALCANCE_Y_DECISIONES.md`; `plan/02_ARQUITECTURA_HEXAGONAL.md`; `plan/03_CONTRATOS_Y_FLUJOS.md`; RF/RNF; CA04/CA07 del diseño. Modelos físicos e inventario UI se usan para comprobar compatibilidad. Las pruebas históricas de otras tareas no se suman como pruebas actuales.

## 3. Matriz requisito → artefacto → prueba

Matriz verificable completa: [trazabilidad.csv](trazabilidad.csv), con 25 criterios desglosados de la tarea. CUBIERTO significa cubierto **como especificación E00**, no como sistema operativo.

| Requisito | Fuente | Artefacto | Prueba / evidencia | Estado |
|---|---|---|---|---|
| RF-015, campos/tipos/rangos | RF:34; trabajo 1 y excepción de E00-P1-03 | OpenAPI, fixtures, compatibilidad física | T01, T07, T08, T09, T10 | PARCIAL: validación sintáctica pasa; AF01/AF02 |
| RF-017, equivalencia de contrato | RF:36; trabajo 2 | DTO comunes, puertos y DEC16 | T01, T10; compilación | PARCIAL: AF02; equivalencia ejecutada NOT_IMPLEMENTED |
| RF-020, errores identificables | RF:39; aceptación de E00-P1-03 | Catálogo y respuestas 400/401/403/404/409/413/500/503 | T01, 21 fixtures válidos de errores; lectura de plan/03 §4/§7 | CUBIERTO en especificación |
| RNF-029, API versionada | RNF:63 | Servidor `/api/v1`, 26 operaciones | T01, revisión del prefijo | CUBIERTO en especificación |
| RNF-030, fecha civil y evento UTC | RNF:64 | FechaCivil, InstanteUTC y plan/03 §7 | T07 bisiesto/día inválido/Z; reglas de Guatemala documentadas | CUBIERTO en especificación; almacenamiento/presentación futuros |
| RNF-031, UUID público estable | RNF:65 | UUID, respuestas y tipos | T01, T07 ID nativo | CUBIERTO en especificación; estabilidad persistida futura |
| RNF-032, páginas/filtros/orden | RNF:66; CA07 | Parámetros, cursores, lectores, plan/03 §6/§7 | T01, T07 límites; revisión de filtros previos a página | PARCIAL: mecanismo documentado; detalle histórico AF03 |
| RNF-033, errores coherentes sin proveedor | RNF:67 | Esquemas Error, códigos por HTTP y convenciones | T01, ejemplos y lectura | CUBIERTO en especificación; saneamiento efectivo no ejecutado |
| CA04, misma proyección/semántica | Diseño:433 | Contrato común y overlays institucionales | T01, T10 | PARCIAL: discrepancia dental AF02; prueba de cuatro adaptadores NOT_IMPLEMENTED |
| CA07, cronología | Diseño:436 | EventoHistorial, Consulta, revisiones | T11, plan de cursores | PARCIAL: AF03; orden/concurrencia reales NOT_IMPLEMENTED |
| RF-013/RNF-024, conservar contenido previo | RF:32; RNF-024; DEC16 §3 | Revisiones y enlaces de eventos | T11 | DIVERGENTE en resolución documentada de eventos |
| RF-D01, preservar datos de partida | RF documental; DEC16 §1 | Lectura Paciente y compatibilidad | T09 y validador Firestore local | DIVERGENTE: AF01 |
| Firmas puras/UoW lectura→plan | Trabajo 2; arquitectura §4 | `puertos-v1.ts` | Compilación, inventario y revisión del flujo | CUBIERTO en especificación; atomicidad efectiva futura |
| Mapa UI, alias y extensiones | Trabajos 3/4; DEC06/DEC11 | Mapa 117 métodos y guía UI | T01, T06; revisión de alias/puertas | CUBIERTO como inventario y puerta contractual |

No hay prueba actual de autorización, revocación, aislamiento, rollback, unicidad o idempotencia real. Esos requisitos están descritos y sus implementaciones siguen NOT_IMPLEMENTED; esta auditoría funcional no los declara PASS de seguridad.

## 4. Desviaciones detectadas

| ID | Requisito | Tipo | Severidad | Resultado |
|---|---|---|---|---|
| AF01 | RF-D01, RF-015; DEC16 conservación legada | DIVERGENTE | HIGH | Lectura de paciente rechaza datos válidos existentes |
| AF02 | RF-015/RF-017; excepción de E00-P1-03 | SUB_IMPLEMENTADO en reconciliación contractual | MEDIUM | Límite clínico común no reconciliado con MySQL |
| AF03 | RF-013/RNF-024; CA07; DEC16 snapshot concreto | DIVERGENTE | HIGH | Resolución de evento usa agregado vigente sin seleccionar versión histórica |

## 5. Hallazgos confirmados

### AF01 — La lectura de pacientes hereda el límite de alta y rechaza nombres legados

**Evidencia:** `Backend/docs/openapi.yaml:1868` reutiliza el alias de alta, limitado a 80 caracteres. `Backend/docs/COMPATIBILIDAD_PERSISTENCIA_V1.md:11` exige concatenar grupos legados sin truncar. Hospital admite primer y segundo nombre de 80 cada uno (`Database/hospital_general_postgresql.sql:44`); Firestore admite `nombres` de hasta 200 (`Database/firebase/modelo_pediatrico.mjs:12`, `:47`).

**Entrada:** lectura de paciente con nombres `A×40 + espacio + B×40` (81 caracteres). **Esperado:** respuesta válida que conserva el nombre. **Observado:** `RespuestaPaciente` rechaza con `is too long` (T09). El mismo nombre fue aceptado por `validarDocumento` del modelo Firestore offline, sin emulador ni red.

**Impacto:** detalle, búsqueda, expediente y revisiones que usen Paciente no pueden representar esos pacientes. Truncar para pasar el esquema contradice la conservación requerida. Apellidos y otros campos legados necesitan el mismo análisis; no se afirma que todos sus límites hayan sido comprobados.

**Corrección recomendada:** separar restricciones de captura y lectura. Dimensionar la proyección legada desde los máximos físicos y separadores de los cuatro modelos; conservar los límites elegidos para altas. Añadir fixtures de nombres/apellidos largos y de respuestas compuestas, sin truncamiento.

**Reproducción:** ejecutar `reproducir.py`, caso T09. HIGH.

### AF02 — Nombre de diagnóstico de 181–200 caracteres aceptado sin reconciliación dental

**Evidencia:** `Backend/docs/openapi.yaml:2063` acepta 200 caracteres; `Database/clinica_odontologica_mysql.sql:236` define `diagnostico.nombre VARCHAR(180)`. DEC16 §3 (`Backend/docs/COMPATIBILIDAD_PERSISTENCIA_V1.md:50`) especifica ampliaciones de metadatos/proyecciones, pero no resuelve este límite del nombre del catálogo dental ni su representación alternativa completa.

**Entrada:** fixture dental completo, sustituyendo solo `diagnosticos[0].nombre` por 181 letras D. **Esperado para congelar:** entrada compatible con la representación física o una decisión explícita de extensión/mapeo que preserve el texto. **Observado:** el contrato dental acepta el DTO y la columna actual tiene máximo 180 (T10).

**Impacto:** queda una decisión de almacenamiento clínico al futuro implementador. Usar la columna actual obligaría a rechazar una entrada válida o perder texto; la especificación debe resolverlo antes de afirmar equivalencia. Esto es contraste estático: no se ejecutó una inserción ni se atribuye un fallo a un adaptador inexistente.

**Corrección recomendada:** elegir y documentar un límite común compatible o una extensión tipada concreta con migración/manifesto y dueño. Si se usa una proyección alternativa, especificar cómo preserva íntegramente nombre, catálogo y snapshot. Agregar fronteras 180/181/200/201 al contrato y prueba de ida/vuelta en la tarea del adaptador.

**Reproducción:** `reproducir.py`, T10. MEDIUM.

### AF03 — Los eventos de componentes no seleccionan la versión histórica de la consulta

**Evidencia:** `Backend/docs/openapi.yaml:2624` prescribe cargar `GET /consultas/{consulta_id}` y resolver el componente. El evento no guarda versión/revisión del agregado (`:2585`); el GET solo recibe ID; `RepositorioConsulta.porId` recibe únicamente ID (`Backend/docs/puertos-v1.ts:216`). A la vez, DEC16 §3 exige que cada evento referencie un snapshot/versionado concreto (`COMPATIBILIDAD_PERSISTENCIA_V1.md:51`).

**Entrada:** evento de diagnóstico con UUID hijo D y padre C; corrección válida de C que retira D del snapshot; respuesta vigente de C versión siguiente sin D. **Esperado:** abrir el evento conserva acceso inequívoco al diagnóstico histórico. **Observado:** los tres objetos cumplen sus esquemas, pero seguir el enlace documentado y buscar D en la consulta vigente no encuentra el componente (T11). Si se conserva el UUID y se cambia su contenido, el mismo enlace tampoco identifica cuál versión mostrar.

**Impacto:** la historia puede conservarse en revisiones y aun así el flujo de lectura prometido queda roto o muestra contenido corregido bajo un evento anterior. Existe una lista paginada de revisiones, pero el contrato no establece un enlace directo a la versión concreta del evento; recorrerla para adivinar cuál corresponde contradice la resolución sin barrer historia prometida en la descripción.

**Corrección recomendada:** definir referencia inmutable a consulta+versión/componente+versión y su lectura directa en HTTP/puerto, o un resolvedor por evento que devuelva el snapshot exacto. Mantener evento, snapshot/revisión y auditoría en la misma UoW. Probar adición, modificación y retirada de componentes y receta.

**Reproducción:** `reproducir.py`, T11. Es un contraejemplo documental validado, sin servidor ni corrección persistida ejecutados. HIGH.

## 6. Pruebas añadidas y propuestas

Resultados detallados: [resultados.json](resultados.json). Reproducción desde la raíz:

```sh
/tmp/e00-p1-03-venv/bin/python plan/evidencias/E00/auditoria-E00-P1-03-2026-10-25/reproducir.py
Frontend/node_modules/.bin/tsc --strict --noEmit --target ES2022 Backend/docs/puertos-v1.ts
node plan/evidencias/E00/auditoria-E00-P1-03-2026-10-25/modelo-legado.mjs
```

El venv contiene las dependencias fijadas en `Backend/docs/requirements-contrato.txt`. Si no existe en otro equipo, crearlo según `Backend/docs/README.md`; no requiere levantar bases. El script termina normalmente y escribe resultados con FAIL explícitos: **su exit code 0 no significa auditoría aprobada**. Las mutaciones negativas se hacen en copias de `/tmp` que se eliminan al terminar, nunca en el contrato auditado.

| Casos | Objetivo | Resultado actual | Acción |
|---|---|---|---|
| T01 | OpenAPI, 169 fixtures, 117 firmas UI, exclusiones y errores | PASS | Conservar como validación estructural |
| T02–T04 | Decimal, enteros matemáticos, tipos incorrectos y excepción controlada | PASS | Conservar |
| T05–T06 | Detectar fixture inconsistente y destino UI inexistente en copia aislada | PASS | Conservar |
| T07, 13 casos | Fecha bisiesta/inválida, UTC, UUID, cursor 2048/2049, precisión y PATCH | PASS | Incorporar regresiones útiles a fixtures cuando se corrija |
| T08, 3 casos | Rechazo de campos actor/motor/institución en DTO | PASS de esquema | Guard real se prueba después, sin atribuirle este PASS |
| T09 | Nombre legado de 81 caracteres | FAIL AF01 | Corregir esquema de lectura y ampliar fixtures |
| T10 | Nombre de diagnóstico dental de 181 | FAIL AF02 | Resolver límite/migración y verificar ida/vuelta futura |
| T11 | Evento histórico después de retirar componente | FAIL AF03 | Especificar versión/lectura histórica y ampliar contrato |
| Compilación estricta | Firmas TypeScript | PASS | No equivale a compatibilidad semántica |
| Validador Firestore offline | Paciente sintético con nombre de 81 | PASS | Refuerza AF01; no acredita Firestore ejecutado |

Pruebas propuestas para E01–E03: equivalencia parametrizada en cuatro bundles, reintento tras commit incierto, carrera archivo/alta, rollback antes de auditoría, lectura de componentes corregidos por versión, migraciones nueva/existente con conservación. Continúan NOT_IMPLEMENTED; no cuentan en las 25 comprobaciones ejecutadas.

## 7. Bloqueos y condiciones de cierre

| Condición | Estado real | Próxima acción |
|---|---|---|
| Tres desviaciones del contrato | FAIL | Resolver AF01–AF03 y repetir auditoría afectada antes de congelar |
| Revisión automática del SHA | FAIL | El bot marcó hallazgos en `126bf9b`; su observación sobre nombres coincide con AF01. Revisión limpia nueva solo después de correcciones autorizadas; no resolver el hilo para ocultar el problema |
| Ejecución HTTP/4 adaptadores | NOT_IMPLEMENTED | E01–E03; no exigida como implementación de E00-P1-03 |
| Migraciones DEC16 | NOT_IMPLEMENTED | Sus tareas E02/E03 antes de habilitar persistencia; no es necesario modificar bases durante esta auditoría |
| Publicación del informe | LOCAL_NO_PUBLICADO | No enviar commits mientras se atiende la petición actual de auditoría |

No faltó un entorno para obtener los tres contraejemplos: los tres se reprodujeron offline. La falta de backend limita las conclusiones de ejecución, no impide el veredicto sobre el contrato.

## 8. Matriz final por categoría

| Categoría de la skill | Resultado y alcance | Evidencia / límite |
|---|---|---|
| 1. Contrato/tipos | PASS parcial | T01/T07/T08; no todas las combinaciones de todos los esquemas |
| 2. Validación | FAIL | AF01/AF02; funciones del verificador PASS en T02–T06 |
| 3. Negocio | NOT_IMPLEMENTED | Políticas especificadas; sin casos de uso ejecutables |
| 4. Estados/transiciones | NOT_IMPLEMENTED | Máquina declarada; no se probaron transiciones reales |
| 5. Persistencia/efectos | NOT_IMPLEMENTED | AF02 es contraste estático; sin escrituras ni rollback reales |
| 6. Salida/serialización | FAIL | AF01 y AF03 |
| 7. Errores/excepciones | PASS de artefactos | T01/T04–T06; traducción HTTP real NOT_IMPLEMENTED |
| 8. Fronteras | FAIL | T07 pasa las fronteras listadas, T09/T10 detectan límites no reconciliados |
| 9. Canonización | NOT_IMPLEMENTED en servidor | RFC/alias descritos; normalizador real ausente |
| 10. Integraciones | NOT_IMPLEMENTED | Sin Auth/API/adaptadores ejecutables en Backend |
| 11. Concurrencia/idempotencia/atomicidad | NOT_IMPLEMENTED | UoW tipada y protocolo revisados; compilación no demuestra garantías |
| 12. Filtros/páginas | PASS de sintaxis / NOT_IMPLEMENTED de comportamiento | T01/T07; sin prueba de orden/omisiones sobre motor |
| 13. Fechas/moneda/localización | PASS de formatos / NOT_IMPLEMENTED de almacenamiento/presentación integrada | T07 y convenciones; no se probó conversión de UI real |

Para el validador Python, estados clínicos, efectos persistentes, concurrencia y paginación de registros son NOT_APPLICABLE: su función es leer artefactos offline. Para las firmas puras, la prueba de ejecución es NOT_APPLICABLE como declaración y NOT_IMPLEMENTED en sus futuras implementaciones. Para las trazas UI, se comprobó destino/inventario, sin ejecutar las pantallas ni sus mocks. Esta auditoría no se anuncia como cobertura exhaustiva de comportamiento por cada una de las 325 entradas.

## 9. Riesgos residuales y cierre

No se ha demostrado que cada campo aceptado por los 88 esquemas pueda persistirse/rehidratarse en todos los motores; AF02 evidencia que la reconciliación aún tiene omisiones. Tampoco se certifica compatibilidad completa con cada dato legado: AF01 exige revisar lecturas por separado de altas. Los demás mappers, la navegación especializada y los 76 métodos activos pendientes de extensión requerirán sus contratos/pruebas antes de conexión.

No se ejecutaron pruebas de tokens, roles, secretos o aislamiento ni se realizó una auditoría de seguridad. No se usaron mocks para acreditar persistencia. No se alteró el código auditado para conseguir resultados verdes. Quedan preservados el SHA, los contraejemplos y el estado de revisión; la tarea conserva su reserva y no está HECHA.
