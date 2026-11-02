import {Button} from '../../../design-system/components/Button';
export function HospitalPageControls({etiqueta,pagina,hayMas,pendiente,onPagina}:{etiqueta:string;pagina:number;hayMas:boolean;pendiente:boolean;onPagina:(pagina:number)=>void}){
  return <nav aria-label={`Páginas de ${etiqueta}`} style={{display:'flex',alignItems:'center',gap:12}}>
    <Button disabled={pendiente||pagina===1} onClick={()=>onPagina(pagina-1)}>Anterior</Button>
    <span>{etiqueta} · página {pagina}</span>
    <Button disabled={pendiente||!hayMas} onClick={()=>onPagina(pagina+1)}>Siguiente</Button>
  </nav>;
}
