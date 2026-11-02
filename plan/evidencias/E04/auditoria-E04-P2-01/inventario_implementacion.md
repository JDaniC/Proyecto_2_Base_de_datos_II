# Inventario de Implementación — E04-P2-01

## Unidades Auditables

| ID Unidad | Archivo / Componente | Tipo | Riesgo | Requisitos Asociados |
|---|---|---|---|---|
| `U-DOM-01` | `Backend/src/dominio/pediatria/vinculos.ts` | Dominio | CRITICAL | `RF-P01`, `RF-P03`, `RF-P04` |
| `U-DOM-02` | `Backend/src/dominio/pediatria/crecimiento.ts` | Dominio | HIGH | `RF-P07`, `CA10` |
| `U-DOM-03` | `Backend/src/dominio/pediatria/antecedentes.ts` | Dominio | CRITICAL | `RF-P05`, `RF-P06` |
| `U-CASO-01` | `Backend/src/aplicacion/casos-uso/pediatria/gestionar-responsable.ts` | Caso de Uso | CRITICAL | `RF-P01`, `RF-P02`, `RF-P03`, `RF-P04`, `CA09` |
| `U-CASO-02` | `Backend/src/aplicacion/casos-uso/pediatria/gestionar-antecedentes.ts` | Caso de Uso | CRITICAL | `RF-P05`, `RF-P06`, `RF-P08` |
| `U-CASO-03` | `Backend/src/aplicacion/casos-uso/pediatria/consultar-antecedentes.ts` | Caso de Uso | HIGH | `RF-P05`, `RF-P06` |
| `U-CASO-04` | `Backend/src/aplicacion/casos-uso/pediatria/consultar-crecimiento.ts` | Caso de Uso | HIGH | `RF-P07`, `CA10` |
| `U-ADP-01` | `Backend/src/adaptadores/salida/firestore/pediatria/antecedentes-firestore.ts` | Adaptador Salida | HIGH | `RF-P05`, `RF-P06` |
| `U-ADP-02` | `Backend/src/adaptadores/entrada/http/pediatria/responsables.controller.ts` | Adaptador Entrada | HIGH | `RF-P01`, `RF-P02`, `RF-P03`, `DEC06`, `DEC07` |
| `U-ADP-03` | `Backend/src/adaptadores/entrada/http/pediatria/antecedentes.controller.ts` | Adaptador Entrada | HIGH | `RF-P05`, `RF-P06`, `RF-P07`, `RF-P08`, `DEC06`, `DEC07` |
| `U-FE-01` | `Frontend/src/services/http/patients/httpPatientRepository.ts` | Repositorio HTTP | MEDIUM | `RF-P01`–`RF-P07`, `DEC06` |
| `U-FE-02` | `Frontend/src/features/patients/components/PediatricGuardiansHttpView.tsx` | Componente UI | MEDIUM | `RF-P01`, `RF-P02`, `RF-P03`, `RF-P04` |
| `U-FE-03` | `Frontend/src/features/patients/components/PediatricHistoryAllergiesView.tsx` | Componente UI | MEDIUM | `RF-P05`, `RF-P08` |
| `U-FE-04` | `Frontend/src/features/patients/components/PediatricAntecedentesVersionsView.tsx` | Componente UI | MEDIUM | `RF-P06` |
| `U-FE-05` | `Frontend/src/features/patients/components/PediatricGrowthHttpView.tsx` | Componente UI | MEDIUM | `RF-P07`, `CA10` |
