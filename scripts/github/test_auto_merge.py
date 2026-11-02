import unittest
from auto_merge import APP_ID, eligible, verdict
SHA = 'a' * 40

def check(**changes):
    result = dict(id=1, name='CodeRabbit', app={'id': APP_ID}, head_sha=SHA,
                  status='completed', conclusion='success')
    result.update(changes)
    return result

class CodeRabbitTests(unittest.TestCase):
    def test_current_success(self):
        self.assertEqual(verdict([check()], SHA)[0], 'success')

    def test_missing_wrong_app_or_old_sha(self):
        for checks in [[], [check(app={'id': 1})], [check(head_sha='b'*40)], [check(name='Otro')]]:
            self.assertEqual(verdict(checks, SHA)[0], 'pending')

    def test_running_and_failed(self):
        self.assertEqual(verdict([check(status='in_progress')], SHA)[0], 'pending')
        for value in ['failure', 'cancelled', 'skipped', 'neutral', None]:
            self.assertEqual(verdict([check(conclusion=value)], SHA)[0], 'failure')

    def test_latest_run_wins(self):
        self.assertEqual(verdict([check(), check(id=2,status='in_progress')],SHA)[0], 'pending')

    def test_drafts_and_forks(self):
        pr=dict(state='open',draft=False,base={'ref':'develop'},head={'repo':{'full_name':'o/r'}})
        self.assertTrue(eligible(pr,'o/r'))
        self.assertFalse(eligible(dict(pr,draft=True),'o/r'))
        self.assertFalse(eligible(pr,'otro/r'))

if __name__ == '__main__':
    unittest.main()
