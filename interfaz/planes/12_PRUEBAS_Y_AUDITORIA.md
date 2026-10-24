# 12 — Estrategia de Pruebas y Auditoría por Unidad

**Fecha:** 19 de octubre de 2026  
**Objetivo de calidad:** Cero regresiones de compilación/tipos, cobertura de flujos de negocio con datos sintéticos, diseño responsive verificado en tres resoluciones y cumplimiento demostrable de WCAG 2.2 AA.

---

## 1. Niveles de verificación obligatorios por unidad

Cada unidad del roadmap (`U01` a `U18`) debe superar cinco capas de verificación antes de solicitar aprobación al usuario:

### Capa 1 — Calidad estática y compilación
- **Comando:** `npm --prefix interfaz/app run typecheck && npm --prefix interfaz/app run build`
- **Criterio:** TypeScript en modo `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, sin `any` implícitos ni errores de empaquetado en Vite.

### Capa 2 — Pruebas automatizadas de unidad, integración y accesibilidad (`Vitest` + `Testing Library`)
- **Comando:** `npm --prefix interfaz/app run test`
- **Cobertura mínima por vista:**
  1. Renderizado de estado inicial y presencia de etiquetas obligatorias (incluyendo aviso de modo demostración).
  2. Validación de campos requeridos y asociación programática `label → input` y `error → aria-describedby`.
  3. Flujo principal exitoso con datos sintéticos (ej. en `V01`: selección de cuenta institucional, estado `loading`, inicio de sesión en la institución fija y cierre de sesión).
  4. Manejo de errores controlados (`401`, `403`, `409`, `503`) sin borrar los datos ya ingresados en el formulario.
  5. Idempotencia y prevención de doble clic durante operaciones en progreso (`disabled` / `aria-busy`).
  6. Accesibilidad de teclado y diálogo modal (`role="dialog"`, cierre con `Escape`).

### Capa 3 — Verificación visual y responsive en navegador real
- **Herramienta:** Servidor local Vite + Playwright / navegador headless para inspección de DOM, estilos computados y capturas de pantalla reales guardadas en `interfaz/evidencias/`.
- **Resoluciones obligatorias de prueba:**
  - **Escritorio (`1440 × 900 px`):** Composición completa, paneles sutiles y alineación.
  - **Tablet (`768 × 1024 px`):** Adaptación de rejillas y controles sin desbordamiento horizontal (`scrollWidth <= clientWidth`).
  - **Móvil (`375 × 812 px`):** Una sola columna, objetivos táctiles accesibles, Toast centrado en la parte inferior (`bottom-center`) sin cortar contenido.

### Capa 4 — Auditoría de cumplimiento del Design System v1.1
- Verificación explícita de:
  - Exclusividad de **Light Mode** (`#FFFFFF` fondo página, `#F8FBF9` paneles, `#EDF5F1` inputs).
  - Geometría exacta: botones con `border-radius: 16px` y `height: 40px`; inputs/selects con `border-radius: 12px` y `height: 48px`; modales con `border-radius: 20px`; toasts `bottom-center` con `border-radius: 14px`; tabs con borde inferior activo de `3px` en `#20666B`.
  - Ausencia de tarjetas repetidas por fila o métrica.

### Capa 5 — Auditoría de reglas de negocio y seguridad funcional
- Verificación de que la vista no expone controles de selección de motor de base de datos, aísla la institución activa, respeta los permisos de la cuenta sintética y mantiene el aviso de simulación.

---

## 2. Criterios de dictamen en `interfaz/auditorias/<ID>_AUDITORIA.md`

| Dictamen interno | Condición para emitirlo |
|---|---|
| `AUDITADA_PENDIENTE_APROBACION` | Todas las pruebas ejecutables pasan (`PASS`), se generaron y verificaron las capturas reales en `interfaz/evidencias/`, no quedan hallazgos bloqueantes ni altos abiertos, y la unidad está lista para revisión del usuario. |
| `OBSERVADA` | Existen hallazgos medios/altos pendientes o el usuario solicitó ajustes visuales/funcionales. |
| `BLOQUEADA` | Depende de una decisión de producto abierta en [`14_DECISIONES_PENDIENTES.md`](14_DECISIONES_PENDIENTES.md) o de una herramienta externa no disponible. |
| `APROBADA` | **Reservado exclusivamente para cuando el usuario confirme su aprobación explícita en el chat.** |
