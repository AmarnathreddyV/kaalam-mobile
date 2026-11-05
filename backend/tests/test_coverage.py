import unittest

from app.coverage import (
    STATE_GROUP_ALLOCATION,
    TOTAL_REGIONAL_GROUP_TARGET,
    coverage_for_state,
    launch_coverage_summary,
)


class LaunchCoverageTests(unittest.TestCase):
    def test_allocation_totals_250(self):
        self.assertEqual(TOTAL_REGIONAL_GROUP_TARGET, 250)
        self.assertEqual(sum(STATE_GROUP_ALLOCATION.values()), 250)

    def test_telugu_states_are_primary(self):
        self.assertEqual(coverage_for_state("Telangana")["priority"], "primary")
        self.assertEqual(coverage_for_state("Andhra Pradesh")["priority"], "primary")

    def test_eight_launch_states_are_supported(self):
        for state in STATE_GROUP_ALLOCATION:
            self.assertTrue(coverage_for_state(state)["supported"])

    def test_state_outside_launch_scope_is_not_supported(self):
        result = coverage_for_state("Delhi")
        self.assertFalse(result["supported"])
        self.assertEqual(result["regional_group_target"], 0)

    def test_summary_does_not_claim_registry_is_complete(self):
        summary = launch_coverage_summary()
        self.assertEqual(summary["target_regional_groups"], 250)
        self.assertEqual(summary["group_registry_status"], "planning_allocation_only")
        self.assertFalse(summary["ai_enabled"])


if __name__ == "__main__":
    unittest.main()
