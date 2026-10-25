import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtureUrl = new URL('../fixtures/contextos-aceptacion-v1.json', import.meta.url);
const contextos = JSON.parse(await readFile(fixtureUrl, 'utf8'));

const porId = (lista, id) => lista.find((elemento) => elemento.id === id);

function clavesRecursivas(valor, salida = []) {
  if (Array.isArray(valor)) {
    for (const item of valor) clavesRecursivas(item, salida);
  } else if (valor && typeof valor === 'object') {
    for (const [clave, item] of Object.entries(valor)) {
      salida.push(clave);
      clavesRecursivas(item, salida);
    }
  }
  return salida;
}

test('fixtures de aceptación son sintéticos y no contienen campos de credenciales', () => {
  assert.equal(contextos.sintetico, true);
  assert.match(contextos.nota, /No son DTO HTTP/);
  const clavesDeRiesgo = clavesRecursivas(contextos).filter((clave) =>
    /(password|passwd|secret|credential|api[_-]?key|private[_-]?key|token)/i.test(clave),
  );
  assert.deepEqual(clavesDeRiesgo, []);
});

test('registra los cuatro bundles canónicos y sus motores solo como configuración de prueba', () => {
  assert.deepEqual(contextos.bundles_prueba, [
    { id: 'bundle-hospital', institucion: 'HOSPITAL_GENERAL', motor: 'postgresql' },
    { id: 'bundle-odontologia', institucion: 'CLINICA_ODONTOLOGICA', motor: 'mysql' },
    { id: 'bundle-laboratorio', institucion: 'LABORATORIO_CLINICO', motor: 'mongodb' },
    { id: 'bundle-pediatria', institucion: 'CENTRO_MEDICO_PEDIATRICO', motor: 'firestore' },
  ]);
  assert.equal(new Set(contextos.bundles_prueba.map(({ id }) => id)).size, 4);
  assert.equal(new Set(contextos.bundles_prueba.map(({ institucion }) => institucion)).size, 4);
});

test('cuentas y profesionales fixture concuerdan por uid, institución y rol', () => {
  for (const profesional of contextos.profesionales) {
    const cuenta = contextos.cuentas.find(({ uid }) => uid === profesional.uid);
    assert.ok(cuenta, `falta cuenta de ${profesional.id}`);
    assert.equal(cuenta.estado, 'ACTIVA');
    assert.equal(cuenta.institucion, profesional.institucion);
    assert.ok(cuenta.roles.includes(profesional.rol));
    assert.equal(cuenta.profesional_id, profesional.id);
    assert.equal(profesional.activo, true);
  }
});

test('incluye paciente con y sin identificación, y conserva límites institucionales de agenda', () => {
  const identificado = porId(contextos.pacientes, '00000000-0000-4000-8000-000000000301');
  const sinDocumento = porId(contextos.pacientes, '00000000-0000-4000-8000-000000000302');
  assert.ok(identificado.identificacion);
  assert.equal(Object.hasOwn(sinDocumento, 'identificacion'), false);

  const citaDental = porId(contextos.citas, '00000000-0000-4000-8000-000000000502');
  const escenarioDental = porId(contextos.escenarios, 'odontologia-cita-obligatoria');
  assert.equal(escenarioDental.cita_id, citaDental.id);
  assert.equal(citaDental.institucion, 'CLINICA_ODONTOLOGICA');

  const escenarioLab = porId(contextos.escenarios, 'laboratorio-clinica-sin-agenda');
  assert.equal(escenarioLab.agenda_visible, false);
  assert.equal(escenarioLab.cita_id, null);
  assert.equal(contextos.citas.some(({ institucion }) => institucion === 'LABORATORIO_CLINICO'), false);
});

test('mantiene separadas relación principal y autorización pediátrica, e incluye archivo con proceso previo', () => {
  const autorizado = porId(contextos.vinculos, 'vinculo-pediatria-principal-autorizado');
  const noAutorizado = porId(contextos.vinculos, 'vinculo-pediatria-principal-sin-autorizacion');
  assert.equal(autorizado.es_principal, true);
  assert.equal(autorizado.autoriza_atencion, true);
  assert.equal(noAutorizado.es_principal, true);
  assert.equal(noAutorizado.autoriza_atencion, false);
  assert.notEqual(autorizado.responsable_id, noAutorizado.responsable_id);

  const archivado = contextos.pacientes.find(({ estado }) => estado === 'ARCHIVADO');
  assert.ok(archivado);
  assert.equal(archivado.proceso_previo.permite_finalizar, true);
  assert.equal(porId(contextos.escenarios, 'archivado-proceso-previo-vs-nueva-atencion').nueva_atencion, 'RECHAZAR');
});
