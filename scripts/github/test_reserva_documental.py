"""Prueba aislada de la reserva exclusiva documentada; no llama GitHub."""
import concurrent.futures
import pathlib
import subprocess
import tempfile
import unittest


class ReservaExclusivaTest(unittest.TestCase):
    """Comprueba exclusión y continuidad de identidad usando solo Git temporal."""
    def test_primera_creacion_gana_y_borrado_ajeno_no_libera(self):
        """Dos competidores comparten ref; solo uno adquiere y el lease protege."""
        with tempfile.TemporaryDirectory(prefix='bdii-reserva-') as temporal:
            def git(*args, entrada=None, check=True):
                """Ejecuta argumentos Git constantes dentro del repositorio aislado."""
                return subprocess.run(['git', '-C', temporal, *args], input=entrada,
                                      text=True, capture_output=True, check=check)
            git('init', '--bare')
            arbol = git('mktree', entrada='').stdout.strip()
            def commit(mensaje, padre=None):
                """Crea una identidad sintética nueva y conserva el padre al transferir."""
                return git('-c', 'user.name=Reserva sintetica', '-c',
                           'user.email=reserva@example.invalid', 'commit-tree',
                           arbol, *(['-p', padre] if padre else []), entrada=mensaje).stdout.strip()
            primero, segundo = commit('Primero\n'), commit('Segundo\n')
            ref = 'refs/heads/codex/reserva-TEST'
            def adquirir(sha):
                """Crea la referencia solo si continúa ausente mediante comparación atómica."""
                return git('update-ref', ref, sha, '0' * 40, check=False)
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as equipo:
                resultados = list(equipo.map(adquirir, [primero, segundo]))
            self.assertEqual(sum(r.returncode == 0 for r in resultados), 1)
            ganador = git('rev-parse', ref).stdout.strip()
            perdedor = segundo if ganador == primero else primero
            self.assertNotEqual(git('update-ref', '-d', ref, perdedor,
                                    check=False).returncode, 0)
            self.assertEqual(git('rev-parse', ref).stdout.strip(), ganador)
            traspaso = commit('Traspaso con identidad nueva\n', ganador)
            git('update-ref', ref, traspaso, ganador)
            self.assertNotEqual(git('update-ref', '-d', ref, ganador,
                                    check=False).returncode, 0)
            self.assertEqual(git('rev-parse', ref).stdout.strip(), traspaso)
            git('update-ref', '-d', ref, traspaso)
            self.assertNotEqual(git('show-ref', '--verify', ref,
                                    check=False).returncode, 0)
            nueva = commit('Readquisicion con identidad distinta\n', traspaso)
            self.assertEqual(adquirir(nueva).returncode, 0)
            self.assertNotEqual(git('update-ref', '-d', ref, traspaso,
                                    check=False).returncode, 0)
            self.assertEqual(git('rev-parse', ref).stdout.strip(), nueva)
            git('update-ref', '-d', ref, nueva)

    def test_politica_mantiene_auditorias_antes_de_pr_y_reserva_previa(self):
        """La política exige creación exclusiva y rechaza sobrescribir reservas."""
        texto = (pathlib.Path(__file__).resolve().parents[2] / 'plan' /
                 '11_CONTINUIDAD_Y_COLA_COMPARTIDA.md').read_text()
        for frase in ['POST /repos/{owner}/{repo}/git/refs',
                      'Antes de abrir cualquier PR',
                      'antes de implementar', 'borrado con lease',
                      'Nunca usar actualización/force-push',
                      'atómicamente con lease sobre SHA_ANTERIOR hacia SHA_NUEVO',
                      'nunca reutilizar un SHA de reserva anterior']:
            self.assertIn(frase, texto)
        raiz = pathlib.Path(__file__).resolve().parents[2]
        agentes = (raiz / 'AGENTS.md').read_text()
        self.assertIn('primera creación atómica exitosa', agentes)
        self.assertIn('Solo entre PR heredados competidores', agentes)
        requisitos = (raiz / 'plan/evidencias/E05/auditoria-E05-P1-03-2026-11-05/REQUISITOS.md').read_text()
        self.assertIn('Excepción PR79', requisitos)
        self.assertIn('auditar antes de continuar revisión/integración', requisitos)


if __name__ == '__main__':
    unittest.main()
