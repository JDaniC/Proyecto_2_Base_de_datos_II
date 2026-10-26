import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ErrorConfiguracion,
  parsearConfiguracion,
  type ConfiguracionAplicacion,
} from '../../src/configuracion/entorno.js';

const instituciones =
  'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,CENTRO_MEDICO_PEDIATRICO';

function entornoValido(): Record<string, string> {
  return {
    APP_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '3000',
    INSTITUTIONS: instituciones,
  };
}

describe('configuración del servidor', () => {
  it('acepta la configuración completa y congela las instituciones canónicas', () => {
    const configuracion = parsearConfiguracion(entornoValido());

    assert.deepEqual(configuracion, {
      ambiente: 'test',
      host: '127.0.0.1',
      puerto: 3000,
      instituciones: [
        'HOSPITAL_GENERAL',
        'CLINICA_ODONTOLOGICA',
        'LABORATORIO_CLINICO',
        'CENTRO_MEDICO_PEDIATRICO',
      ],
    } satisfies ConfiguracionAplicacion);
    assert.equal(Object.isFrozen(configuracion), true);
    assert.equal(Object.isFrozen(configuracion.instituciones), true);
  });

  it('acepta todos los ambientes soportados y normaliza el orden del conjunto', () => {
    const conjuntoInvertido =
      'CENTRO_MEDICO_PEDIATRICO,LABORATORIO_CLINICO,CLINICA_ODONTOLOGICA,HOSPITAL_GENERAL';

    for (const ambiente of ['development', 'test', 'delivery']) {
      const configuracion = parsearConfiguracion({
        ...entornoValido(),
        APP_ENV: ambiente,
        INSTITUTIONS: conjuntoInvertido,
      });
      assert.equal(configuracion.ambiente, ambiente);
      assert.deepEqual(configuracion.instituciones, [
        'HOSPITAL_GENERAL',
        'CLINICA_ODONTOLOGICA',
        'LABORATORIO_CLINICO',
        'CENTRO_MEDICO_PEDIATRICO',
      ]);
    }
  });

  it('rechaza variables requeridas ausentes sin mostrar valores', () => {
    assert.throws(
      () => parsearConfiguracion({}),
      (error: unknown) => {
        assert.ok(error instanceof ErrorConfiguracion);
        assert.deepEqual(error.variables, ['APP_ENV', 'HOST', 'PORT', 'INSTITUTIONS']);
        assert.doesNotMatch(error.message, /HOSPITAL|3000|127\.0\.0\.1/);
        return true;
      },
    );
  });

  it('rechaza conjuntos de instituciones desconocidos, incompletos o duplicados', () => {
    const variantes = [
      'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,OTRA',
      'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO',
      `${instituciones},HOSPITAL_GENERAL`,
      '',
    ];

    for (const valor of variantes) {
      assert.throws(
        () => parsearConfiguracion({ ...entornoValido(), INSTITUTIONS: valor }),
        (error: unknown) => {
          assert.ok(error instanceof ErrorConfiguracion);
          assert.deepEqual(error.variables, ['INSTITUTIONS']);
          return true;
        },
      );
    }
  });

  it('valida los límites del puerto y los ambientes declarados', () => {
    for (const puerto of ['0', '65536', '-1', 'abc', '']) {
      assert.throws(
        () => parsearConfiguracion({ ...entornoValido(), PORT: puerto }),
        (error: unknown) => {
          assert.ok(error instanceof ErrorConfiguracion);
          assert.ok(error.variables.includes('PORT'));
          return true;
        },
      );
    }

    for (const puerto of ['1', '65535']) {
      assert.equal(
        parsearConfiguracion({ ...entornoValido(), PORT: puerto }).puerto,
        Number(puerto),
      );
    }

    assert.throws(
      () => parsearConfiguracion({ ...entornoValido(), APP_ENV: 'production' }),
      (error: unknown) => {
        assert.ok(error instanceof ErrorConfiguracion);
        assert.deepEqual(error.variables, ['APP_ENV']);
        return true;
      },
    );
  });

  it('rechaza hosts que no sean direcciones IP', () => {
    for (const host of ['localhost', 'api.local', '']) {
      assert.throws(
        () => parsearConfiguracion({ ...entornoValido(), HOST: host }),
        (error: unknown) => {
          assert.ok(error instanceof ErrorConfiguracion);
          assert.deepEqual(error.variables, ['HOST']);
          return true;
        },
      );
    }
  });
});
