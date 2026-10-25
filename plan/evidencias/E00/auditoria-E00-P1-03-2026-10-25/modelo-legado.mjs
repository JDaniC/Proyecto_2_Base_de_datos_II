// Solo validación en memoria. No inicializa un cliente ni conecta a Firestore.
import { validarDocumento } from '../../../../Database/firebase/modelo_pediatrico.mjs';

const paciente = {
  revision: 1,
  nombres: 'A'.repeat(40) + ' ' + 'B'.repeat(40),
  apellidos: 'Sintético',
  nombre_busqueda: 'sintetico',
  fecha_nacimiento: '2015-01-01',
  estado: 'ACTIVO',
  fecha_apertura: new Date('2026-10-25T00:00:00Z'),
};
const resultado = validarDocumento('pacientes/00000000-0000-4000-8000-000000000001', paciente);
console.log(JSON.stringify({
  tipo: 'VALIDADOR_FIRESTORE_OFFLINE_SIN_EMULADOR',
  longitud_nombres: resultado.nombres.length,
  resultado: 'ACEPTADO_POR_MODELO_ACTUAL',
}));
