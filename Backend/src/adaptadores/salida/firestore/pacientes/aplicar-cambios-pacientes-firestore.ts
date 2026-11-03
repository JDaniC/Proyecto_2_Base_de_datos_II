import { validarSnapshotAntecedentes } from '../pediatria/antecedentes-firestore.js';
import type { AntecedentesPediatricos } from '../../../../aplicacion/puertos/pediatria.js';
import { validarEventoHistorial } from '../../historial/proyeccion-historial.js';
import { normalizarInstante } from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
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
    if(cambio.agregado === 'catalogoVacuna') {
      const {actual,version}=cambio.nuevoEstado as {actual:import('../../../../dominio/pediatria/vacunas.js').VacunaCatalogo;version:import('../../../../dominio/pediatria/vacunas.js').VersionEsquemaVacuna};
      const ref=firestore.doc(`vacunas/${actual.id}`);
      const raiz=validarDocumento(ref.path,{revision:version.version,nombre:actual.nombre,enfermedad_objetivo:actual.enfermedadObjetivo,fabricante:actual.fabricante,version_vigente:actual.versionVigente});
      if(cambio.tipo==='CREAR')transaction.create(ref,raiz as Record<string,unknown>);else transaction.set(ref,raiz as Record<string,unknown>);
      const ver=ref.collection('versiones').doc(version.versionId);
      transaction.create(ver,validarDocumento(ver.path,{revision:1,version:version.version,nombre:version.nombre,enfermedad_objetivo:version.enfermedadObjetivo,fabricante:version.fabricante,fecha_creacion:new Date(version.fechaCreacion),dosis:version.dosis.map(d=>({dosis_id:d.dosisId,numero:d.numero,edad_recomendada_meses:d.edadMesesRecomendada}))}) as Record<string,unknown>);
      continue;
    }
    if(cambio.agregado === 'esquemaVacuna') {
      const e=cambio.nuevoEstado as {vacunaId:string;versionId:string;actorId:string;fechaAsignacion:string};
      const ref=firestore.doc(`pacientes/${cambio.recursoId}/esquemas/${e.vacunaId}`);
      transaction.create(ref,validarDocumento(ref.path,{vacuna_id:e.vacunaId,version_id:e.versionId,actor_id:e.actorId,fecha_asignacion:new Date(e.fechaAsignacion),estado:'ACTIVO',revision:1}) as Record<string,unknown>);
      continue;
    }
    if (cambio.agregado === 'antecedentesPediatricos') {
      const r=cambio.nuevoEstado as {actual:AntecedentesPediatricos;anterior:AntecedentesPediatricos;revisionId:string;motivo:string};
      const actual=validarSnapshotAntecedentes(r.actual);
      if(actual.version!==r.anterior.version+1)throw new Error('VERSION_ANTECEDENTES_INCOMPATIBLE');
      const ref=firestore.doc(`pediatria_antecedentes/${cambio.recursoId}`);
      transaction.set(ref,actual as unknown as Record<string,unknown>);
      transaction.create(ref.collection('versiones').doc(r.revisionId),{version:r.anterior.version,anterior:r.anterior,actual,actorId:contexto.cuenta.id,fechaHora:comando.instante,motivo:r.motivo});
      continue;
    }
    if (cambio.agregado === 'responsableContacto') {
      const {actual:r,anterior}=cambio.nuevoEstado as {actual:ResponsableDetalle;anterior:ResponsableDetalle};
      const ref=firestore.doc(`responsables/${r.id}`);
      transaction.update(ref, {nombres:r.nombres,apellidos:r.apellidos,telefono:r.telefono,revision:r.version});
      transaction.create(ref.collection('historia_contacto').doc(comando.id),{anterior,actual:r,actorId:contexto.cuenta.id,fechaHora:comando.instante});
      continue;
    }
    if (cambio.agregado === 'vinculoPediatrico') {
      const r = cambio.nuevoEstado as {pacienteId:string;vinculo:{parentesco:string;esPrincipal:boolean;autorizaAtencion:boolean};estado:string;version:number};
      const ref=firestore.doc(`pacientes/${r.pacienteId}/responsables/${cambio.recursoId}`);
      const datos={parentesco:r.vinculo.parentesco,es_principal:r.vinculo.esPrincipal,autoriza_atencion:r.vinculo.autorizaAtencion,estado:r.estado,revision:r.version};
      if(cambio.tipo==='CREAR')transaction.create(ref,validarDocumento(ref.path,{...datos,responsable_id:cambio.recursoId,fecha_registro:new Date(comando.instante),actor_id:contexto.cuenta.id}) as Record<string,unknown>);
      else transaction.update(ref,datos);
      continue;
    }
    if (cambio.agregado === 'aplicacionVacuna') {
      if (cambio.tipo === 'CREAR') {
        const app = cambio.nuevoEstado as import('../../../../dominio/pediatria/vacunas.js').AplicacionVacuna;
        const ref = firestore.doc(`aplicaciones_vacuna/${app.id}`);
        const docData = validarDocumento(ref.path, {
          paciente_id: app.pacienteId,
          vacuna_id: app.vacunaId,
          dosis_id: app.dosisId,
          version_esquema_id: app.versionEsquemaId,
          pediatra_id: app.pediatraId,
          fecha_aplicacion: new Date(app.fechaAplicacion),
          lote: app.lote,
          sitio_aplicacion: app.sitioAplicacion,
          ...(app.observaciones ? {observaciones: app.observaciones} : {}),
          estado: app.estado,
          revision: app.version,
        });
        transaction.create(ref, docData as Record<string, unknown>);
      } else if (cambio.tipo === 'ACTUALIZAR') {
        const r = cambio.nuevoEstado as {
          actual: import('../../../../dominio/pediatria/vacunas.js').AplicacionVacuna;
          anterior: import('../../../../dominio/pediatria/vacunas.js').AplicacionVacuna;
          revisionId: string;
          motivo: string;
        };
        const ref = firestore.doc(`aplicaciones_vacuna/${r.actual.id}`);
        const updateData: Record<string, unknown> = {
          paciente_id: r.actual.pacienteId,
          vacuna_id: r.actual.vacunaId,
          dosis_id: r.actual.dosisId,
          version_esquema_id: r.actual.versionEsquemaId,
          pediatra_id: r.actual.pediatraId,
          fecha_aplicacion: new Date(r.actual.fechaAplicacion),
          lote: r.actual.lote,
          sitio_aplicacion: r.actual.sitioAplicacion,
          ...(r.actual.observaciones ? {observaciones:r.actual.observaciones} : {}),
          estado: r.actual.estado,
          ...(r.actual.motivoAnulacion ? {motivo_anulacion:r.actual.motivoAnulacion} : {}),
          revision: r.actual.version,
        };
        transaction.set(ref, validarDocumento(ref.path,updateData) as Record<string,unknown>);
        transaction.create(ref.collection('versiones').doc(r.revisionId), {
          version: r.anterior.version,
          actor_id: contexto.cuenta.id,
          fecha_hora: new Date(comando.instante),
          motivo: r.motivo,
          contenido_anterior: {
            ...r.anterior,
            lote: r.anterior.lote,
            sitio_aplicacion: r.anterior.sitioAplicacion,
            observaciones: r.anterior.observaciones ?? null,
            estado: r.anterior.estado,
            motivo_anulacion: r.anterior.motivoAnulacion ?? null,
          },
          revision: 1,
        });
      }
      continue;
    }
    if (cambio.agregado === 'eventosHistorial') {
      const {pacienteId, ...entrada} = cambio.nuevoEstado as Record<string, unknown>;
      const e = validarEventoHistorial(entrada, 'CENTRO_MEDICO_PEDIATRICO');
      transaction.create(firestore.doc(`historial_eventos/${e.id}`), {id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: normalizarInstante(e.fechaHora), contenido: e});
      continue;
    }
    if (cambio.agregado === 'estadoHistorial') {
      const actual = cambio.nuevoEstado as Paciente;
      if (!['historial.archivar', 'historial.reactivar'].includes(comando.caso) || actual.version !== Number(cambio.versionAnterior) + 1 || !actual.baja) throw new Error('PLAN_HISTORIAL_INCOMPATIBLE');
      transaction.update(firestore.doc(`pacientes/${actual.id}`), {estado: actual.estado, revision: actual.version,
        baja: {causa: actual.baja.causa, motivo: actual.baja.motivo, fecha: new Date(actual.baja.fecha), actor_id: actual.baja.actorId}});
      continue;
    }

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
