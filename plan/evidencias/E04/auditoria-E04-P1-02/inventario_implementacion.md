# Inventario de Implementación — E04-P1-02

## Capa de Dominio
- `Backend/src/dominio/hospital/hospitalizacion.ts`: Entidades `Hospitalizacion`, `CamaHospitalaria`, `AsignacionCamaItem`, `NotaEvolucionItem`, `ProcedimientoHospitalarioItem`, y tipos `EstadoHospitalizacion`, `EstadoCama`, `TipoEgresoHospitalario`.

## Capa de Aplicación
- `Backend/src/aplicacion/puertos/hospital.ts`: Contrato de puertos `PuertosHospital` con operaciones de lectura, ingreso, traslado, liberación, evolución y egreso.
- `Backend/src/aplicacion/casos-uso/hospital/consultar-hospitalizaciones.ts`: Caso de uso `ConsultarHospitalizaciones` para listar hospitalizaciones por estado, por ID, por paciente y consultar mapa de camas.
- `Backend/src/aplicacion/casos-uso/hospital/gestionar-hospitalizaciones.ts`: Caso de uso `GestionarHospitalizaciones` para mutaciones con validaciones de contexto, estado de paciente, médico activo y versiones optimistas.

## Capa de Adaptadores de Persistencia
- `Backend/src/adaptadores/salida/postgresql/hospital/puertos-hospital-postgresql.ts`: Adaptador PostgreSQL para `hospitalizacion`, `asignacion_cama`, `cama`, `habitacion`. Implementa verificación de disponibilidad, exclusiones de concurrencia y transacciones atómicas de traslado y egreso.
- `Backend/src/adaptadores/salida/postgresql/pacientes/crear-bundle-pacientes-postgresql.ts`: Expone `crearHospitalPostgresql` integrado al pool institucional.

## Capa de Entrada HTTP
- `Backend/src/adaptadores/entrada/http/hospital/hospital.controller.ts`: Endpoints bajo `/hospital` (`/hospitalizaciones`, `/:id`, `/:id/egreso`, `/:id/asignacion-cama`, `/:id/liberacion-cama`, `/:id/notas-evolucion`, `/:id/procedimientos`, `/camas`).

## Frontend
- `Frontend/src/services/http/hospital/httpHospitalizationRepository.ts`: Implementación cliente HTTP de `HospitalizationRepository`.
- `Frontend/src/services/http/serviceFactory.ts`: Conexión de `httpHospitalizationRepository` en fábrica de servicios HTTP.
