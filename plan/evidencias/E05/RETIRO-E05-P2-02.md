# Retiro de E05-P2-02 · Inventario, equipos y calidad

Fecha: 07/11/2026, America/Guatemala. La solicitud humana confirma retirar del tablero y conservar el cierre mínimo de DEC20. E05-P2-02 queda como referencia histórica. No tuvo PR ni integración y no acredita una entrega funcional.

El trabajo parcial se respaldó byte a byte en un directorio ignorado de la copia local, con 14 archivos nuevos y el parche reversible de los dos puertos. La rama `codex/e05-p2-02-inventario-calidad` conserva el diseño y la coordinación publicados en `e62dbf2`. Los archivos parciales se retiraron de las rutas activas de la copia local. `develop` en `b2c142e` no contiene ese módulo ni la migración 013. La reserva propia se libera con lease sobre `275ed4365a4e8edd656102bf7199f6217395a52f` tras comprobar la integración de este cierre.

## Auditorías del retiro

| Auditoría | Inventario y comprobación reproducible | Resultado |
|---|---|---|
| Seguridad | Inventario: tablero, cronograma, estado, ficha, trazabilidad, evidencias, mapa UI y su lista de exclusiones. `git diff --exit-code b2c142e -- Database Backend/src Backend/docs/openapi.yaml` confirma igualdad de API, permisos y persistencia. La lista de exclusiones es declarativa y las funciones de enrutamiento son idénticas. La evidencia contiene referencias de Git y conteos. El respaldo quedó fuera del contenido publicado. | PASS |
| Requisitos | DEC20 y petición humana → retiro del tablero, cronograma y referencias operativas → búsqueda de ID en tablero y rutas de inventario en OpenAPI. La ficha histórica enlaza esta acta. El mapa UI y `EXCLUDED_CONTRACT_METHODS` clasifican los nueve métodos de inventario y calidad como excluidos por DEC20. `cobros-esquema.test.mjs` verifica la clasificación y que carecen de operación publicada. `python3 scripts/github/cola.py` mantiene E05-P1-04 como única disponible. E05 sigue abierta para la instalación y la verificación en cuatro motores. | PASS |

Validación: 46 contratos, lint de backend, 152 pruebas frontend de HTTP y alcance, y build frontend PASS. Las tres pruebas de `RouteContent.test.tsx` reproducen el mismo fallo con el archivo de alcance del commit integrado `b2c142e`; son fallos basales fuera de esta clasificación.
