import type { CambioComun, EventoHistorial, Identificacion, RepositorioConsulta, Consulta, ResponsableCapturado, UUID } from '../puertos-v1';

declare const uuid: UUID;
declare const reader: RepositorioConsulta;
const historical: Promise<Consulta | null> = reader.porVersion(uuid, 1);
const authorization: NonNullable<Consulta['autorizacion']> = {
  responsableId: uuid, versionVinculo: 1, autorizaba: true,
  identificacionHistorica: { tipo: 'DOCUMENTO_LEGADO', numero: 'LEG-001' },
  nombreHistorico: 'Responsable legado', fechaHora: '2026-10-25T12:00:00Z',
};
// @ts-expect-error Un documento histórico legado no se puede reutilizar como captura nueva.
const capturedIdentity: Identificacion = authorization.identificacionHistorica;
const capturedResponsible: CambioComun = {
  tipo: 'ALTA_RESPONSABLE', responsable: {
    id: uuid, version: 1, nombres: 'Ana', apellidos: 'Pérez', nombre: 'Ana Pérez', telefono: '55555555',
    documento: { tipo: 'CUI', numero: '1234567890123' },
  },
};
const legacyResponsible: ResponsableCapturado = {
  id: uuid, version: 1, nombres: 'Ana', apellidos: 'Pérez', nombre: 'Ana Pérez', telefono: '55555555',
  // @ts-expect-error La captura nueva sigue restringida a CUI/PASAPORTE.
  documento: { tipo: 'DOCUMENTO_LEGADO', numero: 'LEG-001' },
};
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
void historical; void authorization; void capturedIdentity; void capturedResponsible; void legacyResponsible;
void event; void missingVersion;
