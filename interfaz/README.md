# Interfaz Clínica Unificada — Plataforma de Historiales Clínicos (BDII)

Esta carpeta (`interfaz/`) concentra **toda la planificación, especificaciones visuales, aplicación frontend simulada, pruebas, auditorías y evidencias** de la interfaz web de las cuatro instituciones médicas del Proyecto Final de Bases de Datos II.

> **Estado actual (19 de octubre de 2026):**
> - **Planificación 53/53 entradas:** Completada y documentada en `planes/00` a `planes/16`.
> - **Implementación de código (`app/`):** **`PENDIENTE` (0% implementado)**. Por instrucción explícita del usuario, se entrega únicamente la carpeta `interfaz/` con toda la planificación y trazabilidad, sin iniciar ninguna implementación de código.
> - **Siguiente paso:** Revisión del plan maestro y autorización explícita para iniciar `U01` (`V01` — Inicio de sesión simulado).

---

## 1. Comandos previstos para `interfaz/app` (cuando se autorice iniciar `U01`)

Requisitos previstos: Node.js 24+ y npm 11+.

```bash
cd interfaz/app
npm install
npm run dev
```

Comandos previstos de verificación y pruebas:

```bash
cd interfaz/app
npm run typecheck    # Verificación estricta de tipos TypeScript
npm run test         # Suite unitaria/componentes/accesibilidad (Vitest + Testing Library)
npm run build        # Construcción de producción
```

---

## 2. Alcance y reglas arquitectónicas

1. **Simulación honesta sin conexión prematura a motores:** La aplicación consume repositorios a través de interfaces de dominio (`AuthRepository`, etc.) respaldadas en esta fase por adaptadores en memoria (`MockAuthRepository`) con datos 100% sintéticos y desidentificados.
2. **Cuatro instituciones, una sola interfaz coherente:**
   - **Hospital General** (motor objetivo en backend: PostgreSQL)
   - **Clínica Odontológica** (motor objetivo en backend: MySQL)
   - **Laboratorio Clínico** (motor objetivo en backend: MongoDB)
   - **Centro Médico Pediátrico** (motor objetivo en backend: Cloud Firestore)
3. **Sin selector de motor de base de datos:** La institución y los permisos se derivan de la cuenta autenticada. En modo demostración (`V01`), el evaluador elige una cuenta sintética preconfigurada o simula escenarios de error (`401`/`403`/`503`) claramente etiquetados como herramientas de prueba.
4. **Exclusivamente Light Mode:** Cumplimiento estricto de los tokens y de los 27 componentes aprobados en [`referencias/design-system-clinico-v1.1-vistas-auditadas.md`](referencias/design-system-clinico-v1.1-vistas-auditadas.md).

---

## 3. Estructura del directorio `interfaz/`

- [`referencias/design-system-clinico-v1.1-vistas-auditadas.md`](referencias/design-system-clinico-v1.1-vistas-auditadas.md): Copia íntegra sin editar del Design System v1.1 y auditoría de las 53 vistas.
- [`planes/00_INDICE_Y_MODO_DE_TRABAJO.md`](planes/00_INDICE_Y_MODO_DE_TRABAJO.md): Índice general, convenciones, estados y ritual de trabajo.
- [`planes/01_DIAGNOSTICO_DEL_REPOSITORIO.md`](planes/01_DIAGNOSTICO_DEL_REPOSITORIO.md): Inventario real verificado del repositorio (`Agente/`, `Database/`, `Backend/`, `Frontend/`).
- [`planes/02_REQUISITOS_Y_TRAZABILIDAD.md`](planes/02_REQUISITOS_Y_TRAZABILIDAD.md): Trazabilidad de requisitos (`RF`, `RNF`, `F01–F15`, `I01–I15`, `CA01–CA20`) hacia vistas, mocks y pruebas.
- [`planes/03_MAPA_DE_53_VISTAS.md`](planes/03_MAPA_DE_53_VISTAS.md): Catálogo maestro verificable de las **53/53 entradas** (`V01–V19`, `H01–H08`, `C01–C05`, `L01–L14`, `P01–P07`).
- [`planes/04_ARQUITECTURA_FRONTEND.md`](planes/04_ARQUITECTURA_FRONTEND.md): Arquitectura React + TypeScript, rutas, puertos/adaptadores y aislamiento del motor.
- [`planes/05_DESIGN_SYSTEM_Y_COMPONENTES.md`](planes/05_DESIGN_SYSTEM_Y_COMPONENTES.md): Tokens CSS/TS y contrato de los 27 componentes aprobados.
- [`planes/06_VISTAS_COMUNES.md`](planes/06_VISTAS_COMUNES.md): Especificación funcional de `V01–V19`.
- [`planes/07_VISTAS_HOSPITAL.md`](planes/07_VISTAS_HOSPITAL.md): Especificación funcional de `H01–H08`.
- [`planes/08_VISTAS_ODONTOLOGIA.md`](planes/08_VISTAS_ODONTOLOGIA.md): Especificación funcional de `C01–C05` (sin odontograma).
- [`planes/09_VISTAS_LABORATORIO.md`](planes/09_VISTAS_LABORATORIO.md): Especificación funcional de `L01–L14`.
- [`planes/10_VISTAS_PEDIATRIA.md`](planes/10_VISTAS_PEDIATRIA.md): Especificación funcional de `P01–P07`.
- [`planes/11_MOCKS_SESIONES_ROLES_Y_PERMISOS.md`](planes/11_MOCKS_SESIONES_ROLES_Y_PERMISOS.md): Perfiles sintéticos, matriz rol-permiso, fixtures por institución y simulador de latencia/errores.
- [`planes/12_PRUEBAS_Y_AUDITORIA.md`](planes/12_PRUEBAS_Y_AUDITORIA.md): Estrategia de verificación funcional, visual, responsive y WCAG 2.2 AA.
- [`planes/13_ROADMAP_Y_DEPENDENCIAS.md`](planes/13_ROADMAP_Y_DEPENDENCIAS.md): Orden de ejecución por unidades verificables (`U01` a `U18`).
- [`planes/14_DECISIONES_PENDIENTES.md`](planes/14_DECISIONES_PENDIENTES.md): Registro de discrepancias documentales (§14.3 del Design System) y recomendaciones.
- [`planes/15_ESTADO_Y_BITACORA.md`](planes/15_ESTADO_Y_BITACORA.md): Tablero de seguimiento en tiempo real y bitácora de entregas.
- [`planes/16_CONTRATOS_Y_FUTURA_INTEGRACION.md`](planes/16_CONTRATOS_Y_FUTURA_INTEGRACION.md): Mapeo `MockRepository → API REST /api/v1`, errores, cursores e `Idempotency-Key`.
- [`vistas/V01_INICIO_DE_SESION.md`](vistas/V01_INICIO_DE_SESION.md): Ficha de diseño y especificación funcional de la primera unidad (`V01`, pendiente de implementación).
