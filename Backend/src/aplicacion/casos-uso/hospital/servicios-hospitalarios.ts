import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { fechaCivil } from '../../../dominio/compartido/fecha-civil.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { AccionServicioHospital, TipoServicioHospital, FiltroServiciosHospital } from '../../puertos/servicios-hospitalarios.js';

const CAMPOS: Record<AccionServicioHospital, readonly string[]> = {
  ordenCrear: ['consultaId','versionConsulta','versionPaciente','pruebasIds','prioridad','motivoClinico','diagnosticoPresuntivoCIE10'],
  ordenCancelar: ['versionEsperada','motivo'],
  resultadoRegistrar: ['versionEsperada','pruebaId','parametros','interpretacionClinica','observacionesTecnicas','motivoCorreccion','versionResultado'],
  polizaAfiliar: ['versionPaciente','aseguradoraId','planId','numeroPoliza','numeroCertificado','vigenciaDesde','vigenciaHasta','titular','copagoCentavos','observaciones'],
  polizaEstado: ['versionEsperada','estado','motivo'],
  procedimientoRegistrar: ['consultaId','versionConsulta','versionPaciente','procedimientoId','resultado','observaciones'],
};
function texto(o: Record<string, unknown>, k: string, max: number, opcional = false) {
  if (opcional && o[k] === undefined) return;
  textoClinico(o[k], k, max);
}
function enumerado(o: Record<string, unknown>, k: string, valores: readonly string[]) {
  if (typeof o[k] !== 'string' || !valores.includes(o[k])) throw new ErrorDominio('SOLICITUD_INVALIDA', `Valor inválido en ${k}.`);
}
export class ServiciosHospitalarios {
  private puerto(contexto: ContextoAutenticado, bundle: BundleInstitucional, administrativo = false, escritura = false) {
    if (contexto.cuenta.institucion !== 'HOSPITAL_GENERAL' || bundle.institucion !== 'HOSPITAL_GENERAL') throw new ErrorDominio('SIN_PERMISO', 'Capacidad exclusiva del hospital.');
    const permisos = contexto.cuenta.permisos;
    if (administrativo ? !(permisos.includes('pacientes.administrar') || (!escritura && permisos.includes('historial.leer'))) :
      !(permisos.includes('historial.leer') && (!escritura || permisos.includes('consultas.registrar')))) throw new ErrorDominio('SIN_PERMISO', 'No dispone del permiso institucional requerido.');
    if (escritura && !administrativo && !contexto.cuenta.profesional?.activo) throw new ErrorDominio('SIN_PERMISO', 'Se requiere médico activo.');
    if (!bundle.serviciosHospital) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Extensión hospitalaria no preparada.');
    return bundle.serviciosHospital;
  }
  catalogos(contexto: ContextoAutenticado, bundle: BundleInstitucional) { return this.puerto(contexto,bundle,true).catalogos(); }
  listar(contexto: ContextoAutenticado, bundle: BundleInstitucional, tipo: TipoServicioHospital, filtro: { pacienteId?: string; ordenId?: string; estado?: string; pagina?: number; limite?: number }) {
    const puerto = this.puerto(contexto,bundle,tipo==='poliza');
    const pagina = filtro.pagina ?? 1, limite = filtro.limite ?? 25;
    if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 40000 || !Number.isSafeInteger(limite) || limite < 1 || limite > 100) throw new ErrorDominio('SOLICITUD_INVALIDA','Página inválida.');
    if (filtro.estado !== undefined && !['SOLICITADA','EN_PROCESO','COMPLETADA','CANCELADA','ACTIVA','VENCIDA','SUSPENDIDA'].includes(filtro.estado)) throw new ErrorDominio('SOLICITUD_INVALIDA','Estado inválido.');
    const f: FiltroServiciosHospital = { pagina, limite, ...(filtro.pacienteId ? {pacienteId:uuidPublico(filtro.pacienteId)} : {}), ...(filtro.ordenId ? {ordenId:uuidPublico(filtro.ordenId)} : {}), ...(filtro.estado ? {estado:filtro.estado} : {}) };
    return puerto.listar(tipo,f);
  }
  async porId(contexto: ContextoAutenticado, bundle: BundleInstitucional, tipo: TipoServicioHospital, id: string, pacienteId?: string) {
    const valor = await this.puerto(contexto,bundle,tipo==='poliza').porId(tipo,uuidPublico(id),pacienteId ? uuidPublico(pacienteId) : undefined);
    if (!valor) throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Recurso no encontrado.');
    return valor;
  }
  ejecutar(contexto: ContextoAutenticado, bundle: BundleInstitucional, accion: AccionServicioHospital, pacienteId: string, recursoId: string | undefined, entrada: unknown, clave: unknown) {
    const puerto = this.puerto(contexto,bundle,accion.startsWith('poliza'),true);
    const e = objetoCerrado(entrada,CAMPOS[accion]);
    if (['ordenCrear','polizaAfiliar','procedimientoRegistrar'].includes(accion)) versionPositiva(e.versionPaciente);
    else versionPositiva(e.versionEsperada);
    if (accion==='ordenCrear' || accion==='procedimientoRegistrar') { uuidPublico(e.consultaId); versionPositiva(e.versionConsulta); }
    switch (accion) {
      case 'ordenCrear':
        enumerado(e,'prioridad',['RUTINA','URGENTE','STAT']); texto(e,'motivoClinico',2000); texto(e,'diagnosticoPresuntivoCIE10',20,true);
        if (!Array.isArray(e.pruebasIds) || e.pruebasIds.length < 1 || e.pruebasIds.length > 100 || new Set(e.pruebasIds).size !== e.pruebasIds.length) throw new ErrorDominio('SOLICITUD_INVALIDA','Seleccione de 1 a 100 exámenes distintos.');
        e.pruebasIds.forEach(id => uuidPublico(id)); break;
      case 'ordenCancelar': texto(e,'motivo',1000); break;
      case 'resultadoRegistrar':
        uuidPublico(e.pruebaId); texto(e,'interpretacionClinica',10000); texto(e,'observacionesTecnicas',2000,true); texto(e,'motivoCorreccion',1000,true);
        if (e.versionResultado !== undefined) versionPositiva(e.versionResultado);
        if (!Array.isArray(e.parametros) || !e.parametros.length || e.parametros.length>100) throw new ErrorDominio('SOLICITUD_INVALIDA','Parámetros inválidos.');
        for (const p of e.parametros) { const v=objetoCerrado(p,['parametroId','valorMedido','alerta']); uuidPublico(v.parametroId); texto(v,'valorMedido',1000); enumerado(v,'alerta',['NORMAL','ELEVADO','DISMINUIDO','CRITICO']); } break;
      case 'polizaAfiliar': {
        uuidPublico(e.aseguradoraId); uuidPublico(e.planId); texto(e,'numeroPoliza',80); texto(e,'numeroCertificado',80); texto(e,'observaciones',2000,true);
        const desde=fechaCivil(e.vigenciaDesde), hasta=fechaCivil(e.vigenciaHasta);
        if (desde>hasta) throw new ErrorDominio('SOLICITUD_INVALIDA','Vigencia inválida.');
        if (!Number.isSafeInteger(e.copagoCentavos) || Number(e.copagoCentavos)<0 || Number(e.copagoCentavos)>100000000) throw new ErrorDominio('SOLICITUD_INVALIDA','Dinero debe expresarse en centavos enteros GTQ.');
        const t=objetoCerrado(e.titular,['nombres','apellidos','numeroIdentificacion','telefonoContacto','parentesco']); texto(t,'nombres',80); texto(t,'apellidos',80); texto(t,'numeroIdentificacion',20); texto(t,'telefonoContacto',30); if(typeof t.numeroIdentificacion!=='string'||!/^\d{13}$/.test(t.numeroIdentificacion)) throw new ErrorDominio('SOLICITUD_INVALIDA','El CUI del titular debe contener 13 dígitos.'); enumerado(t,'parentesco',['TITULAR','PADRE','MADRE','CONYUGE','HIJO','OTRO']); break;
      }
      case 'polizaEstado': enumerado(e,'estado',['ACTIVA','VENCIDA','SUSPENDIDA']); texto(e,'motivo',1000); break;
      case 'procedimientoRegistrar': uuidPublico(e.procedimientoId); texto(e,'resultado',10000); texto(e,'observaciones',2000,true); break;
    }
    return puerto.ejecutar(contexto,{accion,pacienteId:uuidPublico(pacienteId),...(recursoId ? {recursoId:uuidPublico(recursoId)} : {}),datos:e,clave:uuidPublico(clave,'Idempotency-Key')});
  }
}
