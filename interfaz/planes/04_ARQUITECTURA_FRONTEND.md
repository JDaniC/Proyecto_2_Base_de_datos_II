# 04 — Arquitectura Frontend (`interfaz/app`)

**Fecha:** 19 de octubre de 2026  
**Stack adoptado:** React 19 + TypeScript 5.8 (strict) + Vite 6 + React Router 7 + Vitest + Testing Library.

---

## 1. Principios arquitectónicos

1. **Desacoplamiento hexagonal en el cliente:**
   - Los componentes de UI (`src/design-system/`) son puros, accesibles y solo conocen tokens visuales y props de interacción.
   - Los módulos de negocio (`src/features/`) consumen **contratos de servicio** (`src/services/contracts.ts`) inyectados mediante React Context (`ServiceProvider`).
   - Los repositorios simulados (`src/mocks/`) implementan esos contratos en memoria con latencia configurable, validación de invariantes y simulación de errores (`401`, `403`, `404`, `409`, `503`).
   - Cuando se conecte el backend NestJS (`/api/v1`), se sustituirá el `MockServiceContainer` por `HttpServiceContainer` sin reescribir las vistas.
2. **Prohibición de acceso directo a motores de base de datos:**
   - `interfaz/app/package.json` **no incluye ni incluirá** `pg`, `mysql2`, `mongodb`, `firebase-admin` ni el SDK cliente de Firestore para leer o escribir expedientes.
   - El motor asociado a la institución (`PostgreSQL`, `MySQL`, `MongoDB`, `Cloud Firestore`) nunca aparece como un selector para el usuario clínico; la institución queda determinada por la cuenta autenticada en la sesión.
3. **Tipado estricto y formatos del contrato `/api/v1`:**
   - Todos los recursos utilizan `id_publico` (UUID string) y `version` (entero positivo) para control de concurrencia.
   - Comandos de escritura aceptan `idempotencyKey` (`Idempotency-Key`) para impedir envíos duplicados.
   - Las respuestas siguen la envoltura `{ data, meta: { correlacion, siguiente_cursor? } }` y los errores usan `AppError` con `{ codigo, mensaje, status, campos?, correlacion }`.

---

## 2. Organización de directorios en `interfaz/app/`

```text
interfaz/app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx                           # Punto de entrada React
    ├── app/
    │   ├── App.tsx                        # Enrutador y composición de providers
    │   ├── AuthSessionContext.tsx         # Estado de sesión simulada, cuenta e institución fija
    │   └── ServiceContext.tsx             # Inyección de repositorios (Mock vs futuro HTTP)
    ├── design-system/
    │   ├── tokens.css                     # Variables CSS exactas del Design System v1.1 (Light Mode)
    │   ├── tokens.ts                      # Constantes tipadas de tokens
    │   └── components/                    # Componentes reutilizables (01-27 del inventario aprobado)
    │       ├── Button.tsx                 # 01 Button (radio 16px, alto 40px, loading/disabled)
    │       ├── Alert.tsx                  # 02 Alert (info, success, warning, danger)
    │       ├── Input.tsx                  # 04 Input / TextField (#EDF5F1, radio 12px, label/error)
    │       ├── Select.tsx                 # 05 Select (#EDF5F1, radio 12px)
    │       ├── Badge.tsx                  # 09 Badge / Status (píldora, tonos suaves)
    │       ├── Panel.tsx                  # 18 Cards & Panels (#F8FBF9 / blanco, radio 16px)
    │       ├── Toast.tsx                  # 20 Toast Notification (bottom-center, radio 14px)
    │       └── ProgressBar.tsx            # 21 Progress Bar (#20666B sobre #DCEBE6)
    ├── layouts/
    │   └── AuthLayout.tsx                 # Layout limpio de acceso y estado de sesión demo
    ├── features/
    │   └── auth/
    │       ├── LoginPage.tsx              # V01 Inicio de sesión (modo demostración)
    │       └── SessionActiveView.tsx      # Vista de comprobación de sesión activa y cierre de sesión (pre-V03)
    ├── mocks/
    │   ├── demoAccounts.ts                # Perfiles sintéticos de las 4 instituciones y escenarios 401/403/503
    │   └── mockAuthRepository.ts          # Implementación simulada con latencia, validación e idempotencia
    ├── services/
    │   ├── types.ts                       # Tipos de dominio, roles, permisos, instituciones y errores API
    │   └── contracts.ts                   # Interfaces de puertos (AuthRepository y futuros puertos)
    └── test/
        ├── setup.ts                       # Configuración de Vitest + @testing-library/jest-dom
        └── V01_LoginPage.test.tsx         # Suite automatizada de V01
```

---

## 3. Mapa de rutas de la aplicación (plan completo vs implementado en `U01`)

| Ruta | IDs cubiertos | Estado en `U01` | Unidad de implementación |
|---|---|---|---|
| `/acceso` | `V01` | Planificada (Primera unidad a implementar) | `U01` |
| `/sesion-activa` | Verificación de sesión y cierre (`V01`) | Planificada (redirige a `/panel` cuando se construya `V03`) | `U01` (`U03` reemplaza por `/panel`) |
| `/acceso-restringido` | `V02` | Planificada | `U02` |
| `/panel` | `V03` | Planificada | `U03` |
| `/pacientes` | `V04` | Planificada | `U04` |
| `/pacientes/nuevo` | `V05`, `P01` | Planificada | `U04` / `U16` |
| `/pacientes/:pacienteId` | `V06`, `V07`, `V14`, `H05`, `P01–P03`, `P05–P07` | Planificada (con pestañas por institución/rol) | `U05`, `U10`, `U16`, `U17` |
| `/pacientes/:pacienteId/consultas/nueva` | `V10`, `V12`, `V13`, `C03`, `C04`, `P02` | Planificada (Stepper 4 pasos) | `U07`, `U11`, `U16` |
| `/pacientes/:pacienteId/consultas/:consultaId` | `V11`, `V12`, `V13`, `H07`, `C04` | Planificada | `U07`, `U10`, `U11` |
| `/agenda` | `V08`, `V09`, `C01`, `C02` | Planificada | `U06`, `U11` |
| `/administracion/usuarios` | `V15`, `V16`, `L14` | Planificada | `U08`, `U14` |
| `/administracion/catalogos` | `V17`, `H08`, `C05`, `L10`, `P04` | Planificada | `U08`, `U10`, `U11`, `U14`, `U17` |
| `/administracion/auditoria` | `V18` | Planificada | `U08` |
| `/hospital/hospitalizaciones` | `H01`, `H02`, `H04` | Planificada | `U09` |
| `/hospital/camas` | `H03`, `H04` | Planificada | `U09` |
| `/hospital/examenes` | `H06` | Planificada | `U10` |
| `/laboratorio/bandeja` | `L01` | Planificada | `U12` |
| `/laboratorio/ordenes/nueva` | `L02` | Planificada | `U12` |
| `/laboratorio/ordenes/:ordenId` | `L03`, `L05`, `L09` | Planificada | `U12`, `U13` |
| `/laboratorio/muestras` | `L04`, `L05` | Planificada | `U12` |
| `/laboratorio/resultados/captura/:ordenId` | `L06`, `L08` | Planificada | `U13` |
| `/laboratorio/resultados/validacion` | `L07`, `L08` | Planificada | `U13` |
| `/laboratorio/informes/:ordenId` | `L09` | Planificada | `U13` |
| `/laboratorio/calidad` | `L11` | Planificada | `U14` |
| `/laboratorio/inventario` | `L12` | Planificada | `U15` |
| `/laboratorio/cobros` | `L13` | Planificada | `U15` |

---

## 4. Justificación de librerías seleccionadas

- **`react` y `react-dom` (19.x):** Base declarada en `DISENO_PROYECTO.md` §6.
- **`react-router-dom` (7.x):** Enrutamiento declarativo con soporte de guards por sesión/rol y parámetros de ruta tipados.
- **`vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`:** Ejecución rápida de pruebas de componentes, teclado, ARIA y flujos en memoria sin depender de servidores externos.
- **Cero frameworks CSS intrusivos:** Los tokens aprobados en `design-system-clinico-v1.1-vistas-auditadas.md` (§10) se implementan directamente en CSS modular y variables nativas (`tokens.css`), garantizando que ningún reset externo altere radios (`16px` en botones, `12px` en inputs, `20px` en modales), alturas (`40px` botón, `48px` input, `120px` textarea) ni active un modo oscuro no deseado.
