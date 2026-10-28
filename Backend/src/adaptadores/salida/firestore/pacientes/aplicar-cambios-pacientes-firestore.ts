import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type {
  ArchivoRegistrado,
  Identificacion,
  Paciente,
  ResponsableDetalle,
} from '../../../../dominio/clinica/paciente.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { derivarClaveIdentificacion } from '../../../../dominio/compartido/normalizacion.js';
import { claveUnica, validarDocumento } from '../validador-firestore.js';
import { mapearADocumentoPacienteFirestore } from './mapear-paciente-firestore.js';

export async function aplicarCambiosPacientesFirestore(
  transaction: Transaction,
  firestore: Firestore,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  for (const cambio of cambios) {
    if (cambio.agregado === 'pacientes') {
      if (cambio.tipo === 'CREAR') {
        const paciente = cambio.nuevoEstado as Paciente;
        const docPaciente = mapearADocumentoPacienteFirestore(paciente);
        const rutaPaciente = `pacientes/${paciente.id}`;
        const docValidado = validarDocumento(rutaPaciente, docPaciente);
        transaction.create(firestore.doc(rutaPaciente), docValidado as Record<string, unknown>);

        if (paciente.responsables && paciente.responsables.length > 0) {
          for (const r of paciente.responsables) {
            const respId = r.responsable.id;
            const rutaVinculo = `pacientes/${paciente.id}/responsables/${respId}`;
            const docVinculo = {
              revision: 1,
              responsable_id: respId,
              parentesco: r.vinculo.parentesco,
              es_principal: r.vinculo.esPrincipal,
              autoriza_atencion: r.vinculo.autorizaAtencion,
              estado: 'ACTIVO' as const,
              fecha_registro: new Date(paciente.fechaRegistro),
              actor_id: contexto.cuenta.id,
            };
            const validadoVinculo = validarDocumento(rutaVinculo, docVinculo);
            transaction.create(firestore.doc(rutaVinculo), validadoVinculo as Record<string, unknown>);
          }
        }
      } else if (cambio.tipo === 'ACTUALIZAR' || cambio.tipo === 'MODIFICAR') {
        const paciente = cambio.nuevoEstado as Paciente;
        const docPaciente = mapearADocumentoPacienteFirestore(paciente);
        const rutaPaciente = `pacientes/${paciente.id}`;
        const docValidado = validarDocumento(rutaPaciente, docPaciente);
        transaction.set(firestore.doc(rutaPaciente), docValidado as Record<string, unknown>);
      }
    } else if (cambio.agregado === 'responsables') {
      if (cambio.tipo === 'CREAR') {
        const resp = cambio.nuevoEstado as ResponsableDetalle;
        const rutaResp = `responsables/${resp.id}`;
        const docResp = {
          revision: 1,
          identificacion: resp.documento ? `${resp.documento.tipo}:${resp.documento.numero}` : 'SIN_DOCUMENTO',
          tipo_documento: resp.documento ? resp.documento.tipo : 'OTRO',
          nombres: resp.nombres,
          apellidos: resp.apellidos,
          telefono: resp.telefono,
          fecha_registro: new Date(comando.instante),
        };
        const validadoResp = validarDocumento(rutaResp, docResp);
        transaction.create(firestore.doc(rutaResp), validadoResp as Record<string, unknown>);
      }
    } else if (cambio.agregado === 'identidades') {
      const estado = cambio.nuevoEstado as { identificacion: Identificacion; titularId?: UUID };
      const titularId = estado.titularId ?? (cambio.recursoId as UUID);
      const norm = derivarClaveIdentificacion(estado.identificacion.tipo, estado.identificacion.numero);
      const idx = norm.indexOf(':');
      const tipoNorm = idx > 0 ? norm.slice(0, idx) : estado.identificacion.tipo.trim().toUpperCase();
      const numeroNorm = idx > 0 ? norm.slice(idx + 1) : estado.identificacion.numero.trim();
      const clave = claveUnica(tipoNorm, numeroNorm);

      if (cambio.tipo === 'RESERVAR') {
        const esResponsable = cambios.some(
          (c) => c.agregado === 'responsables' && c.recursoId === titularId,
        );
        const coleccion = esResponsable ? 'identidades_responsable' : 'identidades_paciente';
        const ruta = `${coleccion}/${clave}`;
        const docIdentidad = {
          revision: 1,
          tipo_documento: tipoNorm,
          numero_documento: numeroNorm,
          recurso_id: titularId,
          fecha_registro: new Date(comando.instante),
        };
        const validado = validarDocumento(ruta, docIdentidad);
        transaction.create(firestore.doc(ruta), validado as Record<string, unknown>);
      } else if (cambio.tipo === 'LIBERAR') {
        transaction.delete(firestore.doc(`identidades_paciente/${clave}`));
        transaction.delete(firestore.doc(`identidades_responsable/${clave}`));
      }
    } else if (cambio.agregado === 'historiales' || cambio.agregado === 'historial') {
      if (cambio.tipo === 'MODIFICAR') {
        const archivo = cambio.nuevoEstado as ArchivoRegistrado;
        if (archivo && archivo.causa && archivo.motivo) {
          const yaEnPacientes = cambios.some(
            (c) => c.agregado === 'pacientes' && c.recursoId === cambio.recursoId,
          );
          if (!yaEnPacientes) {
            transaction.update(firestore.doc(`pacientes/${cambio.recursoId}`), {
              estado: 'ARCHIVADO',
              baja: {
                causa: archivo.causa,
                motivo: archivo.motivo,
                fecha: new Date(archivo.fecha),
                actor_id: archivo.actorId,
              },
            });
          }
        }
      }
    }
  }
}
