import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { VacunaCatalogo, DosisVacuna } from '../../../dominio/pediatria/vacunas.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import { contextoVigente, type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';

export class GestionarCatalogoVacunas {
  constructor(private readonly deps:DependenciasClinicas){}
  async ejecutar(p:ParametrosClinicos){
    if(p.contexto.cuenta.institucion!=='CENTRO_MEDICO_PEDIATRICO'||p.bundle.institucion!=='CENTRO_MEDICO_PEDIATRICO')throw new ErrorDominio('SIN_PERMISO','Operación exclusiva de pediatría.');
    validarPermiso(p.contexto.cuenta,'usuarios.administrar');
    const e=objetoCerrado(p.entrada,['nombre','enfermedadObjetivo','fabricante','dosis',...(p.id?['versionEsquemaAnterior']:[])]);
    const nombre=textoClinico(e.nombre,'nombre',200),enfermedadObjetivo=textoClinico(e.enfermedadObjetivo,'enfermedadObjetivo',200),fabricante=textoClinico(e.fabricante,'fabricante',200);
    if(!Array.isArray(e.dosis)||e.dosis.length<1||e.dosis.length>100)throw solicitudInvalida('El esquema requiere entre 1 y 100 dosis.');
    const dosis:DosisVacuna[]=e.dosis.map((d:unknown)=>{
      const x=objetoCerrado(d,['dosisId','numero','edadMesesRecomendada']);
      const dosisId=uuidPublico(x.dosisId,'dosisId');
      if(typeof x.numero!=='number'||!Number.isSafeInteger(x.numero)||x.numero<1||typeof x.edadMesesRecomendada!=='number'||!Number.isSafeInteger(x.edadMesesRecomendada)||x.edadMesesRecomendada<0||x.edadMesesRecomendada>2400)throw solicitudInvalida('Número de dosis o edad recomendada inválidos.');
      return {dosisId,numero:x.numero,edadMesesRecomendada:x.edadMesesRecomendada};
    });
    if(new Set(dosis.map(d=>d.dosisId)).size!==dosis.length||new Set(dosis.map(d=>d.numero)).size!==dosis.length)throw solicitudInvalida('Los identificadores y números de dosis deben ser únicos.');
    const versionEsquemaAnterior=p.id?uuidPublico(e.versionEsquemaAnterior):null;
    const comando=await prepararComandoEstable(p.claveIdempotencia,'pediatria.vacunas.catalogo',{id:p.id??null,nombre,enfermedadObjetivo,fabricante,dosis,versionEsquemaAnterior},['vacuna','esquema','auditoria'],this.deps);
    const vacunaId=p.id??comando.ids.vacuna!;
    if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
    return p.bundle.uow.ejecutar<VacunaCatalogo>(p.contexto,comando,async lector=>{
      const contexto=await contextoVigente(lector,p.contexto);validarPermiso(contexto.cuenta,'usuarios.administrar');
      if(!contexto.cuenta.roles.includes('ADMIN_INSTITUCIONAL'))throw new ErrorDominio('SIN_PERMISO','Se requiere administración institucional.');
      const previa=await lector.operaciones.porClave<VacunaCatalogo>(contexto.cuenta.id,comando.caso,comando.claveIdempotencia);
      if(previa){if(previa.hashEntrada!==comando.hashEntrada)throw new ErrorDominio('CLAVE_REUTILIZADA','La clave corresponde a otra intención.');return {tipo:'REPETIR',operacion:previa};}
      if(!lector.vacunasPediatricas)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Vacunas no disponibles.');
      const anterior=p.id?(await lector.vacunasPediatricas.obtenerCatalogo()).find(v=>v.id===p.id):undefined;
      if(p.id&&!anterior)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Vacuna no encontrada.');
      if(anterior&&anterior.versionVigente!==versionEsquemaAnterior)throw new ErrorDominio('VERSION_DESACTUALIZADA','El esquema cambió; recargue antes de publicar otra versión.');
      const anteriorVersion=anterior?await lector.vacunasPediatricas.obtenerVersionEsquema(uuidPublico(anterior.id),uuidPublico(anterior.versionVigente)):null;
      if(anterior&&!anteriorVersion)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Versión anterior no disponible.');
      // Un número conservado identifica la misma dosis lógica: no permitir cambiar silenciosamente su ID.
      if(anteriorVersion&&dosis.some(d=>anteriorVersion.dosis.some(a=>a.numero===d.numero&&a.dosisId!==d.dosisId)))throw solicitudInvalida('Conserve el identificador estable de las dosis existentes.');
      const actual:VacunaCatalogo={id:vacunaId,nombre,enfermedadObjetivo,fabricante,versionVigente:comando.ids.esquema!,dosis};
      const version={versionId:comando.ids.esquema!,version:(anteriorVersion?.version??0)+1,nombre,enfermedadObjetivo,fabricante,fechaCreacion:comando.instante,dosis};
      return {tipo:'CONFIRMAR',cambios:[{agregado:'catalogoVacuna',tipo:anterior?'ACTUALIZAR':'CREAR',recursoId:vacunaId,versionAnterior:anteriorVersion?versionPositiva(anteriorVersion.version):null,nuevoEstado:{actual,version}}],revisiones:[],auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:vacunaId,fechaHora:comando.instante,correlacion:contexto.correlacion}],resultado:{httpStatus:201,respuesta:actual,correlacionOriginal:contexto.correlacion}};
    });
  }
}
