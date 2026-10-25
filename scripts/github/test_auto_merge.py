import json
import unittest
from auto_merge import APP_ID, BOT, eligible, verdict

SHA = "a" * 40


def comment(sha=SHA, status="completed", findings=False, unresolved=False):
    data = {"code_review": {"commit_sha": sha, "status": status,
                            "has_any_findings": findings, "has_unresolved_findings": unresolved}}
    return {"id": 1, "updated_at": "2026-10-24T10:00:00Z", "user": {"login": BOT, "type": "Bot"},
            "performed_via_github_app": {"id": APP_ID},
            "body": "<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 " + json.dumps(data) + " -->"}


class CodexTests(unittest.TestCase):
    def test_revision_actual_sin_hallazgos(self):
        self.assertEqual(verdict([comment()], SHA)[0], "success")

    def test_ausencia_revision_anterior_y_revision_en_curso(self):
        for comments in [[], [comment(sha="b" * 40)], [comment(status="running")]]:
            self.assertEqual(verdict(comments, SHA)[0], "pending")

    def test_hallazgos_y_revision_fallida(self):
        for item in [comment(findings=True), comment(unresolved=True), comment(status="failed")]:
            self.assertEqual(verdict([item], SHA)[0], "failure")

    def test_resultado_incompleto_no_es_aprobacion(self):
        self.assertEqual(verdict([comment(findings=None)], SHA)[0], "pending")
        self.assertEqual(verdict([comment(findings=0)], SHA)[0], "pending")

    def test_humano_o_app_distinta_no_pueden_suplantar_codex(self):
        for key in ["user", "performed_via_github_app"]:
            item = comment()
            item[key] = {"login": BOT, "type": "User"} if key == "user" else {"id": 1}
            self.assertEqual(verdict([item], SHA)[0], "pending")

    def test_formato_desconocido_no_es_aprobacion(self):
        item = comment()
        item["body"] = "<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 {malformed} -->"
        self.assertEqual(verdict([item], SHA)[0], "pending")

    def test_ultima_revision_prevalece(self):
        old = comment()
        new = comment(status="running")
        new.update(id=2, updated_at="2026-10-24T10:05:00Z")
        self.assertEqual(verdict([new, old], SHA)[0], "pending")

    def test_borradores_forks_y_cerrados_no_se_integran(self):
        pr = {"state": "open", "draft": False, "base": {"ref": "develop"},
              "head": {"repo": {"full_name": "owner/repo"}}}
        self.assertTrue(eligible(pr, "owner/repo"))
        self.assertFalse(eligible(pr, "other/repo"))
        self.assertFalse(eligible(dict(pr, draft=True), "owner/repo"))
        self.assertFalse(eligible(dict(pr, state="closed"), "owner/repo"))

    def test_app_ausente_y_estado_invalido_no_aprueban(self):
        item = comment()
        item['performed_via_github_app'] = None
        self.assertEqual(verdict([item], SHA)[0], 'pending')
        self.assertEqual(verdict([comment(status={})], SHA)[0], 'pending')

    def test_pending_no_habilita_merge_y_publica_pending(self):
        from unittest.mock import patch
        from auto_merge import process
        pr = {'state': 'open', 'draft': False, 'base': {'ref': 'develop'},
              'head': {'sha': SHA, 'repo': {'full_name': 'owner/repo'}}, 'html_url': 'https://github.com/owner/repo/pull/7'}
        with patch('auto_merge.gh_api', side_effect=[pr, pr, {}]) as api, patch('auto_merge.comments_for', return_value=[]), patch('auto_merge.subprocess.run') as run:
            process('owner/repo', 7)
            self.assertEqual(api.call_args.args[1]['state'], 'pending')
            run.assert_not_called()

    def test_success_solicita_auto_merge_del_sha_exacto(self):
        from unittest.mock import patch
        from auto_merge import process
        pr = {'state': 'open', 'draft': False, 'base': {'ref': 'develop'},
              'head': {'sha': SHA, 'repo': {'full_name': 'owner/repo'}}, 'html_url': 'https://github.com/owner/repo/pull/7'}
        with patch('auto_merge.gh_api', side_effect=[pr, pr, {}]) as api, patch('auto_merge.comments_for', return_value=[comment()]), patch('auto_merge.subprocess.run') as run:
            process('owner/repo', 7)
            self.assertEqual(api.call_args.args[1]['state'], 'success')
            args = run.call_args.args[0]
            self.assertIn('--auto', args)
            self.assertIn('--match-head-commit', args)
            self.assertEqual(args[-1], SHA)
            self.assertNotIn('--admin', args)

    def test_cambio_de_cabeza_no_publica_ni_integra_resultado_viejo(self):
        from unittest.mock import patch
        from auto_merge import process
        pr = {'state': 'open', 'draft': False, 'base': {'ref': 'develop'},
              'head': {'sha': SHA, 'repo': {'full_name': 'owner/repo'}}, 'html_url': 'https://github.com/owner/repo/pull/7'}
        newer = dict(pr, head={'sha': 'b' * 40, 'repo': {'full_name': 'owner/repo'}})
        with patch('auto_merge.gh_api', side_effect=[pr, newer]) as api, patch('auto_merge.comments_for', return_value=[comment()]), patch('auto_merge.subprocess.run') as run:
            process('owner/repo', 7)
            self.assertEqual(api.call_count, 2)
            run.assert_not_called()
