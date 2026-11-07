import unittest
from unittest.mock import patch

from auto_merge import APP_ID, REVIEWER_ID, candidates, eligible, process, verdict


SHA = 'a' * 40
OLD_SHA = 'b' * 40
REPO = 'test/repo'


def check(**changes):
    result = dict(id=1, name='CodeRabbit', app={'id': APP_ID}, head_sha=SHA,
                  status='completed', conclusion='success')
    result.update(changes)
    return result


def review(state='APPROVED', sha=SHA, author=REVIEWER_ID):
    return dict(state=state, commit_id=sha, user={'id': author})


def pull_request(sha=SHA, queued=False):
    return dict(state='open', draft=False, base={'ref': 'develop'},
                head={'repo': {'full_name': REPO}, 'sha': sha},
                html_url='https://example.test/pull/78',
                auto_merge={'merge_method': 'squash'} if queued else None)


class CodeRabbitTests(unittest.TestCase):
    def test_current_success_requires_bot_approval(self):
        self.assertEqual(verdict([check()], [review()], SHA)[0], 'success')
        for reviews in ([], [review(sha=OLD_SHA)], [review(author=1)], [review('COMMENTED')]):
            self.assertEqual(verdict([check()], reviews, SHA)[0], 'pending')

    def test_missing_wrong_app_or_old_sha(self):
        for checks in ([], [check(app={'id': 1})], [check(head_sha=OLD_SHA)], [check(name='Otro')]):
            self.assertEqual(verdict(checks, [review()], SHA)[0], 'pending')

    def test_running_and_failed_checks(self):
        self.assertEqual(verdict([check(status='in_progress')], [review()], SHA)[0], 'pending')
        for value in ('failure', 'cancelled', 'skipped', 'neutral', None):
            self.assertEqual(verdict([check(conclusion=value)], [review()], SHA)[0], 'failure')

    def test_latest_native_run_wins(self):
        checks = [check(), check(id=2, status='in_progress')]
        self.assertEqual(verdict(checks, [review()], SHA)[0], 'pending')

    def test_latest_bot_decision_wins(self):
        approved = review()
        changes = review('CHANGES_REQUESTED')
        self.assertEqual(verdict([check()], [approved, changes, review('COMMENTED')], SHA)[0], 'failure')
        self.assertEqual(verdict([check()], [changes, approved], SHA)[0], 'success')
        self.assertEqual(verdict([check()], [approved, review('DISMISSED')], SHA)[0], 'pending')

    def test_only_ready_internal_pull_requests_with_protected_destination_are_eligible(self):
        pr = pull_request()
        self.assertTrue(eligible(pr, REPO))
        self.assertTrue(eligible(dict(pr, base={'ref': 'main'}), REPO))
        self.assertFalse(eligible(dict(pr, base={'ref': 'other'}), REPO))
        self.assertFalse(eligible(dict(pr, state='closed'), REPO))
        self.assertFalse(eligible(dict(pr, draft=True), REPO))
        self.assertFalse(eligible(pr, 'other/repo'))

    @patch('auto_merge.gh_api')
    def test_wakeup_rechecks_all_pages_and_manual_input_only_prioritizes(self, api):
        first = dict(pull_request(), number=12)
        second = dict(pull_request(OLD_SHA), number=78)
        api.return_value = [[first], [second]]
        self.assertEqual(candidates({'check_run': {}}, REPO), [first, second])
        self.assertEqual(candidates({'inputs': {'pr': '78'}}, REPO), [second, first])
        self.assertTrue(api.call_args.kwargs['paginate'])

    @patch('auto_merge.gh_api')
    def test_invalid_manual_input_stops_before_api(self, api):
        with self.assertRaises(ValueError):
            candidates({'inputs': {'pr': '78; echo x'}}, REPO)
        api.assert_not_called()


class CodeRabbitProcessTests(unittest.TestCase):
    def test_green_check_with_changes_requested_disables_queued_merge(self):
        pr = pull_request(queued=True)
        with patch('auto_merge.gh_api', side_effect=[pr, [[review('CHANGES_REQUESTED')]], pr, None]) as api, \
                patch('auto_merge.checks_for', return_value=[check()]), \
                patch('auto_merge.subprocess.run') as command:
            process(REPO, 78)
        self.assertEqual(api.call_args.args[1]['state'], 'failure')
        self.assertEqual(command.call_args.args[0], ['gh', 'pr', 'merge', '78', '--repo', REPO, '--disable-auto'])

    def test_pending_approval_does_not_start_merge(self):
        pr = pull_request()
        with patch('auto_merge.gh_api', side_effect=[pr, [[]], pr, None]) as api, \
                patch('auto_merge.checks_for', return_value=[check()]), \
                patch('auto_merge.subprocess.run') as command:
            process(REPO, 78)
        self.assertEqual(api.call_args.args[1]['state'], 'pending')
        command.assert_not_called()

    def test_current_approval_from_later_page_enables_merge_for_exact_sha(self):
        pr = pull_request()
        with patch('auto_merge.gh_api', side_effect=[pr, [[review(sha=OLD_SHA)], [review()]], pr, None]) as api, \
                patch('auto_merge.checks_for', return_value=[check()]), \
                patch('auto_merge.subprocess.run') as command:
            process(REPO, 78)
        self.assertEqual(api.call_args.args[1]['state'], 'success')
        self.assertEqual(command.call_args.args[0][-4:], ['--auto', '--squash', '--match-head-commit', SHA])

    def test_shared_commit_never_reuses_another_pull_requests_approval(self):
        pr = pull_request(queued=True)
        with patch('auto_merge.gh_api', side_effect=[pr, pr, None]) as api, \
                patch('auto_merge.checks_for') as checks, \
                patch('auto_merge.subprocess.run') as command:
            process(REPO, 78, {SHA})
        checks.assert_not_called()
        self.assertEqual(api.call_args.args[1]['state'], 'pending')
        self.assertEqual(command.call_args.args[0][-1], '--disable-auto')

    def test_rollout_publishes_approval_without_requesting_merge(self):
        for queued in (False, True):
            with self.subTest(queued=queued):
                pr = pull_request(queued=queued)
                with patch('auto_merge.gh_api', side_effect=[pr, [[review()]], pr, None]) as api, \
                        patch('auto_merge.checks_for', return_value=[check()]), \
                        patch('auto_merge.subprocess.run') as command:
                    process(REPO, 78, allow_auto_merge=False)
                self.assertEqual(api.call_args.args[1]['state'], 'success')
                if queued:
                    self.assertEqual(command.call_args.args[0][-1], '--disable-auto')
                else:
                    command.assert_not_called()

    def test_changed_head_prevents_status_or_merge(self):
        with patch('auto_merge.gh_api', side_effect=[pull_request(), [[review()]], pull_request(OLD_SHA)]) as api, \
                patch('auto_merge.checks_for', return_value=[check()]), \
                patch('auto_merge.subprocess.run') as command:
            process(REPO, 78)
        self.assertEqual(api.call_count, 3)
        command.assert_not_called()

    def test_failed_review_api_replaces_previous_success_and_disables_auto_merge(self):
        pr = pull_request(queued=True)
        status = {'state': 'success'}

        def api(endpoint, data=None, **options):
            if endpoint.endswith('/reviews?per_page=100'):
                raise OSError('GitHub no disponible')
            if data is not None:
                status.update(data)
                return None
            return pr

        with patch('auto_merge.gh_api', side_effect=api), \
                patch('auto_merge.checks_for', return_value=[check()]), \
                patch('auto_merge.subprocess.run') as command:
            process(REPO, 78)
        self.assertEqual(status['state'], 'failure')
        self.assertEqual(command.call_args.args[0][-1], '--disable-auto')

    def test_failed_status_write_still_attempts_to_disable_auto_merge(self):
        pr = pull_request(queued=True)
        with patch('auto_merge.gh_api', side_effect=[pr, [[review('CHANGES_REQUESTED')]], pr, OSError()]), \
                patch('auto_merge.checks_for', return_value=[check()]), \
                patch('auto_merge.subprocess.run') as command, self.assertRaises(OSError):
            process(REPO, 78)
        self.assertEqual(command.call_args.args[0][-1], '--disable-auto')


if __name__ == '__main__':
    unittest.main()
