"""Validación offline hospitalaria; dependencias en docs/requirements-contrato.txt."""
import json
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate_spec

base = Path(__file__).resolve().parents[1]
spec = yaml.safe_load((base / 'docs/openapi.yaml').read_text())
validate_spec(spec)
fixtures = json.loads((base / 'docs/fixtures/hospital-v1.json').read_text()) + json.loads((base / 'docs/fixtures/hospital-servicios-v1.json').read_text())
for case in fixtures:
    validator = Draft202012Validator(
        {'components': spec['components'], '$ref': '#/components/schemas/' + case['schema']},
        format_checker=FormatChecker(),
    )
    errors = list(validator.iter_errors(case['value']))
    assert (not errors) == case['valid'], case['id']
print(json.dumps({'resultado': 'PASS', 'tipo': 'CONTRATO_OFFLINE_SIN_MOTOR',
                  'fixtures_hospitalarios': len(fixtures), 'rutas_hospitalarias':
                  sum(path.startswith('/hospital/') for path in spec['paths'])}))
