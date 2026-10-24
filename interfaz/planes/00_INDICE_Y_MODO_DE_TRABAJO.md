# 00 — Índice Maestro y Modo de Trabajo

**Fecha:** 19 de octubre de 2026  
**Alcance:** Planificación, diseño detallado, simulación tipada, implementación incremental y auditoría de las 53 entradas del catálogo de interfaz clínica.

---

## 1. Mapa de documentos de `interfaz/`

### Referencias inmutables
- [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md): Especificación visual aprobada v1.1 (tokens, 27 componentes, 5 pantallas aprobadas y auditoría de las 53 entradas).

### Planes maestros (`interfaz/planes/`)
1. [`00_INDICE_Y_MODO_DE_TRABAJO.md`](00_INDICE_Y_MODO_DE_TRABAJO.md) — Este documento.
2. [`01_DIAGNOSTICO_DEL_REPOSITORIO.md`](01_DIAGNOSTICO_DEL_REPOSITORIO.md) — Inventario real del repositorio, bases de datos verificadas y estado de `Frontend/` y `Backend/`.
3. [`02_REQUISITOS_Y_TRAZABILIDAD.md`](02_REQUISITOS_Y_TRAZABILIDAD.md) — Matriz completa de requerimientos (`RF`, `RNF`, `F01–F15`, `I01–I15`, `CA01–CA20`) frente a vistas.
4. [`03_MAPA_DE_53_VISTAS.md`](03_MAPA_DE_53_VISTAS.md) — Registro único y trazable de las **53 entradas** (`V01–V19`, `H01–H08`, `C01–C05`, `L01–L14`, `P01–P07`).
5. [`04_ARQUITECTURA_FRONTEND.md`](04_ARQUITECTURA_FRONTEND.md) — Estructura modular en `interfaz/app/`, puertos de datos, enrutamiento y fronteras de seguridad.
6. [`05_DESIGN_SYSTEM_Y_COMPONENTES.md`](05_DESIGN_SYSTEM_Y_COMPONENTES.md) — Traducción de tokens a código y especificación técnica de los 27 componentes.
7. [`06_VISTAS_COMUNES.md`](06_VISTAS_COMUNES.md) — Diseño funcional de las 19 entradas comunes (`V01–V19`).
8. [`07_VISTAS_HOSPITAL.md`](07_VISTAS_HOSPITAL.md) — Diseño funcional de las 8 entradas del Hospital General (`H01–H08`).
9. [`08_VISTAS_ODONTOLOGIA.md`](08_VISTAS_ODONTOLOGIA.md) — Diseño funcional de las 5 entradas de Clínica Odontológica (`C01–C05`).
10. [`09_VISTAS_LABORATORIO.md`](09_VISTAS_LABORATORIO.md) — Diseño funcional de las 14 entradas de Laboratorio Clínico (`L01–L14`).
11. [`10_VISTAS_PEDIATRIA.md`](10_VISTAS_PEDIATRIA.md) — Diseño funcional de las 7 entradas del Centro Médico Pediátrico (`P01–P07`).
12. [`11_MOCKS_SESIONES_ROLES_Y_PERMISOS.md`](11_MOCKS_SESIONES_ROLES_Y_PERMISOS.md) — Dataset sintético por institución, cuentas de demostración, permisos y simulador de fallos.
13. [`12_PRUEBAS_Y_AUDITORIA.md`](12_PRUEBAS_Y_AUDITORIA.md) — Protocolo de pruebas unitarias, integración, accesibilidad (WCAG 2.2 AA) y capturas multi-resolución.
14. [`13_ROADMAP_Y_DEPENDENCIAS.md`](13_ROADMAP_Y_DEPENDENCIAS.md) — Secuencia de implementación en unidades incrementales (`U01` a `U18`).
15. [`14_DECISIONES_PENDIENTES.md`](14_DECISIONES_PENDIENTES.md) — Conflictos detectados entre mockups previos y contrato API, con opciones y recomendación.
16. [`15_ESTADO_Y_BITACORA.md`](15_ESTADO_Y_BITACORA.md) — Estado real de cada unidad y bitácora de auditorías.
17. [`16_CONTRATOS_Y_FUTURA_INTEGRACION.md`](16_CONTRATOS_Y_FUTURA_INTEGRACION.md) — DTOs, cabeceras `Idempotency-Key`, manejo de cursores opacos y errores HTTP.

### Fichas de vistas (`interfaz/vistas/`)
- [`../vistas/V01_INICIO_DE_SESION.md`](../vistas/V01_INICIO_DE_SESION.md) — Especificación detallada lista para cuando se autorice implementar `U01`.

---

## 2. Semántica de estados del proyecto

Ninguna vista o unidad se marca como `APROBADA` automáticamente ni por el solo hecho de estar diseñada en el Design System v1.1.

| Estado | Significado estricto |
|---|---|
| `PENDIENTE` | Planificada y trazada en el catálogo 53/53, pero sin código implementado en `interfaz/app/`. |
| `EN_DESARROLLO` | Unidad activa en construcción durante la iteración actual. |
| `EN_AUDITORIA` | Implementación terminada; ejecutando pruebas automatizadas, revisión visual y accesibilidad. |
| `AUDITADA_PENDIENTE_APROBACION` | Pruebas técnicas, visuales y reporte en `interfaz/auditorias/` completados con evidencia real; esperando revisión y aprobación explícita del usuario. |
| `OBSERVADA` | Revisada con hallazgos pendientes o cambios solicitados por el usuario; no permite avanzar a la siguiente unidad. |
| `BLOQUEADA` | Detenida por una decisión de producto pendiente en [`14_DECISIONES_PENDIENTES.md`](14_DECISIONES_PENDIENTES.md) o un impedimento técnico documentado. |
| `APROBADA` | Aceptada explícitamente por el usuario después de revisar el código, las pruebas y las evidencias de auditoría. |

---

## 3. Reglas operativas y ritual por unidad

1. **Una unidad a la vez:** Se selecciona la unidad que sigue en [`13_ROADMAP_Y_DEPENDENCIAS.md`](13_ROADMAP_Y_DEPENDENCIAS.md), se escribe su ficha en `interfaz/vistas/`, se codifica en `interfaz/app/`, se prueba y se audita en `interfaz/auditorias/`.
2. **Parada obligatoria:** Al concluir la auditoría de una unidad, el desarrollo se detiene y solicita aprobación al usuario antes de iniciar la siguiente unidad.
3. **Sin promesas falsas de seguridad o backend:** La interfaz simulada distingue claramente entre validación de presentación/mock y seguridad real de servidor. El modo demostración exhibe el aviso explícito **«Modo demostración — sin autenticación real · Datos clínicos ficticios»**.
4. **Cero modo oscuro y cero hexadecimales dispersos:** Toda vista consume las variables CSS de `interfaz/app/src/design-system/tokens.css`.

---

## 4. Comandos rápidos de referencia

Desde la raíz del repositorio:

```bash
# Instalar dependencias de la aplicación de interfaz
npm --prefix interfaz/app install

# Servidor de desarrollo local
npm --prefix interfaz/app run dev

# Comprobación de tipos TypeScript
npm --prefix interfaz/app run typecheck

# Pruebas automatizadas con Vitest + Testing Library
npm --prefix interfaz/app run test

# Compilación de producción
npm --prefix interfaz/app run build
```

---

## 5. Siguiente trabajo en curso

- **Fase actual (`Fase 0` — Planificación maestra):** Completada (`planes/00` a `planes/16` + ficha de diseño `vistas/V01_INICIO_DE_SESION.md`). Sin código implementado en `interfaz/app/`.
- **Próxima unidad tras aprobación del plan (`U01`):** Implementación de infraestructura base y [`V01` — Inicio de sesión (modo demo)](../vistas/V01_INICIO_DE_SESION.md).
