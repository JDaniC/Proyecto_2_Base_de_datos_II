# Revalidación funcional AF01–AF04 — E00-P1-03

25/10/2026. Se conserva el informe inicial como corte histórico. Esta revalidación comprueba sus tres correcciones y el nuevo hallazgo AF04 del revisor Codex en el SHA publicado `3cd02b1`.

**Auditoría contractual: PASS, 26 comprobaciones y cero fallos.** No acredita un servidor ni persistencia ejecutados. El nuevo comentario de dirección legada quedó reproducido en una respuesta de contrato; la lectura real en motores sigue pendiente para E02–E03.

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| AF01 | Nombres/apellidos de lectura hasta 200; contacto hasta 161. Alta/cambio sigue en 80. | T09 PASS; límites de grupos y respuestas de ficha, lista y expediente |
| AF02 | Política odontológica ≤180 en los tres comandos; las otras instituciones mantienen 200 para conservar correcciones de legado. | T10 PASS; fronteras 180/181/200/201 y overlays vinculados a cada operación |
| AF03 | Evento clínico con versión de consulta; HTTP y puerto leen exactamente esa versión. Sin fallback si falta. | T11 PASS; referencia obligatoria y snapshots históricos tras modificación/retiro |
| AF04 | DTO de lectura separado de captura: dirección sin límite API (PostgreSQL TEXT), teléfono hasta 254, correo como cadena heredada, sexo e identificación sin catálogo de escritura y grupo sanguíneo conservado como texto. Responsable lee identificación hasta 120, teléfono hasta 40 y nombre compuesto hasta 401. Los comandos mantienen sus límites originales. | T12 PASS; respuesta de paciente con dirección de 501 caracteres para ficha/lista/expediente, límites 501/4000/4001, y responsable legado; altas siguen rechazando dirección de 501 |

Artefactos: [resultados](resultados-revalidacion.json), [trazabilidad](trazabilidad-revalidacion.csv), [inventario](inventario-revalidacion.csv). La reproducción identifica base Git `3cd02b1`, cambios locales y SHA-256 de OpenAPI, puertos y fixtures. El validador estructural pasó **230 fixtures y 95 esquemas**. La suite de regresiones pasó **5 tests**; las pruebas de tipos compilaron.

Reproducción desde la raíz con las dependencias de `Backend/docs/requirements-contrato.txt`:

```sh
/tmp/e00-p1-03-venv/bin/python Backend/scripts/validar_contrato.py
/tmp/e00-p1-03-venv/bin/python -m unittest discover -s Backend/scripts -p 'test_*.py' -v
/tmp/e00-p1-03-venv/bin/python plan/evidencias/E00/auditoria-E00-P1-03-2026-10-25/reproducir.py --revalidar
Frontend/node_modules/.bin/tsc --strict --noEmit --target ES2022 Backend/docs/puertos-v1.ts Backend/docs/fixtures/puertos-v1.test-d.ts
```

La auditoría original no se sobrescribe. La lectura en cuatro motores, migraciones/índices históricos y rollback concurrente siguen NOT_IMPLEMENTED hasta E01–E03. Los fixtures son datos sintéticos del contrato, no una simulación presentada como persistencia.
