import {useRef,useState} from 'react';
/** Conserva la intención enviada cuando el resultado del transporte es incierto. */
export function useConfirmedCommand<T>(){
  const original=useRef<T|null>(null),[incierto,setIncierto]=useState(false);
  return {incierto,
    preparar:(dto:T)=>{if(incierto&&original.current)return original.current;original.current=dto;return dto;},
    error:(error:unknown)=>{const e=error as {status?:number;esReintentable?:boolean};const pendiente=e?.esReintentable===true||e?.status===0||e?.status===503||e?.status===504;setIncierto(pendiente);if(!pendiente)original.current=null;},
    limpiar:()=>{original.current=null;setIncierto(false);},
  };
}
