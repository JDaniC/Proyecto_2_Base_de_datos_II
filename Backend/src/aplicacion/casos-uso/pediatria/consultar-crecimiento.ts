import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import { objetoCerrado } from '../../../dominio/clinica/consulta.js';
import { edadMesesEnFecha, indiceMasaCorporal } from '../../../dominio/pediatria/crecimiento.js';
import { normalizarInstante } from '../historiales/consultar-historial.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
export class ConsultarCrecimiento {
  async ejecutar(contexto:ContextoAutenticado,bundle:BundleInstitucional,id:string,entrada:unknown){
    validarPermiso(contexto.cuenta,'historial.leer');
    if(contexto.cuenta.institucion!=='CENTRO_MEDICO_PEDIATRICO'||bundle.institucion!==contexto.cuenta.institucion)throw new ErrorDominio('SIN_PERMISO','Ámbito incompatible.');
    const e=objetoCerrado(entrada,['limite','cursor','desde','hasta','orden']);
    const limite=e.limite===undefined?20:Number(e.limite),orden=e.orden??'ASC';
    if(!Number.isInteger(limite)||limite<1||limite>100||!['ASC','DESC'].includes(String(orden))||(e.cursor!==undefined&&(typeof e.cursor!=='string'||e.cursor.length>2048)))throw solicitudInvalida('Paginación inválida.');
    const desde=e.desde===undefined?undefined:normalizarInstante(String(e.desde)),hasta=e.hasta===undefined?undefined:normalizarInstante(String(e.hasta));
    if(desde&&hasta&&desde>=hasta)throw solicitudInvalida('Rango inválido.');
    const pid=uuidPublico(id);
    if(!bundle.pacientes||!bundle.clinica?.consultas.listarPorPaciente)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Crecimiento no disponible.');
    const paciente=await bundle.pacientes.porId(pid);
    if(!paciente)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
    const pagina=await bundle.clinica.consultas.listarPorPaciente(pid,{...(desde?{desde}:{}),...(hasta?{hasta}:{})},{limite,orden:orden as 'ASC'|'DESC',...(e.cursor?{cursor:e.cursor as string}:{})},JSON.stringify([contexto.cuenta.id,contexto.cuenta.version,[...contexto.cuenta.permisos].sort(),limite]));
    return {data:pagina.elementos.map(c=>{
      // Fecha de la clínica de Guatemala (UTC−06), sin convertir el nacimiento civil.
      const fecha=new Date(new Date(c.fecha_hora).getTime()-6*3600000).toISOString().slice(0,10);
      const peso=c.signos_vitales.peso_kg??null,talla=c.signos_vitales.talla_cm??null;
      return {consulta_id:c.id,version_consulta:c.version,fecha,fecha_hora:c.fecha_hora,profesional:c.profesional.nombre,edad_meses:paciente.fechaNacimiento?edadMesesEnFecha(paciente.fechaNacimiento,fecha):null,peso_kg:peso,talla_cm:talla,perimetro_cefalico_cm:c.signos_vitales.perimetro_cefalico_cm??null,imc:indiceMasaCorporal(peso,talla)};
    }),meta:{correlacion:contexto.correlacion,...(pagina.siguienteCursor?{siguiente_cursor:pagina.siguienteCursor}:{})}};
  }
}
