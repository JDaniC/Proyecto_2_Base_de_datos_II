import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function recorrerPacientes({ browser, url, cuentas, reiniciarBackend, sembrarEventos }) {
  const resultados = [];
  const paso = (caso, institucion) => { resultados.push({ caso, institucion, resultado: 'PASS' }); console.log(`PASS ${institucion}: ${caso}`); };
  async function login(page, cuenta) {
    await page.goto(`${url}/acceso`);
    await page.getByLabel(/Correo institucional/).fill(cuenta.email);
    await page.getByLabel(/Contraseña/).fill(cuenta.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL(/\/(panel|sesion-activa)$/);
  }
  const pacientes = [];
  for (const [i, cuenta] of cuentas.filter((c) => !c.secretaria).entries()) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Guatemala' });
    const page = await context.newPage();
    try {
      await login(page, cuenta);
      const trafico = [];
      page.on('request', (req) => { if (req.url().includes('/api/v1/pacientes')) trafico.push({ method: req.method(), path: new URL(req.url()).pathname }); });
      await page.goto(`${url}/pacientes`);
      await page.getByText('Busca un paciente para comenzar').waitFor();
      assert.equal(trafico.length, 0, 'abrir pacientes no debe enumerar datos');
      await page.getByRole('button', { name: 'Registrar nuevo paciente' }).click();
      const nombres = `PacienteUI${String.fromCharCode(65 + i)}`;
      await page.getByLabel(/Nombres del paciente/).fill(nombres);
      await page.getByLabel(/Apellidos del paciente/).fill('Prueba Sintética');
      await page.getByLabel(/Fecha de nacimiento/).fill(i === 3 ? '2020-02-29' : '2000-02-29');
      await page.getByLabel(/Teléfono principal/).fill('55550000');
      await page.getByLabel('Correo electrónico').fill('sintetico@example.test');
      if (i === 3) {
        await page.getByLabel('Nombres del responsable *').fill('Responsable Sintética');
        await page.getByLabel('Apellidos del responsable *').fill('Prueba');
        await page.getByLabel('Documento del responsable *').fill('1234567890102');
        await page.getByLabel('Teléfono del tutor').fill('55550001');
        await page.getByLabel('Autoriza la atención clínica del menor').uncheck();
      }
      let perdida;
      if (i === 0) {
        await page.route('**/api/v1/pacientes', async (route) => {
          if (route.request().method() !== 'POST' || perdida) return route.continue();
          perdida = { body: route.request().postData(), key: route.request().headers()['idempotency-key'] };
          const res = await route.fetch(); assert.equal(res.status(), 201);
          await route.abort('failed');
        });
      }
      const creado = i === 0 ? null : page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/pacientes'));
      await page.getByRole('button', { name: 'Registrar paciente' }).click();
      let confirmado;
      if (i === 0) {
        await page.getByText('Resultado pendiente de confirmar').waitFor();
        assert.equal(await page.getByLabel(/Nombres del paciente/).isDisabled(), true);
        const retry = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/v1/pacientes'));
        confirmado = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/pacientes'));
        await page.getByRole('button', { name: 'Registrar paciente' }).click();
        const request = await retry;
        assert.equal(request.postData(), perdida.body); assert.equal(request.headers()['idempotency-key'], perdida.key);
        paso('respuesta perdida después del commit: reintento conserva cuerpo y clave', cuenta.institucion);
      }
      const responseAlta = await (confirmado ?? creado);
      assert.equal(responseAlta.status(), 201, `alta ${cuenta.institucion}: HTTP ${responseAlta.status()}`);
      const data = (await responseAlta.json()).data;
      assert.equal(data.institucion, cuenta.institucion); assert.equal(data.fecha_nacimiento, i === 3 ? '2020-02-29' : '2000-02-29');
      assert.equal(data.identificacion, undefined, 'alta sin documento no inventa identidad');
      await page.waitForURL(`${url}/pacientes/${data.id}`);
      await page.getByRole('heading', { name: `${nombres} Prueba Sintética` }).waitFor();
      if (process.env.PATIENTS_UI_SCREENSHOT_DIR && i === 0) {
        await mkdir(process.env.PATIENTS_UI_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.PATIENTS_UI_SCREENSHOT_DIR, 'perfil-escritorio.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => document.querySelector('.sidebar-container')?.getBoundingClientRect().right <= 1);
        await page.screenshot({ path: join(process.env.PATIENTS_UI_SCREENSHOT_DIR, 'perfil-movil.png'), fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      if (i === 3) assert.equal(data.responsables[0].vinculo.autoriza_atencion, false);
      await page.reload(); await page.getByRole('heading', { name: `${nombres} Prueba Sintética` }).waitFor();
      paso('alta por React y lectura después de recargar; documento ausente', cuenta.institucion);
      await page.getByRole('button', { name: 'Editar datos del paciente' }).click();
      await page.getByLabel('Correo electrónico').fill('');
      await page.getByLabel(/Teléfono principal/).fill('55559999');
      await page.getByLabel('Tipo de documento *').selectOption('CUI');
      await page.getByLabel('Número de documento (opcional)').fill('1234567890101');
      const cambio = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(data.id));
      await page.getByRole('button', { name: 'Guardar cambios de paciente' }).click();
      const response = await cambio; const cuerpoCambio = await response.json();
      assert.equal(response.status(), 200, `PATCH ${cuenta.institucion}: ${cuerpoCambio.error?.codigo ?? response.status()}`);
      const edited = cuerpoCambio.data;
      assert.equal(edited.telefono, '55559999'); assert.equal(edited.correo, undefined); assert.ok(edited.version > data.version);
      if (i === 3) assert.deepEqual(edited.responsables, data.responsables);
      await page.waitForURL(`${url}/pacientes/${data.id}`); await page.getByText('55559999', { exact: true }).waitFor();
      paso('PATCH parcial/versionado retira correo y conserva responsables', cuenta.institucion);
      // El perfil se modifica desde otra intención mientras el formulario conserva la versión anterior.
      await page.getByRole('button', { name: 'Editar datos del paciente' }).click();
      await page.getByLabel('Dirección de residencia').fill('Edición pendiente');
      const externa = await page.evaluate(async ({ id, version }) => {
        const token = sessionStorage.getItem('clinica_auth_token_v1');
        const r = await fetch(`/api/v1/pacientes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ version_esperada: version, direccion: 'Cambio de otra sesión' }) });
        return r.status;
      }, { id: data.id, version: edited.version });
      assert.equal(externa, 200);
      const conflicto = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(data.id));
      await page.getByRole('button', { name: 'Guardar cambios de paciente' }).click();
      assert.equal((await conflicto).status(), 409); await page.getByText(/Otra sesión modificó/).waitFor();
      assert.equal(await page.getByLabel('Dirección de residencia').inputValue(), 'Edición pendiente');
      paso('conflicto real de versión conserva edición y no sobreescribe', cuenta.institucion);
      if (i < 3) {
        await page.goto(`${url}/pacientes/nuevo`);
        await page.getByLabel(/Nombres del paciente/).fill('Alta Duplicada'); await page.getByLabel(/Apellidos del paciente/).fill('Prueba');
        await page.getByLabel(/Fecha de nacimiento/).fill('2000-01-01'); await page.getByLabel('Número de documento (opcional)').fill('1234567890101');
        const duplicado = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/pacientes'));
        await page.getByRole('button', { name: 'Registrar paciente' }).click(); assert.equal((await duplicado).status(), 409);
        await page.getByRole('button', { name: 'Buscar paciente existente' }).click(); await page.getByText(`${nombres} Prueba Sintética`, { exact: true }).waitFor();
        paso('documento duplicado: rechazo y reutilización desde búsqueda', cuenta.institucion);
      }
      await page.goto(`${url}/pacientes/${data.id}`); await page.getByRole('heading', { name: `${nombres} Prueba Sintética` }).waitFor();
      // Nueva sesión de navegador independiente, autenticada por Firebase y cuenta local.
      const otro = await browser.newContext(); const otraPagina = await otro.newPage();
      try { await login(otraPagina, cuenta); await otraPagina.goto(`${url}/pacientes`); await otraPagina.getByRole('searchbox').fill(nombres); await otraPagina.getByText(`${nombres} Prueba Sintética`, { exact: true }).waitFor(); }
      finally { await otro.close(); }
      paso('búsqueda desde otra sesión autorizada', cuenta.institucion);
      await sembrarEventos(cuenta.institucion, data.id);
      await page.reload(); await page.getByText('Evento sintético 01', { exact: true }).waitFor();
      assert.equal(await page.getByText('Evento sintético 21', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click(); await page.getByText('Evento sintético 21', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Alternar orden cronológico' }).click(); await page.getByText('Evento sintético 21', { exact: true }).waitFor();
      await page.getByLabel('Tipo de evento').selectOption('RECETA'); await page.getByText('Sin eventos en esta cronología').waitFor();
      paso('cronología persistida sintética: cursor, inversión global y filtro del servidor', cuenta.institucion);
      if (i === 3) {
        await page.goto(`${url}/pacientes/nuevo`);
        await page.getByLabel(/Nombres del paciente/).fill('HermanaUI'); await page.getByLabel(/Apellidos del paciente/).fill('Prueba Sintética');
        await page.getByLabel(/Fecha de nacimiento/).fill('2022-01-01');
        await page.getByLabel('Nombres del responsable *').fill('Responsable Sintética'); await page.getByLabel('Apellidos del responsable *').fill('Prueba');
        await page.getByLabel('Documento del responsable *').fill('1234567890102'); await page.getByLabel('Teléfono del tutor').fill('55550001');
        const repetido = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/pacientes'));
        await page.getByRole('button', { name: 'Registrar paciente' }).click(); assert.equal((await repetido).status(), 409);
        await page.getByRole('button', { name: 'Seleccionar responsable registrado' }).click();
        await page.getByLabel('Buscar menor con responsable registrado').fill(nombres); await page.getByRole('button', { name: 'Buscar menor', exact: true }).click();
        await page.getByRole('button', { name: `Ver responsables de ${nombres} Prueba Sintética` }).click();
        await page.getByRole('button', { name: 'Vincular a Responsable Sintética Prueba' }).click();
        const hermano = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/pacientes'));
        await page.getByRole('button', { name: 'Registrar paciente' }).click();
        const respuestaHermano = await hermano; assert.equal(respuestaHermano.status(), 201);
        const nuevoHermano = (await respuestaHermano.json()).data;
        assert.equal(nuevoHermano.responsables[0].responsable.id, data.responsables[0].responsable.id);
        assert.equal(nuevoHermano.responsables[0].vinculo.autoriza_atencion, true);
        await page.waitForURL(`${url}/pacientes/${nuevoHermano.id}`);
        await page.reload(); await page.getByRole('heading', { name: 'HermanaUI Prueba Sintética' }).waitFor();
        paso('hermanos reutilizan responsable registrado y mantienen autorización por vínculo', cuenta.institucion);
      }
      const clinical = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => !/token|auth|session|sesion/i.test(k)));
      assert.deepEqual(clinical, [], 'no se guardan pacientes como respaldo local');
      pacientes.push({ id: data.id, cuenta, nombres });
    } finally { await context.close(); }
  }
  const contexto = await browser.newContext(); const page = await contexto.newPage();
  try {
    const secre = cuentas.find((c) => c.secretaria);
    await login(page, secre);
    let llamadasClinicas = 0;
    page.on('request', (r) => { if (/\/(expediente|historial)(\?|$)/.test(r.url())) llamadasClinicas++; });
    await page.goto(`${url}/pacientes/${pacientes[0].id}`); await page.getByText('Perfil administrativo').waitFor();
    assert.equal(llamadasClinicas, 0); assert.equal(await page.getByText('Evento sintético 01', { exact: true }).count(), 0);
    const sinPermiso = await page.evaluate(async (id) => { const token = sessionStorage.getItem('clinica_auth_token_v1'); return { tieneToken: Boolean(token), status: (await fetch(`/api/v1/pacientes/${id}/expediente`, { headers: { Authorization: `Bearer ${token}` } })).status }; }, pacientes[0].id);
    assert.equal(sinPermiso.tieneToken, true); assert.equal(sinPermiso.status, 403);
    paso('secretaría: perfil administrativo, sin llamada clínica; API deniega historial', 'HOSPITAL_GENERAL');
    await page.goto(`${url}/pacientes/${pacientes[1].id}`); await page.getByText('Paciente no encontrado', { exact: true }).waitFor();
    paso('identificador de otra institución: no encontrado', 'HOSPITAL_GENERAL');
  } finally { await contexto.close(); }
  await reiniciarBackend();
  for (const p of pacientes) {
    const context = await browser.newContext(); const page = await context.newPage();
    try { await login(page, p.cuenta); await page.goto(`${url}/pacientes/${p.id}`); await page.getByText('55559999', { exact: true }).waitFor(); paso('persistencia después de reiniciar backend', p.cuenta.institucion); }
    finally { await context.close(); }
  }
  return { entorno: 'PostgreSQL/MySQL/MongoDB aislados y emuladores Firebase Auth/Firestore; navegador real', casos: resultados, resumen: { PASS: resultados.length, FAIL: 0, BLOCKED: 0 } };
}
