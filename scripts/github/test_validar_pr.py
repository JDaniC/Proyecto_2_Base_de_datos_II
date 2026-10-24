import unittest
from validar_pr import validar

class ContratoTests(unittest.TestCase):
    def test_tarea(self):
        validar('[E00-P1-01] Contratos', 'codex/e00-p1-01-contratos', 'Develop', ['Backend/a.ts'], '| E00-P1-01 |')
    def test_tarea_inexistente(self):
        with self.assertRaises(ValueError):
            validar('[E00-P1-01] Contratos', 'codex/e00-p1-01-x', 'Develop', ['a'], 'E00-P1-010')
    def test_rama_incorrecta(self):
        with self.assertRaises(ValueError):
            validar('[E00-P1-01] Contratos', 'Frontend', 'Develop', ['a'], 'E00-P1-01')
    def test_config(self):
        validar('[CONFIG-GITHUB] Flujo', 'codex/flujo', 'Develop', ['.github/workflows/ci.yml'], '')
    def test_config_no_codigo(self):
        with self.assertRaises(ValueError):
            validar('[CONFIG-GITHUB] Flujo', 'codex/flujo', 'Develop', ['Backend/a.ts'], '')
    def test_plan(self):
        validar('[PLAN] Importar', 'codex/plan', 'Develop', ['plan/06_TABLERO.md'], '')
    def test_entrega(self):
        validar('[ENTREGA-E07] Final', 'Develop', 'main', ['Backend/a.ts'], '')
    def test_no_directo_main(self):
        with self.assertRaises(ValueError):
            validar('[ENTREGA-E07] Final', 'Frontend', 'main', ['a'], '')
    def test_texto_arbitrario(self):
        with self.assertRaises(ValueError):
            validar('$(whoami)', 'x', 'Develop', ['a'], '')
