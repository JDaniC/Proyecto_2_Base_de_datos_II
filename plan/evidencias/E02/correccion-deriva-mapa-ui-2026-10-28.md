# Corrección de la deriva del mapa de contratos UI (E02-P1-03)

Fecha: 28/10/2026, America/Guatemala. Ejecutor: JDaniC. Rama `codex/e02-p1-03-deriva-mapa-ui`.

## Defecto observado en `develop`

`python3 Backend/scripts/validar_contrato.py` (con las dependencias de `Backend/docs/requirements-contrato.txt`) terminaba en `ValueError: Métodos UI omitidos o inventados` sobre `origin/develop` (`9f8dfb1`), es decir, en la rama de integración y no en una copia local.

Causa: la integración de [PR #47](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/47) (`41082c9`, E02-P1-03) añadió `PatientRepository.obtenerHistorial` a `Frontend/src/services/contracts.ts` y su cliente HTTP, pero no agregó la fila correspondiente a `Backend/docs/mapa-ui-v1.json`. Comparación exacta antes de la corrección:

| Conjunto | Métodos |
|---|---:|
| `contracts.ts` | 118 |
| `mapa-ui-v1.json` | 117 |
| Faltante en el mapa | `PatientRepository.obtenerHistorial` |
| Sobrante en el mapa | ninguno |

Esto rompía la validación documental de cualquier tarea posterior, no una prueba funcional ni la API. No se modificó ningún artefacto de contrato canónico: `openapi.yaml`, fixtures y esquemas quedaron intactos.

## Corrección aplicada

- `Backend/docs/mapa-ui-v1.json`: fila nueva para `PatientRepository.obtenerHistorial` con `categoria: SIN_USO_DIRECTO_UI`, `destino: COMUN_V1`, `operationId: pacienteHistorial`, `responsable: E02-P2-03`, la regla de cursor opaco/rango UTC/límite 1-100/permiso `historial.leer` y la propuesta `GET /api/v1/pacientes/{id}/historial`.
- Clasificación: la cronología de `PatientRecordPage.tsx` consume `obtenerExpedienteCompleto`; `obtenerHistorial` solo se invoca desde el cliente HTTP (`services/http/patients/httpPatientRepository.ts:35`) y su prueba (`test/http/PatientsHttp.test.tsx:106`). No se le atribuye uso de pantalla inexistente.
- Conteos vigentes actualizados en `Backend/docs/README.md`, `Frontend/docs/CONTRATOS_Y_DIFERENCIAS_UI.md` y `plan/03_CONTRATOS_Y_FLUJOS.md`: 118 métodos totales, 96 `VIGENTE_UI`, 12 `SIN_USO_DIRECTO_UI`, 10 excluidos, 21 `COMUN_V1`, 87 `EXTENSION_PENDIENTE`.
- `plan/evidencias/E00/E00-P1-03.md` no se modifica: es evidencia fechada de su corte y sus 117 métodos corresponden al inventario de entonces.

## Verificación

| Comando | Entorno | Resultado real |
|---|---|---|
| `.venv/bin/python Backend/scripts/validar_contrato.py` | Offline; sin API, credenciales ni motores | **PASS**: 118 métodos, 96 activos, 26 operaciones, 99 esquemas, 230 fixtures |
| `.venv/bin/python -m unittest discover -s Backend/scripts -p 'test_*.py'` | Offline | **PASS**: 8 pruebas |
| Conteo del JSON | Estático | 118 filas; 96 `VIGENTE_UI`, 12 `SIN_USO_DIRECTO_UI`, 10 `EXCLUIDO_ALCANCE_O_SOLO_MOCK`; 21 `COMUN_V1`, 87 `EXTENSION_PENDIENTE`, 10 `EXCLUIDO` |

Salida resumida del validador:

```json
{"resultado": "PASS", "openapi": "3.1.0", "rutas": 22, "operaciones": 26,
 "esquemas": 99, "fixtures": 230, "metodos_ui": 118, "vigentes_ui": 96}
```

## Límites de esta evidencia

- No acredita endpoints nuevos, persistencia ni UI adicional: el método ya existía en el cliente HTTP desde E02-P1-03 y el endpoint `pacienteHistorial` ya estaba `IMPLEMENTED`.
- No reabre ni cambia el estado HECHA de E02-P1-03; registra una corrección documental fechada de su entregable.
- No modifica el tablero: no hay tarea nueva ni cambio de ejecutor.
