import type {DependenciasClinicas} from '../consultas/atencion-clinica.js';
import {CambiarEstadoVersionLaboratorio} from './cambiar-estado-version.js';
export class CambiarEstadoMetodoLaboratorio extends CambiarEstadoVersionLaboratorio{
 constructor(deps:DependenciasClinicas){super(deps,'metodo');}
}
