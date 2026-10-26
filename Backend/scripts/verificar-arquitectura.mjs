import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import ts from 'typescript';

const raices = ['src/dominio', 'src/aplicacion'];
const infracciones = [];

async function listarTypescript(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const rutas = await Promise.all(entradas.map(async (entrada) => {
    const ruta = resolve(directorio, entrada.name);
    if (entrada.isDirectory()) return listarTypescript(ruta);
    return extname(entrada.name) === '.ts' ? [ruta] : [];
  }));
  return rutas.flat();
}

function leerSpecifier(nodo) {
  if (
    (ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) &&
    nodo.moduleSpecifier &&
    ts.isStringLiteral(nodo.moduleSpecifier)
  ) {
    return nodo.moduleSpecifier.text;
  }
  if (
    ts.isCallExpression(nodo) &&
    nodo.expression.kind === ts.SyntaxKind.ImportKeyword &&
    nodo.arguments[0] &&
    ts.isStringLiteral(nodo.arguments[0])
  ) {
    return nodo.arguments[0].text;
  }
  if (
    ts.isCallExpression(nodo) &&
    ts.isIdentifier(nodo.expression) &&
    nodo.expression.text === 'require' &&
    nodo.arguments[0] &&
    ts.isStringLiteral(nodo.arguments[0])
  ) {
    return nodo.arguments[0].text;
  }
  return undefined;
}

for (const raiz of raices) {
  for (const archivo of await listarTypescript(resolve(raiz))) {
    const texto = await readFile(archivo, 'utf8');
    const fuente = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true);
    function inspeccionar(nodo) {
      const specifier = leerSpecifier(nodo);
      const llamadaDinamica = ts.isCallExpression(nodo) &&
        (nodo.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(nodo.expression) && nodo.expression.text === 'require'));
      if (llamadaDinamica && !specifier) {
        const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente));
        infracciones.push(`${archivo}:${line + 1}: importación dinámica no verificable`);
      }
      if (specifier) {
        if (!specifier.startsWith('.')) {
          const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente));
          infracciones.push(`${archivo}:${line + 1}: dependencia externa prohibida ${specifier}`);
        }
        if (specifier.startsWith('.')) {
          const destino = resolve(dirname(archivo), specifier);
          const esDominio = archivo.includes(`${resolve('src/dominio')}/`);
          const esAplicacion = archivo.includes(`${resolve('src/aplicacion')}/`);
          const destinoEsDominio = destino.includes(`${resolve('src/dominio')}/`);
          const destinoEsAplicacion = destino.includes(`${resolve('src/aplicacion')}/`);
          const rompeDependencia = esDominio
            ? !destinoEsDominio
            : esAplicacion && !destinoEsAplicacion && !destinoEsDominio;
          if (rompeDependencia) {
            const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente));
            infracciones.push(`${archivo}:${line + 1}: dependencia hacia una capa externa`);
          }
        }
      }
      if (ts.isIdentifier(nodo) && nodo.text === 'process') {
        const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente));
        infracciones.push(`${archivo}:${line + 1}: acceso al entorno de proceso`);
      }
      ts.forEachChild(nodo, inspeccionar);
    }
    inspeccionar(fuente);
  }
}

if (infracciones.length > 0) {
  console.error(infracciones.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: dominio y aplicación no importan entorno, HTTP, framework, UI, SDK ni adaptadores.');
}
