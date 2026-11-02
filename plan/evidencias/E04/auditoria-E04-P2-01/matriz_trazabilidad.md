# Matriz de Trazabilidad Requisito → Código → Test — E04-P2-01

| Requisito | Fuente | Unidad(es) | Pruebas Asociadas | Estado |
|---|---|---|---|---|
| `RF-P01` | `02_P2.md#e04-p2-01` | `U-DOM-01`, `U-CASO-01`, `U-ADP-02`, `U-FE-02` | `pediatria.test.ts`, `clinica-firestore.test.ts`, `PediatricGuardiansUI.test.tsx` | CUBIERTO |
| `RF-P02` | `02_P2.md#e04-p2-01` | `U-CASO-01`, `U-ADP-02`, `U-FE-02` | `clinica-firestore.test.ts` (subcaso E04 contacto compartido), `pacientes-firestore.test.ts` | CUBIERTO |
| `RF-P03` | `02_P2.md#e04-p2-01` | `U-DOM-01`, `U-CASO-01`, `U-FE-02` | `pediatria.test.ts`, `clinica-firestore.test.ts` | CUBIERTO |
| `RF-P04` | `02_P2.md#e04-p2-01` | `U-DOM-01`, `U-CASO-01`, `U-FE-02` | `pediatria.test.ts` (baja último principal), `clinica-firestore.test.ts` | CUBIERTO |
| `RF-P05` | `02_P2.md#e04-p2-01` | `U-DOM-03`, `U-CASO-02`, `U-ADP-01`, `U-FE-03` | `pediatria-antecedentes.test.ts`, `clinica-firestore.test.ts`, `PediatricAntecedentesUI.test.tsx` | CUBIERTO |
| `RF-P06` | `02_P2.md#e04-p2-01` | `U-DOM-03`, `U-CASO-02`, `U-ADP-01`, `U-FE-04` | `clinica-firestore.test.ts`, `PediatricAntecedentesUI.test.tsx` | CUBIERTO |
| `RF-P07` | `02_P2.md#e04-p2-01` | `U-DOM-02`, `U-CASO-04`, `U-FE-05` | `pediatria.test.ts` (crecimiento y civil), `clinica-firestore.test.ts`, `PediatricGuardiansUI.test.tsx` | CUBIERTO |
| `RF-P08` | `02_P2.md#e04-p2-01` | `U-CASO-02`, `U-ADP-03`, `U-FE-03` | `clinica-firestore.test.ts`, `PediatricAntecedentesUI.test.tsx` | CUBIERTO |
| `CA09` | `00_PLAN_MAESTRO.md` | `U-CASO-01`, `U-ADP-01` | `clinica-firestore.test.ts` (rollback E04 y contacto) | CUBIERTO |
| `CA10` | `00_PLAN_MAESTRO.md` | `U-DOM-02`, `U-CASO-04` | `pediatria.test.ts` (bisiesto y edad civil) | CUBIERTO |
| `DEC06` | `01_ALCANCE_Y_DECISIONES.md` | `U-ADP-02`, `U-ADP-03`, `U-FE-01` | `HttpAuthRepository.test.ts`, `http-clinica.test.ts` | CUBIERTO |
| `DEC07` | `01_ALCANCE_Y_DECISIONES.md` | `U-ADP-02`, `U-ADP-03` | `http-clinica.test.ts`, `autenticacion-autorizacion.test.ts` | CUBIERTO |
