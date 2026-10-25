"""Valida artefactos E00 sin levantar API, sin motores ni red.

Uso: python Backend/scripts/validar_contrato.py
Instalar primero Backend/docs/requirements-contrato.txt en un venv.
"""
import json
from pathlib import Path
import re
from importlib.metadata import version

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate_spec

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'Backend/docs'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_artifacts():
    spec = yaml.safe_load((DOCS / 'openapi.yaml').read_text())
    validate_spec(spec)
    schemas = spec['components']['schemas']
    for name, schema in schemas.items():
        Draft202012Validator.check_schema(schema)
    operations = {op['operationId']: op for item in spec['paths'].values()
                  for method, op in item.items() if method in {'get', 'post', 'patch', 'put', 'delete'}}
    require(len(operations) == sum(len(item) for item in spec['paths'].values()), 'operationId duplicado')
    fixtures = json.loads((DOCS / 'fixtures/contrato-v1.json').read_text())
    ids = set()
    request_coverage = set()
    for case in fixtures:
        require(case['id'] not in ids, 'Fixture duplicado: ' + case['id'])
        ids.add(case['id'])
        target = case['schema']
        require(target in schemas, 'Esquema inexistente: ' + target)
        validator = Draft202012Validator({'components': spec['components'], '$ref': '#/components/schemas/' + target},
                                        format_checker=FormatChecker())
        errors = list(validator.iter_errors(case['value']))
        require((not errors) == case['valid'], 'Fixture con resultado incorrecto: ' + case['id'] +
                (' — ' + errors[0].message if errors else ' — se aceptó la entrada inválida'))
        if 'operationId' in case:
            op = operations[case['operationId']]
            require(op['requestBody']['content']['application/json']['schema']['$ref'].endswith('/' + target),
                    'Fixture no corresponde al request: ' + case['id'])
            request_coverage.add((case['operationId'], case['valid']))
    # Los ejemplos embebidos en errores también deben cumplir su esquema.
    for response in spec['components']['responses'].values():
        media = response['content']['application/json']
        validator = Draft202012Validator({'components': spec['components'], 'allOf': [media['schema']]},
                                        format_checker=FormatChecker())
        validator.validate(media['example'])
    for name, op in operations.items():
        require(op['x-implementacion'] == 'NOT_IMPLEMENTED', 'No atribuir implementación a este contrato')
        require({'400', '401', '403', '404', '409', '413', '500', '503'} <= set(op['responses']),
                'Errores incompletos: ' + name)
        if 'requestBody' in op:
            require({(name, True), (name, False)} <= request_coverage, 'Faltan ejemplos request: ' + name)
        require('x-permisos' in op and op['x-instituciones'], 'Política ausente: ' + name)
    # Trazabilidad exhaustiva contra las firmas de presentación actuales.
    source = (ROOT / 'Frontend/src/services/contracts.ts').read_text()
    source = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
    methods = set()
    for repo, body in re.findall(r'export interface (\w+Repository) \{(.*?)\n\}', source, re.S):
        methods.update(repo + '.' + name for name in re.findall(r'^  (\w+)\??\(', body, re.M))
    mapping = json.loads((DOCS / 'mapa-ui-v1.json').read_text())
    require(len(mapping) == len({r['metodo'] for r in mapping}), 'Método duplicado en mapa')
    require(methods == {r['metodo'] for r in mapping}, 'Métodos UI omitidos o inventados')
    scope = (ROOT / 'Frontend/src/app/productScope.ts').read_text()
    excluded_block = scope.split('export const EXCLUDED_CONTRACT_METHODS')[1].split(']')[0]
    excluded = set(re.findall(r"'([^']+)'", excluded_block))
    require(excluded == {r['metodo'] for r in mapping if r['destino'] == 'EXCLUIDO'},
            'Exclusiones difieren del alcance UI')
    for row in mapping:
        if row['destino'] == 'COMUN_V1':
            require(row['operationId'] in operations, 'Destino común ausente: ' + row['metodo'])
        elif row['destino'] == 'EXTENSION_PENDIENTE':
            require(row['responsable'] and row['regla'], 'Extensión sin puerta contractual')
    return {'resultado': 'PASS', 'tipo': 'CONTRATO_OFFLINE_SIN_API_NI_MOTORES',
            'openapi': spec['openapi'], 'rutas': len(spec['paths']), 'operaciones': len(operations),
            'esquemas': len(schemas), 'fixtures': len(fixtures), 'metodos_ui': len(mapping),
            'vigentes_ui': sum(r['categoria'] == 'VIGENTE_UI' for r in mapping),
            'herramientas': {p: version(p) for p in ('openapi-spec-validator', 'jsonschema', 'PyYAML')}}


if __name__ == '__main__':
    print(json.dumps(validate_artifacts(), ensure_ascii=False, indent=2))
