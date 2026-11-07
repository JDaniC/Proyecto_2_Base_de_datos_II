# Estado para continuar en un chat nuevo

**Corte observado:** 07/11/2026, America/Guatemala. Base remota comprobada: `origin/develop` en `29dd2ca` (con `E05-P2-01` integrada por PR #78). Verificar de nuevo Git y PR al abrir un chat. [El tablero](06_TABLERO.md) es la fuente de estados y ejecutores.

## 1. Producto integrado

- Hospital → PostgreSQL, odontología → MySQL, laboratorio → MongoDB y pediatría → Firestore. El backend verifica Firebase Auth y la cuenta institucional y selecciona el adaptador automáticamente.
- E00–E04 están cerradas. En modo API están integrados pacientes, expediente/cronología, atención con diagnóstico, tratamiento y receta, y archivo con historia. E04 acreditó los recorridos especializados de hospital, odontología y pediatría.
- En laboratorio, órdenes, muestras, cobros y resultados (`E05-P1-01`, `E05-P1-03`, `E05-P2-01`) ya están integrados en `develop`. Queda conectar el circuito analítico a la interfaz existente (`E05-P2-03`).
- La [auditoría del 07/11](evidencias/AUDITORIA_ENTREGA_II_2026-11-07.md) distingue pruebas actuales e históricas. Los 406 PASS de backend, 158 PASS del subconjunto UI y 20 PASS de clínica Firestore emulada corresponden a `0f6d245`, y el PR #78 (`29dd2ca`) sumó 371+46 PASS de backend y 1+102 PASS en MongoDB 8.0 aislado. El recorrido conjunto del candidato todavía requiere Docker y los cuatro entornos aislados.

## 2. Ruta de cierre vigente

1. **E05-P2-01**. Integrada en `develop` ([PR #78](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/78), `29dd2ca`), con revisión `APPROVED` de CodeRabbit sobre `34a5f93` y ambas auditorías en PASS.
2. **E05-P2-03**. En curso por `JDaniC` en `codex/e05-p2-03-circuito-analitico-ui` ([seguimiento](seguimiento/E05-P2-03.md)). Conectar el circuito orden → muestra → captura → validación → consulta de resultados en modo API.
3. **E05-P1-04**. Instalar el mismo candidato desde cero en otro equipo y verificar los recorridos en los cuatro motores. Depende de E05-P2-03 integrada. Con evidencia satisfactoria, completar el [acta de fase](plantillas/CIERRE_ENTREGA.md) y verificar su integración y el cierre en el tablero.

Consultar [plan maestro](00_PLAN_MAESTRO.md), [alcance DEC20](01_ALCANCE_Y_DECISIONES.md#dec20--cierre-técnico-compacto-07112026), [continuidad](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md) y [revisión](10_INTEGRACION_GITHUB.md). Ejecutar `python3 scripts/github/cola.py` y cotejar con PR y reservas remotas. Inventario E05-P2-02 queda fuera de esta ruta y conserva su [seguimiento y reserva](seguimiento/E05-P2-02.md). E06 y E07 son históricas.

## 3. Referencias para verificar y retomar

- [Cierres E00](evidencias/E00/CIERRE.md), [E01](evidencias/E01/CIERRE.md), [E02](evidencias/E02/CIERRE.md), [E03](evidencias/E03/CIERRE.md) y [E04](evidencias/E04/CIERRE.md). La evidencia corresponde a los commits y entornos indicados. Firestore se probó en emulador.
- [Órdenes y muestras E05-P1-01](evidencias/E05/E05-P1-01.md) y [cobros E05-P1-03](evidencias/E05/E05-P1-03.md). Los PR #76 y #79/#80 están integrados en `develop`.
- [Guía única de la interfaz](../Frontend/README.md), [arquitectura](02_ARQUITECTURA_HEXAGONAL.md), [contratos](03_CONTRATOS_Y_FLUJOS.md) y [migraciones explícitas](../Database/migrations/README.md).
- [Cortes anteriores del estado](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/blob/0f6d245af79e64e5b3c2965db46475d4a9bd32e4/plan/ESTADO_ACTUAL.md), incluida la trazabilidad de respaldos locales. Conservar los respaldos y cambios en curso.

Actualizar este índice al cambiar el producto, un bloqueo general o el estado de integración. Registrar fecha, commit observado y la próxima entrada. Los estados por tarea viven en el tablero y los pasos de retoma en su seguimiento.
