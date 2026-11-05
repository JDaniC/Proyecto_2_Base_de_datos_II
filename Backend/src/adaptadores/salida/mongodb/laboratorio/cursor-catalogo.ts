import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {ErrorDominio,solicitudInvalida} from '../../../../dominio/compartido/error-dominio.js';
/** Cursor de clave UUID para catálogos sin fecha de negocio; ámbito autenticado con AES-GCM. */
export class CursorCatalogoLaboratorio{
 constructor(private readonly secreto:()=>string|undefined=()=>process.env.CURSOR_SIGNING_SECRET){}
 private clave(){const s=this.secreto()?.trim();if(!s||s.length<32)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Configuración de cursores no disponible.');return createHash('sha256').update(s).digest();}
 codificar(ambito:string,id:string):string{
  const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.clave(),iv);c.setAAD(Buffer.from(ambito));
  const datos=Buffer.concat([c.update(uuidPublico(id),'utf8'),c.final()]);
  return Buffer.concat([Buffer.from([1]),iv,c.getAuthTag(),datos]).toString('base64url');
 }
 decodificar(cursor:string,ambito:string):string{
  const clave=this.clave();
  try{
   if(typeof cursor!=='string'||cursor.length>2048||!/^[-\w]+$/.test(cursor))throw new Error();
   const raw=Buffer.from(cursor,'base64url');if(raw.toString('base64url')!==cursor||raw.length!==65||raw[0]!==1)throw new Error();
   const c=createDecipheriv('aes-256-gcm',clave,raw.subarray(1,13));c.setAAD(Buffer.from(ambito));c.setAuthTag(raw.subarray(13,29));
   return uuidPublico(Buffer.concat([c.update(raw.subarray(29)),c.final()]).toString('utf8'));
  }catch{throw solicitudInvalida('El cursor no corresponde al catálogo solicitado.','cursor');}
 }
}
