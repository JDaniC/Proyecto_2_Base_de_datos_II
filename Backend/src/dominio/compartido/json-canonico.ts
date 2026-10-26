import { solicitudInvalida } from './error-dominio.js';

/** Serialización JCS para valores ya decodificados y validados; no normaliza texto ni Unicode. */
export function serializarJCS(valor: unknown): string {
  return serializar(valor, new Set<object>());
}

/** Parsea JSON de entrada sin permitir claves duplicadas, incluso si usan escapes distintos. */
export function parsearJSONSinClavesDuplicadas(texto: string): unknown {
  try {
    const lector = new LectorJSON(texto);
    lector.valor();
    lector.espacios();
    if (!lector.terminado) throw new Error('JSON con contenido sobrante');
    return JSON.parse(texto) as unknown;
  } catch {
    throw solicitudInvalida('El cuerpo debe ser JSON válido, sin claves duplicadas.');
  }
}

class LectorJSON {
  private indice = 0;
  constructor(private readonly texto: string) {}

  get terminado(): boolean { return this.indice === this.texto.length; }

  espacios(): void {
    while (/[\t\n\r ]/.test(this.texto[this.indice] ?? '')) this.indice += 1;
  }

  valor(): void {
    this.espacios();
    const caracter = this.texto[this.indice];
    if (caracter === '{') return this.objeto();
    if (caracter === '[') return this.arreglo();
    if (caracter === '"') { this.cadena(); return; }
    if (caracter === 't') return this.literal('true');
    if (caracter === 'f') return this.literal('false');
    if (caracter === 'n') return this.literal('null');
    const numero = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    numero.lastIndex = this.indice;
    const match = numero.exec(this.texto);
    if (!match) throw new Error('JSON inválido');
    this.indice = numero.lastIndex;
  }

  private objeto(): void {
    this.indice += 1;
    this.espacios();
    if (this.texto[this.indice] === '}') { this.indice += 1; return; }
    const claves = new Set<string>();
    while (true) {
      this.espacios();
      if (this.texto[this.indice] !== '"') throw new Error('clave JSON inválida');
      const clave = this.cadena();
      if (claves.has(clave)) throw new Error('clave JSON duplicada');
      claves.add(clave);
      this.espacios();
      if (this.texto[this.indice] !== ':') throw new Error('separador JSON inválido');
      this.indice += 1;
      this.valor();
      this.espacios();
      const separador = this.texto[this.indice];
      if (separador === '}') { this.indice += 1; return; }
      if (separador !== ',') throw new Error('objeto JSON incompleto');
      this.indice += 1;
    }
  }

  private arreglo(): void {
    this.indice += 1;
    this.espacios();
    if (this.texto[this.indice] === ']') { this.indice += 1; return; }
    while (true) {
      this.valor();
      this.espacios();
      const separador = this.texto[this.indice];
      if (separador === ']') { this.indice += 1; return; }
      if (separador !== ',') throw new Error('arreglo JSON incompleto');
      this.indice += 1;
    }
  }

  private cadena(): string {
    const inicio = this.indice;
    this.indice += 1;
    while (this.indice < this.texto.length) {
      const actual = this.texto[this.indice];
      if (actual === '"') {
        this.indice += 1;
        return JSON.parse(this.texto.slice(inicio, this.indice)) as string;
      }
      if (actual === '\\') this.indice += 1;
      this.indice += 1;
    }
    throw new Error('cadena JSON incompleta');
  }

  private literal(valor: 'true' | 'false' | 'null'): void {
    if (!this.texto.startsWith(valor, this.indice)) throw new Error('literal JSON inválido');
    this.indice += valor.length;
  }
}

function serializar(valor: unknown, ancestros: Set<object>): string {
  if (valor === null) return 'null';
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'string') {
    validarUnicode(valor);
    return JSON.stringify(valor);
  }
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw solicitudInvalida('JCS no admite NaN ni Infinity.');
    return JSON.stringify(valor);
  }
  if (Array.isArray(valor)) {
    detectarCiclo(valor, ancestros);
    const resultado = `[${valor.map((elemento) => serializar(elemento, ancestros)).join(',')}]`;
    ancestros.delete(valor);
    return resultado;
  }
  if (typeof valor === 'object' && valor !== null) {
    const prototipo = Object.getPrototypeOf(valor);
    if (prototipo !== Object.prototype && prototipo !== null) {
      throw solicitudInvalida('JCS solo admite objetos JSON simples.');
    }
    detectarCiclo(valor, ancestros);
    const registro = valor as Record<string, unknown>;
    const claves = Object.keys(registro).sort();
    const propiedades = claves.map((clave) => {
      validarUnicode(clave);
      const propiedad = registro[clave];
      if (propiedad === undefined) throw solicitudInvalida('JCS no admite propiedades undefined.');
      return `${JSON.stringify(clave)}:${serializar(propiedad, ancestros)}`;
    });
    ancestros.delete(valor);
    return `{${propiedades.join(',')}}`;
  }
  throw solicitudInvalida('El valor no es JSON serializable para JCS.');
}

function detectarCiclo(valor: object, ancestros: Set<object>): void {
  if (ancestros.has(valor)) throw solicitudInvalida('JCS no admite referencias cíclicas.');
  ancestros.add(valor);
}

function validarUnicode(valor: string): void {
  for (let indice = 0; indice < valor.length; indice += 1) {
    const unidad = valor.charCodeAt(indice);
    if (unidad >= 0xd800 && unidad <= 0xdbff) {
      const siguiente = valor.charCodeAt(indice + 1);
      if (!(siguiente >= 0xdc00 && siguiente <= 0xdfff)) throw solicitudInvalida('JCS no admite sustitutos Unicode aislados.');
      indice += 1;
    } else if (unidad >= 0xdc00 && unidad <= 0xdfff) {
      throw solicitudInvalida('JCS no admite sustitutos Unicode aislados.');
    }
  }
}
