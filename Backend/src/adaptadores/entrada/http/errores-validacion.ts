import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export type CodigoCampoInvalido =
  | 'REQUERIDO'
  | 'FORMATO'
  | 'RANGO'
  | 'NO_PERMITIDO';

export interface CampoInvalido {
  readonly campo: string;
  readonly codigo: CodigoCampoInvalido;
}

const CODIGOS_CONSTRAINT: Readonly<Record<string, CodigoCampoInvalido>> = {
  whitelistValidation: 'NO_PERMITIDO',
  isDefined: 'REQUERIDO',
  isNotEmpty: 'REQUERIDO',
  minLength: 'RANGO',
  maxLength: 'RANGO',
  min: 'RANGO',
  max: 'RANGO',
  arrayMinSize: 'RANGO',
  arrayMaxSize: 'RANGO',
};

export class ErrorValidacionSolicitud extends BadRequestException {
  constructor(readonly campos: readonly CampoInvalido[]) {
    super('La solicitud no cumple el contrato.');
    this.name = 'ErrorValidacionSolicitud';
  }
}

export function extraerCamposInvalidos(
  errores: readonly ValidationError[],
): readonly CampoInvalido[] {
  const campos: CampoInvalido[] = [];

  function recorrer(erroresActuales: readonly ValidationError[], prefijo = ''): void {
    for (const error of erroresActuales) {
      const campo = prefijo ? `${prefijo}.${error.property}` : error.property;
      for (const constraint of Object.keys(error.constraints ?? {})) {
        campos.push({
          campo: campo.slice(0, 100),
          codigo: CODIGOS_CONSTRAINT[constraint] ?? 'FORMATO',
        });
      }
      recorrer(error.children ?? [], campo);
    }
  }

  recorrer(errores);
  const unicos = new Map(
    campos.map((campo) => [`${campo.campo}:${campo.codigo}`, campo]),
  );
  return Object.freeze([...unicos.values()].slice(0, 100));
}
