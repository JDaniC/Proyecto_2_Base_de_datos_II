import type {DependenciasClinicas} from '../consultas/atencion-clinica.js';
import {CambiarEstadoVersionLaboratorio} from './cambiar-estado-version.js';
export class CambiarEstadoPruebaLaboratorio extends CambiarEstadoVersionLaboratorio{
 constructor(deps:DependenciasClinicas){super(deps,'prueba');}
}
