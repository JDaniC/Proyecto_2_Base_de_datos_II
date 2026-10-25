# Revalidación de AF01–AF03 — E00-P1-03

25/10/2026. Daniel autorizó corregir los hallazgos y continuar el flujo de la tarea. El informe original conserva el resultado del corte `126bf9b`; esta revalidación es posterior.

**Auditoría contractual: PASS, 25 comprobaciones y cero fallos.** No acredita un servidor ni persistencia ejecutados. Revisión nativa e integración se registran en el seguimiento de la tarea, sin anticipar su aprobación.

| Hallazgo | Corrección | Evidencia nueva |
|---|---|---|
| AF01 | Nombres/apellidos de lectura hasta 200; contacto hasta 161. Alta/cambio sigue en 80. | T09 PASS; fixtures de límites 80/81/160/161/200/201; prueba de ficha/lista/expediente en cuatro instituciones |
| AF02 | Política odontológica ≤180 en los tres comandos; las otras instituciones mantienen 200 para conservar también correcciones de legado. | T10 PASS; fronteras 180/181/200/201 y enlace efectivo de overlays a cada operación |
| AF03 | Evento clínico con versión de consulta; HTTP y puerto leen exactamente esa versión. Sin fallback si falta; 404 y autorización actual. | T11 PASS; pruebas de referencia obligatoria, datos históricos distintos del snapshot modificado y presentes tras retirada en vigente; firmas TypeScript |

Artefactos: [resultados](resultados-revalidacion.json), [trazabilidad](trazabilidad-revalidacion.csv), [inventario](inventario-revalidacion.csv). Los resultados identifican la base Git, cambios locales y SHA-256 del contrato, puertos y fixtures para evitar atribuirlos a un SHA anterior. El verificador estructural pasó **229 fixtures y 93 esquemas**. La suite de regresiones pasó **4 tests**; las pruebas de tipos compilaron correctamente.

Reproducción desde la raíz con las dependencias de `Backend/docs/requirements-contrato.txt`:

```sh
/tmp/e00-p1-03-venv/bin/python Backend/scripts/validar_contrato.py
/tmp/e00-p1-03-venv/bin/python -m unittest discover -s Backend/scripts -p 'test_*.py' -v
/tmp/e00-p1-03-venv/bin/python plan/evidencias/E00/auditoria-E00-P1-03-2026-10-25/reproducir.py --revalidar
Frontend/node_modules/.bin/tsc --strict --noEmit --target ES2022 Backend/docs/puertos-v1.ts Backend/docs/fixtures/puertos-v1.test-d.ts
```

La auditoría original no se sobrescribe. Los nuevos resultados se guardan con sufijo `-revalidacion`. La lectura en cuatro motores, las migraciones/índices históricos y el rollback concurrente siguen NOT_IMPLEMENTED hasta E01–E03. Los fixtures de historia son datos de contrato y no una simulación presentada como persistencia real.
