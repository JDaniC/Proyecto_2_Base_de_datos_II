import { objetoCerrado, textoClinico } from '../clinica/consulta.js';
import { solicitudInvalida } from '../compartido/error-dominio.js';

export interface Perinatales {
  readonly edadGestacionalSemanas?: number;
  readonly pesoNacimientoGramos?: number;
  readonly tallaNacimientoCm?: number;
  readonly apgar1Minuto?: number;
  readonly apgar5Minutos?: number;
  readonly tipoParto?: 'PARTO_VAGINAL' | 'CESAREA' | 'PARTO_INSTRUMENTADO';
  readonly lactanciaMaternaExclusivaMeses?: number;
  readonly complicacionesPerinatales?: string;
}

/** Validación de datos capturados, sin interpretación clínica automática. */
export function validarPerinatales(entrada: unknown): Perinatales {
  const rangos = {
    edadGestacionalSemanas: [1, 45, false], pesoNacimientoGramos: [1, 10000, true],
    tallaNacimientoCm: [1, 100, false], apgar1Minuto: [0, 10, true],
    apgar5Minutos: [0, 10, true], lactanciaMaternaExclusivaMeses: [0, 120, false],
  } as const;
  const e=objetoCerrado(entrada,[...Object.keys(rangos),'tipoParto','complicacionesPerinatales']);
  for(const [campo,[min,max,entero]] of Object.entries(rangos)) {
    const valor=e[campo];
    if(valor===undefined)continue;
    if(typeof valor!=='number'||!Number.isFinite(valor)||valor<min||valor>max||(entero&&!Number.isInteger(valor))) {
      throw solicitudInvalida('Dato perinatal fuera del rango admitido.',campo);
    }
  }
  if(e.tipoParto!==undefined&&!['PARTO_VAGINAL','CESAREA','PARTO_INSTRUMENTADO'].includes(String(e.tipoParto)))throw solicitudInvalida('Tipo de parto no admitido.','tipoParto');
  if(e.complicacionesPerinatales!==undefined)textoClinico(e.complicacionesPerinatales,'complicacionesPerinatales',4000,true);
  return {...e} as Perinatales;
}

export function validarAlergia(entrada: unknown) {
  const e=objetoCerrado(entrada,['sustancia','severidad','reaccion']);
  if(!['LEVE','MODERADA','SEVERA'].includes(String(e.severidad)))throw solicitudInvalida('Severidad no admitida.','severidad');
  return {sustancia:textoClinico(e.sustancia,'sustancia',200).trim(),severidad:e.severidad as 'LEVE'|'MODERADA'|'SEVERA',reaccion:textoClinico(e.reaccion,'reaccion',4000).trim()};
}
