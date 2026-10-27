import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import { RegistrarPaciente } from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { ActualizarPaciente } from '../../src/aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import { ConsultarPaciente } from '../../src/aplicacion/casos-uso/pacientes/consultar-paciente.js';
import { BuscarPacientes } from '../../src/aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import { RepositorioPacientesMemoria } from '../../src/adaptadores/salida/pacientes/repositorio-pacientes-memoria.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { crearContextoAutenticado, type ContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import { CUENTAS_SINTETICAS } from '../../src/adaptadores/salida/identidad/semillas-sinteticas.js';
import { uuidPublico, type UUID } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';

describe('casos de uso de pacientes en memoria', () => {
  let repoHospital: RepositorioPacientesMemoria;
  let repoPediatria: RepositorioPacientesMemoria;
  let bundleHospital: BundleInstitucional;
  let bundlePediatria: BundleInstitucional;

  let contextoHospital: ContextoAutenticado;
  let contextoPediatria: ContextoAutenticado;

  let registrarPaciente: RegistrarPaciente;
  let actualizarPaciente: ActualizarPaciente;
  let consultarPaciente: ConsultarPaciente;
  let buscarPacientes: BuscarPacientes;

  beforeEach(() => {
    repoHospital = new RepositorioPacientesMemoria();
    repoPediatria = new RepositorioPacientesMemoria();

    bundleHospital = Object.freeze({
      institucion: 'HOSPITAL_GENERAL',
      estadoPersistencia: 'DISPONIBLE',
      pacientes: repoHospital,
      uow: repoHospital.crearUnidadDeTrabajo(),
    });

    bundlePediatria = Object.freeze({
      institucion: 'CENTRO_MEDICO_PEDIATRICO',
      estadoPersistencia: 'DISPONIBLE',
      pacientes: repoPediatria,
      uow: repoPediatria.crearUnidadDeTrabajo(),
    });

    const cuentaHosp = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('ADMIN_INSTITUCIONAL'),
    )!;
    contextoHospital = crearContextoAutenticado(
      { uid: cuentaHosp.uid, institucion: cuentaHosp.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
      cuentaHosp,
      uuidPublico(randomUUID()),
    );

    const cuentaPed = CUENTAS_SINTETICAS.find(
      (c) => c.institucion === 'CENTRO_MEDICO_PEDIATRICO' && c.roles.includes('ADMIN_INSTITUCIONAL'),
    )!;
    contextoPediatria = crearContextoAutenticado(
      { uid: cuentaPed.uid, institucion: cuentaPed.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
      cuentaPed,
      uuidPublico(randomUUID()),
    );

    registrarPaciente = new RegistrarPaciente(dependenciasComandoPorDefecto);
    actualizarPaciente = new ActualizarPaciente(dependenciasComandoPorDefecto);
    consultarPaciente = new ConsultarPaciente();
    buscarPacientes = new BuscarPacientes();
  });

  describe('RegistrarPaciente', () => {
    it('registra un paciente hospitalario con código legible y campos obligatorios', async () => {
      const claveIdempotencia = uuidPublico(randomUUID());
      const paciente = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada: {
          nombres: 'Carlos Alberto',
          apellidos: 'Gomez Alvarez',
          fecha_nacimiento: '1985-06-15',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '2099123450101' },
          grupo_sanguineo: 'O+',
          contacto_emergencia: {
            nombre: 'Maria Gomez',
            telefono: '55512345',
            relacion: 'Hermana',
          },
        },
      });

      assert.ok(paciente.id);
      assert.match(paciente.codigo_legible, /^HOSP-[A-F0-9]{6}$/);
      assert.equal(paciente.nombres, 'Carlos Alberto');
      assert.equal(paciente.apellidos, 'Gomez Alvarez');
      assert.equal(paciente.fecha_nacimiento, '1985-06-15');
      assert.equal(paciente.sexo, 'MASCULINO');
      assert.equal(paciente.identificacion?.numero, '2099123450101');
      assert.equal(paciente.grupo_sanguineo, 'O+');
      assert.equal(paciente.contacto_emergencia?.nombre, 'Maria Gomez');
      assert.equal(paciente.estado, 'ACTIVO');
      assert.equal(paciente.version, 1);
    });

    it('reproduce durablemente el resultado ante clave de idempotencia repetida', async () => {
      const claveIdempotencia = uuidPublico(randomUUID());
      const entrada = {
        nombres: 'Luisa Fernanda',
        apellidos: 'Morales Silva',
        fecha_nacimiento: '1990-11-20',
        sexo: 'FEMENINO' as const,
        identificacion: { tipo: 'CUI' as const, numero: '3044123450101' },
      };

      const primero = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada,
      });

      const segundo = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia,
        entrada,
      });

      assert.equal(segundo.id, primero.id);
      assert.equal(segundo.codigo_legible, primero.codigo_legible);
      assert.equal(segundo.version, primero.version);
    });

    it('rechaza identificación duplicada', async () => {
      const ident = { tipo: 'CUI' as const, numero: '2099999990101' };
      await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Primer',
          apellidos: 'Paciente',
          fecha_nacimiento: '1980-01-01',
          sexo: 'MASCULINO',
          identificacion: ident,
        },
      });

      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Segundo',
              apellidos: 'Paciente',
              fecha_nacimiento: '1982-02-02',
              sexo: 'MASCULINO',
              identificacion: ident,
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'PACIENTE_DUPLICADO');
          return true;
        },
      );
    });

    it('exige al menos un responsable principal en alta pediátrica', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Niño',
              apellidos: 'Perez',
              fecha_nacimiento: '2020-05-10',
              sexo: 'MASCULINO',
              responsables: [
                {
                  parentesco: 'Madre',
                  es_principal: false,
                  autoriza_atencion: true,
                  nombres: 'Juana',
                  apellidos: 'Perez',
                  telefono: '55500000',
                  documento: { tipo: 'CUI', numero: '1000000000101' },
                },
              ],
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          assert.match(error.message, /responsable principal/i);
          return true;
        },
      );
    });

    it('rechaza fecha de nacimiento futura', async () => {
      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Futuro',
              apellidos: 'Paciente',
              fecha_nacimiento: '2099-01-01',
              sexo: 'MASCULINO',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
          return true;
        },
      );
    });

    it('deniega registro si la cuenta no tiene permiso pacientes.administrar', async () => {
      const cuentaMedico = CUENTAS_SINTETICAS.find(
        (c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('MEDICO'),
      )!;
      const contextoMedico = crearContextoAutenticado(
        { uid: cuentaMedico.uid, institucion: cuentaMedico.institucion, emitidoEn: instanteUtc(new Date().toISOString()) },
        cuentaMedico,
        uuidPublico(randomUUID()),
      );

      await assert.rejects(
        async () => {
          await registrarPaciente.ejecutar({
            contexto: contextoMedico,
            bundle: bundleHospital,
            claveIdempotencia: uuidPublico(randomUUID()),
            entrada: {
              nombres: 'Test',
              apellidos: 'NoPermiso',
              fecha_nacimiento: '1995-01-01',
              sexo: 'MASCULINO',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'SIN_PERMISO');
          return true;
        },
      );
    });
  });

  describe('ActualizarPaciente', () => {
    let pacienteId: UUID;

    beforeEach(async () => {
      const creado = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Ana Beatriz',
          apellidos: 'Ochoa Ruiz',
          fecha_nacimiento: '1992-04-12',
          sexo: 'FEMENINO',
          telefono: '55598765',
          identificacion: { tipo: 'CUI', numero: '5555123450101' },
        },
      });
      pacienteId = creado.id as UUID;
    });

    it('actualiza campos demográficos e incrementa versión con bloqueo optimista', async () => {
      const actualizado = await actualizarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
        claveIdempotencia: uuidPublico(randomUUID()),
        cambios: {
          version_esperada: 1,
          telefono: '55511111',
          direccion: 'Zona 10, Ciudad de Guatemala',
        },
      });

      assert.equal(actualizado.id, pacienteId);
      assert.equal(actualizado.version, 2);
      assert.equal(actualizado.telefono, '55511111');
      assert.equal(actualizado.direccion, 'Zona 10, Ciudad de Guatemala');
      assert.equal(actualizado.nombres, 'Ana Beatriz'); // conserva campos omitidos
    });

    it('rechaza versión esperada discordante con conflicto 409', async () => {
      await assert.rejects(
        async () => {
          await actualizarPaciente.ejecutar({
            contexto: contextoHospital,
            bundle: bundleHospital,
            id: pacienteId,
            claveIdempotencia: uuidPublico(randomUUID()),
            cambios: {
              version_esperada: 99,
              telefono: '55500000',
            },
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'VERSION_DESACTUALIZADA');
          return true;
        },
      );
    });

    it('libera reserva de identidad previa al retirar o cambiar documento', async () => {
      // Retirar identificación (null elimina campo opcional)
      const actualizado = await actualizarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
        claveIdempotencia: uuidPublico(randomUUID()),
        cambios: {
          version_esperada: 1,
          identificacion: null,
        },
      });
      assert.equal(actualizado.identificacion, undefined);

      // Ahora otro paciente puede registrarse con la identificación liberada
      const nuevo = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Nuevo',
          apellidos: 'Titular',
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '5555123450101' },
        },
      });
      assert.ok(nuevo.id);
    });
  });

  describe('ConsultarPaciente y BuscarPacientes', () => {
    let pacienteId: UUID;

    beforeEach(async () => {
      const creado = await registrarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        claveIdempotencia: uuidPublico(randomUUID()),
        entrada: {
          nombres: 'Gustavo Adolfo',
          apellidos: 'Becquer Soto',
          fecha_nacimiento: '1975-02-17',
          sexo: 'MASCULINO',
          identificacion: { tipo: 'CUI', numero: '7777123450101' },
        },
      });
      pacienteId = creado.id as UUID;
    });

    it('obtiene paciente existente por UUID', async () => {
      const consultado = await consultarPaciente.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        id: pacienteId,
      });

      assert.equal(consultado.id, pacienteId);
      assert.equal(consultado.nombres, 'Gustavo Adolfo');
    });

    it('aplica aislamiento institucional y no encuentra paciente de otro bundle', async () => {
      await assert.rejects(
        async () => {
          await consultarPaciente.ejecutar({
            contexto: contextoPediatria,
            bundle: bundlePediatria,
            id: pacienteId,
          });
        },
        (error: ErrorDominio) => {
          assert.equal(error.codigo, 'RECURSO_NO_ENCONTRADO');
          return true;
        },
      );
    });

    it('busca pacientes por término de nombre o documento', async () => {
      const resultado = await buscarPacientes.ejecutar({
        contexto: contextoHospital,
        bundle: bundleHospital,
        entrada: { q: 'Gustavo' },
      });

      assert.equal(resultado.data.length, 1);
      assert.equal(resultado.data[0]!.id, pacienteId);
    });
  });
});
