import type { EventoHistorial, RepositorioConsulta, Consulta, UUID } from '../puertos-v1';

declare const uuid: UUID;
declare const reader: RepositorioConsulta;
const historical: Promise<Consulta | null> = reader.porVersion(uuid, 1);
const event: EventoHistorial = {
  id: uuid, fechaHora: '2026-10-25T12:00:00Z', titulo: 'Sintético',
  tipo: 'DIAGNOSTICO', recursoId: uuid, consultaId: uuid, versionConsulta: 1,
};
// @ts-expect-error Un evento clínico sin versión no es un enlace histórico válido.
const missingVersion: EventoHistorial = {
  id: uuid, fechaHora: '2026-10-25T12:00:00Z', titulo: 'Sintético',
  tipo: 'DIAGNOSTICO', recursoId: uuid, consultaId: uuid,
};
// @ts-expect-error No se solicita una versión indeterminada ni textual.
reader.porVersion(uuid, 'vigente');
void historical; void event; void missingVersion;
