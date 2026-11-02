import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { validarPermiso, validarPrescriptorClinico } from '../../../dominio/clinica/politicas-institucionales.js';
import { validarAsignacionEsquema } from '../../../dominio/pediatria/vacunas.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import { contextoVigente, type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';
export class AsignarEsquemaVacuna {
  constructor(private readonly deps: DependenciasClinicas) {}
  async ejecutar(p: ParametrosClinicos) {
    if(p.contexto.cuenta.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || p.bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') throw new ErrorDominio('SIN_PERMISO','Operación exclusiva de pediatría.');
    validarPermiso(p.contexto.cuenta,'consultas.registrar');
    const pid=uuidPublico(p.id), entrada=validarAsignacionEsquema(p.entrada);
    const comando=await prepararComandoEstable(p.claveIdempotencia,'pediatria.vacunas.asignar',{pid,entrada},['auditoria','revision'],this.deps);
    if(!p.bundle.uow) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
    return p.bundle.uow.ejecutar(p.contexto,comando,async lector=>{
      const contexto=await contextoVigente(lector,p.contexto);validarPermiso(contexto.cuenta,'consultas.registrar');
      const previa=await lector.operaciones.porClave(contexto.cuenta.id,comando.caso,comando.claveIdempotencia);
      if(previa){if(previa.hashEntrada!==comando.hashEntrada)throw new ErrorDominio('CLAVE_REUTILIZADA','La clave corresponde a otra intención.');return {tipo:'REPETIR',operacion:previa};}
      const paciente=await lector.pacientes.porId(pid) as {estado:string}|null;
      if(!paciente)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
      if(paciente.estado!=='ACTIVO')throw new ErrorDominio('ESTADO_INVALIDO','Paciente archivado.');
      if(!lector.vacunasPediatricas)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Vacunas no disponibles.');
      if(!lector.clinica||!contexto.cuenta.profesional)throw new ErrorDominio('SIN_PERMISO','Se requiere profesional activo.');
      const profesional=await lector.clinica.profesionales.porId(contexto.cuenta.profesional.id);
      if(!profesional)throw new ErrorDominio('SIN_PERMISO','Profesional no encontrado.');
      validarPrescriptorClinico({...contexto.cuenta,profesionalVinculado:contexto.cuenta.profesional},profesional);
      const version=await lector.vacunasPediatricas.obtenerVersionEsquema(entrada.vacunaId,entrada.versionId);
      if(!version)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Versión no encontrada.');
      const anterior=(await lector.vacunasPediatricas.obtenerEsquemas(pid)).find(e=>e.vacunaId===entrada.vacunaId);
      if(anterior)throw new ErrorDominio('ESTADO_INVALIDO','El esquema ya está asignado; se preserva su versión.');
      const actual={...entrada,actorId:contexto.cuenta.id,fechaAsignacion:comando.instante,estado:'ACTIVO'};
      return {tipo:'CONFIRMAR',cambios:[{agregado:'esquemaVacuna',tipo:'CREAR',recursoId:pid,versionAnterior:null,nuevoEstado:actual}],revisiones:[],auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:pid,fechaHora:comando.instante,correlacion:contexto.correlacion}],resultado:{httpStatus:201,respuesta:actual,correlacionOriginal:contexto.correlacion}};
    });
  }
}
