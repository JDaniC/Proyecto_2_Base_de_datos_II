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

test('mantiene un principal por menor y expresa las variantes sin contradecir la semilla base', () => {
  const autorizado = porId(contextos.vinculos, 'vinculo-pediatria-principal-autorizado');
  const secundario = porId(contextos.vinculos, 'vinculo-pediatria-secundario-sin-autorizacion');
  assert.equal(autorizado.es_principal, true);
  assert.equal(autorizado.autoriza_atencion, true);
  assert.equal(secundario.es_principal, false);
  assert.equal(secundario.autoriza_atencion, false);

  for (const paciente of contextos.pacientes.filter(({ institucion }) => institucion === 'CENTRO_MEDICO_PEDIATRICO')) {
    const vinculosActivos = contextos.vinculos.filter((vinculo) =>
      vinculo.paciente_id === paciente.id && vinculo.estado === 'ACTIVO',
    );
    assert.equal(vinculosActivos.filter(({ es_principal }) => es_principal).length, 1);
  }

  const noAutoriza = porId(contextos.variantes_vinculo, 'pediatria-principal-sin-autorizacion');
  assert.equal(noAutoriza.sobrescribir_vinculo_id, autorizado.id);
  assert.deepEqual(noAutoriza.cambios, { autoriza_atencion: false });
  assert.equal(autorizado.autoriza_atencion, true, 'el overlay no muta la semilla compartida');

  const variosPrincipales = porId(contextos.variantes_vinculo, 'overlay-varios-principales');
  assert.equal(variosPrincipales.sobrescribir_vinculo_id, secundario.id);
  assert.equal(variosPrincipales.cambios.es_principal, true);

  const responsables = new Set(contextos.responsables.map(({ id }) => id));
  for (const vinculo of contextos.vinculos) {
    assert.ok(responsables.has(vinculo.responsable_id));
    assert.ok(contextos.pacientes.some(({ id }) => id === vinculo.paciente_id));
  }

  const compartido = porId(contextos.escenarios, 'pediatria-responsable-compartido');
  assert.equal(compartido.autorizaciones_independientes, true);
  assert.ok(contextos.vinculos.filter(({ responsable_id }) => responsable_id === compartido.responsable_id).length >= 2);
});

test('incluye cuentas inactivas, citas de frontera y catálogo inactivo como semillas separadas', () => {
  const cuentasInactivas = porId(contextos.escenarios, 'cuenta-inactiva-por-institucion').cuentas_uids;
  assert.equal(cuentasInactivas.length, 4);
  for (const uid of cuentasInactivas) {
    assert.equal(contextos.cuentas.find((cuenta) => cuenta.uid === uid)?.estado, 'INACTIVA');
  }
  assert.equal(porId(contextos.citas, '00000000-0000-4000-8000-000000000504').estado, 'CANCELADA');
  assert.equal(porId(contextos.citas, '00000000-0000-4000-8000-000000000505').estado, 'ATENDIDA');
  assert.equal(porId(contextos.catalogos_sinteticos, 'catalogo-prueba-inactivo').activo, false);

  const archivado = contextos.pacientes.find(({ estado }) => estado === 'ARCHIVADO');
  assert.ok(archivado);
  assert.equal(archivado.proceso_previo.permite_finalizar, true);
  assert.equal(porId(contextos.escenarios, 'archivado-proceso-previo-vs-nueva-atencion').nueva_atencion, 'RECHAZAR');
});

test('los escenarios parametrizados resuelven paciente y permisos vigentes en cada institución', () => {
  const instituciones = contextos.bundles_prueba.map(({ institucion }) => institucion);
  const paciente = porId(contextos.escenarios, 'paciente-identificado');
  const archivado = porId(contextos.escenarios, 'archivado-proceso-previo-vs-nueva-atencion');
  const permisoRetirado = porId(contextos.escenarios, 'cuenta-activa-permiso-retirado');
  const roles = porId(contextos.escenarios, 'cuentas-secretaria-y-analista');

  for (const institucion of instituciones) {
    const identificado = contextos.pacientes.find(({ id }) => id === paciente.pacientes_por_institucion[institucion]);
    const archivadoPorInstitucion = contextos.pacientes.find(({ id }) => id === archivado.pacientes_por_institucion[institucion]);
    const variante = contextos.variantes_cuenta.find(({ id }) =>
      id === permisoRetirado.variantes_por_institucion[institucion].variante_cuenta_id,
    );
    const cuenta = contextos.cuentas.find(({ uid }) => uid === roles.cuentas_oficina_por_institucion[institucion]);

    assert.equal(identificado.institucion, institucion);
    assert.ok(identificado.identificacion);
    assert.equal(archivadoPorInstitucion.institucion, institucion);
    assert.equal(archivadoPorInstitucion.estado, 'ARCHIVADO');
    assert.equal(variante.cuenta_uid, permisoRetirado.variantes_por_institucion[institucion].actor_uid);
    assert.ok(variante.quitar_permisos.includes(permisoRetirado.variantes_por_institucion[institucion].permiso_retirado));
    assert.equal(cuenta.institucion, institucion);
    assert.equal(cuenta.estado, 'ACTIVA');
    assert.ok(cuenta.roles.includes('SECRETARIA'));
  }

  assert.equal(contextos.cuentas.find(({ uid }) => uid === roles.analista_lab_uid).institucion, 'LABORATORIO_CLINICO');
  assert.equal(contextos.cuentas.find(({ uid }) => uid === roles.validador_lab_uid).institucion, 'LABORATORIO_CLINICO');
});
