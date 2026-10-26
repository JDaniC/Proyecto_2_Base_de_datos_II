# Revisión de seguridad acotada · E01-P1-02

Fecha: 25/10/2026 (America/Guatemala)
Alcance: contexto autenticado, políticas por rol/permiso y parser JSON usado para el cuerpo HTTP.
Entorno: código local; pruebas HTTP solo en `127.0.0.1`, datos sintéticos; sin motores ni credenciales reales.

## Resultado

**0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW confirmados/probables.** Un aspecto de autenticación real permanece fuera de este ID y no se declara cubierto.

| ID | Severidad | Estado | Categoría | Componente | Resumen |
|---|---|---|---|---|---|
| SEC-01 | INFO | BLOCKED | Autenticación y autorización | `crearContextoAutenticado` | Firma, emisor, audiencia, vencimiento, revocación Firebase y consulta de cuenta real corresponden a E01-P1-03, aún no implementado. |

## Controles comprobados

- `crearContextoAutenticado` requiere UID e institución coincidentes, cuenta ACTIVA, UUID/correlación válidos, versión positiva, roles/permisos reconocidos y devuelve copia inmutable. Las pruebas rechazan UID discordante, institución discordante, cuenta inactiva y rol no reconocido.
- `validarPermiso` no infiere permisos desde un rol. `validarPrescriptorClinico` exige rol institucional y profesional enlazado activo; laboratorio se restringe a `MEDICO_LABORATORIO`. Analistas y validadores no satisfacen el rol de prescriptor.
- Pediatría exige un responsable principal para el alta y un vínculo separado activo/autorizado para atender; no se equiparan ambos estados.
- `json.verify` revisa el cuerpo de entrada antes de pasar el valor al controlador. El test local usa nombres duplicados por escape Unicode y obtiene 400 con error común; ningún controlador ve el cuerpo ambiguo.
- La regla AST y ESLint pasan; dominio/aplicación no importan framework, drivers, UI, entorno ni adaptadores.

## Límite de validación

El identificador recibido por la fábrica es `IdentidadVerificada`, que presupone la salida del adaptador de identidad. Este ID no verifica tokens ni consulta cuentas reales; esos flujos y las pruebas de autorización por usuario/objeto siguen en E01-P1-03/E06. No hay rutas clínicas desplegadas contra las cuales probar BOLA/BFLA.

El test funcional solo valida que las políticas puras aceptan/rechazan los estados esperados. No se hicieron pruebas de concurrencia o persistencia, porque no existe UoW ejecutable ni adaptador de base en este alcance.
