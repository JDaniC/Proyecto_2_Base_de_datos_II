# Ficha de Vista — `V01` Inicio de Sesión (Modo Demostración)

**Unidad del Roadmap:** `U01`  
**ID del catálogo:** `V01`  
**Nombre canónico:** Inicio de sesión  
**Superficie:** Ruta independiente `/acceso` (+ comprobación de sesión activa en `/sesion-activa` antes de construir `V03`).  
**Estado actual:** `PENDIENTE` (Especificada en Fase 0; sin código implementado).

---

## 1. Fuentes y propósito

- **Fuentes:** [`Agente/DISENO_PROYECTO.md`](../planes/../../Agente/DISENO_PROYECTO.md) (§4, §5.3, §5.3.1, §8.1 `V01`, `CA01`, `CA02`), [`Agente/REQUERIMIENTOS_FUNCIONALES.md`](../planes/../../Agente/REQUERIMIENTOS_FUNCIONALES.md) (`RF-001`, `RF-002`, `RF-003`, `RF-018`) y [`../referencias/design-system-clinico-v1.1-vistas-auditadas.md`](../referencias/design-system-clinico-v1.1-vistas-auditadas.md) (§3, §4, §5, §14.2).
- **Función:** Permitir el ingreso controlado a una sesión de demostración seleccionando una cuenta sintética vinculada a una única institución médica (o ingresando el correo institucional sintético de dicha cuenta), validar estados de cuenta (`ACTIVO`, `PENDIENTE`, `INACTIVO`), simular escenarios de fallo (`401`, `403`, `503`), mantener aislada la institución activa durante toda la sesión y permitir cerrar la sesión de demostración.

---

## 2. Roles, instituciones y reglas de negocio

- **Roles admitidos en el catálogo de prueba:**
  - Hospital General: Médico Especialista (`MEDICO`), Secretaría y Admisión (`SECRETARIA`), Administrador Institucional (`ADMIN_INSTITUCIONAL`) y cuenta médica inactiva (`INACTIVO`).
  - Clínica Odontológica: Odontólogo General (`ODONTOLOGO`) y Secretaría Odontológica (`SECRETARIA`).
  - Laboratorio Clínico: Analista (`ANALISTA_LABORATORIO`), Validador (`VALIDADOR_LABORATORIO`), Médico Responsable vinculado a solicitante individual (`MEDICO_LABORATORIO`) y cuenta pendiente (`PENDIENTE`).
  - Centro Médico Pediátrico: Pediatra (`PEDIATRA`) y Secretaría Pediátrica (`SECRETARIA`).
- **Reglas innegociables aplicadas:**
  1. **Aviso permanente:** Muestra de forma explícita y destacada «Modo demostración — sin autenticación real · Datos clínicos ficticios».
  2. **Sin contraseñas reales ni falso Firebase conectado:** No solicita contraseñas reales ni finge una conexión activa a Firebase Authentication en la nube. Explica que en producción el backend verificará el ID Token firmado y cargará permisos desde la base institucional.
  3. **Sin selector de motor de base de datos:** El usuario clínico no elige `PostgreSQL`, `MySQL`, `MongoDB` ni `Firestore`. El filtro por institución sirve únicamente para explorar el catálogo de cuentas sintéticas de evaluación.
  4. **Aislamiento de sesión:** Una vez autenticada una cuenta, la sesión queda atada a esa única institución; para probar otra institución o rol es obligatorio pulsar **«Cerrar sesión de demostración»**.

---

## 3. Estructura visual (Wireframe descriptivo)

```text
+-----------------------------------------------------------------------------------+
| [Banner superior info] Modo demostración — sin autenticación real · Datos ficticios|
+-----------------------------------------------------------------------------------+
| Encabezado: Plataforma Unificada de Historiales Clínicos                          |
| Subtítulo: Acceso institucional · Enrutamiento automático por identidad           |
+---------------------------------------------------+-------------------------------+
| COLUMNA PRINCIPAL (Panel blanco/sutil, radio 16px)| COLUMNA LATERAL (Panel #F8FBF9)|
|                                                   |                               |
| 1. Tabs con línea inferior 3px (#20666B):         | Resumen de cuenta seleccionada|
|    [Todas] [Hospital] [Odontología] [Lab] [Ped.]  | - Nombre, rol e institución   |
|                                                   | - UID sintético y colegiado   |
| 2. Lista de cuentas sintéticas (Radio 20x20px):   | - Estado (ACTIVO / INACTIVO / |
|    (•) Dra. Elena Morales — Hospital General      |   PENDIENTE)                  |
|        Médico Especialista · Estado: ACTIVO       | - Permisos efectivos (badges) |
|    ( ) Secretaría Hospital — Estado: ACTIVO       |                               |
|    ( ) Dr. Javier Castellanos — Odontología       | Formulario de verificación:   |
|    ( ) Licda. Sofía Paniagua — Laboratorio        | [Input #EDF5F1] Identificador |
|    ( ) MSc. Carlos Batres — Laboratorio (Validador|   o correo sintético          |
|    ( ) Dra. Gabriela Quintana — Pediatría         | [Select #EDF5F1] Simulación   |
|    ( ) Dr. Mateo Solares — Cuenta INACTIVA (403)  |   de respuesta del servidor   |
|    ( ) Lic. Diego Arévalo — Cuenta PENDIENTE (403)| [Switch 50x29] Simular latencia|
|                                                   |                               |
|                                                   | [Botón Primario 16px, 40px]   |
|                                                   |   "Iniciar sesión demo"       |
|                                                   | [Botón Ghost] "¿Problemas de  |
|                                                   |   acceso o cuenta inactiva?"  |
+---------------------------------------------------+-------------------------------+
| [Toast bottom-center, radio 14px]: Confirmación centrada al iniciar/cerrar sesión |
+-----------------------------------------------------------------------------------+
```

---

## 4. Componentes del Design System v1.1 reutilizados

- **01 Button:** Primario (`#20666B`, radio `16px`, alto `40px`), secundario y ghost. Bloquea doble clic cuando `loading=true`.
- **02 Alert:** Banner informativo de modo demostración y alertas persistentes de error (`400`, `401`, `403`, `503`) con código y correlación.
- **04 Input / TextField:** Campo de identificador/correo institucional sintético (`#EDF5F1`, radio `12px`, alto `48px`, etiqueta visible y `aria-describedby`).
- **05 Select:** Selector de escenario de respuesta simulada (`Normal`, `401 NO_AUTENTICADO`, `403 CUENTA_NO_HABILITADA`, `503 PERSISTENCIA_NO_DISPONIBLE`).
- **07 Switch:** Interruptor (`50 × 29 px`) para activar/desactivar latencia simulada de red y observar la `ProgressBar`.
- **08 Radio:** Selección accesible de cuenta sintética (`20 × 20 px`).
- **09 Badge / Status:** Píldoras de estado de cuenta (`ACTIVO`, `INACTIVO`, `PENDIENTE`) y rol institucional.
- **11 Modal / Dialog:** Ventana de «Instrucciones de acceso institucional y recuperación» (`role="dialog"`, radio `20px`, cierre con `Escape`).
- **15 Tabs:** Filtro del catálogo de cuentas sintéticas con subrayado activo de `3px` en `#20666B`.
- **18 Cards & Panels:** Paneles sutiles (`#F8FBF9` y `#FFFFFF`, borde `#E0EAE6`, radio `16px`).
- **20 Toast Notification:** Notificación inferior centrada (`bottom-center`, radio `14px`, contenido centrado).
- **21 Progress Bar:** Barra de progreso en `#20666B` sobre `#DCEBE6` durante la verificación de la sesión.

---

## 5. Criterios de aceptación comprobables (para cuando se implemente `U01`)

- [ ] **CA-V01-01 (Light Mode y tokens):** Fondo principal `#FFFFFF`, paneles `#F8FBF9`, inputs `#EDF5F1` (radio `12px`), botón primario `#20666B` (radio `16px`, alto `40px`), tabs con línea inferior de `3px` y toast `bottom-center` (radio `14px`).
- [ ] **CA-V01-02 (Transparencia de modo demo):** Muestra explícitamente «Modo demostración — sin autenticación real» y nunca solicita contraseñas reales ni expone un selector de motor de base de datos.
- [ ] **CA-V01-03 (Inicio de sesión y aislamiento institucional):** Al iniciar sesión con una cuenta `ACTIVO`, transiciona a la vista de sesión autenticada mostrando el usuario, su institución fija, sus permisos efectivos y bloqueando cualquier cambio de institución sin cerrar sesión.
- [ ] **CA-V01-04 (Validación y errores `400`/`401`/`403`/`503`):**
  - Si se borra el identificador/correo y se envía, muestra error de validación junto al campo (`aria-invalid="true"`) sin perder la selección.
  - Si se intenta ingresar con una cuenta `INACTIVO` o `PENDIENTE`, devuelve `403 CUENTA_NO_HABILITADA` con código de correlación.
  - Permite simular `401 NO_AUTENTICADO` y `503 PERSISTENCIA_NO_DISPONIBLE` con opción de reintento.
- [ ] **CA-V01-05 (Accesibilidad y Responsive):** Navegable con teclado, modal con cierre por `Escape`, y verificado en `1440px`, `768px` y `375px` sin desbordamiento horizontal.

---

## 6. Pruebas y evidencias previstas

- **Suite automatizada prevista:** `interfaz/app/src/test/V01_LoginPage.test.tsx`
- **Reporte de auditoría previsto:** `interfaz/auditorias/V01_INICIO_DE_SESION_AUDITORIA.md`
- **Siguiente dependencia tras aprobación:** Unidad `U02` (`V02` Acceso restringido + `V19` Estados transversales + Shell `Sidebar`/`Header`).
