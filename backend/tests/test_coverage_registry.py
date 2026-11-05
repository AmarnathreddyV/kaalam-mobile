import unittest

from app.coverage_registry import nearest_group, validate_candidate, validate_registry


def row(group_id="TS-001", state="Telangana", lat=17.385, lon=78.4867):
    return {
        "group_id": group_id,
        "state": state,
        "place_name": "Hyderabad",
        "latitude": lat,
        "longitude": lon,
        "source_url": "https://example.gov.in/geodata",
        "review_status": "candidate",
    }


class CoverageRegistryTests(unittest.TestCase):
    def test_valid_candidate(self):
        self.assertEqual(validate_candidate(row()), [])

    def test_rejects_coordinate_outside_state(self):
        self.assertIn("coordinates_outside_state_bounds", validate_candidate(row(lat=28.6, lon=77.2)))

    def test_rejects_missing_provenance(self):
        item = row()
        item["source_url"] = ""
        self.assertIn("missing_source_url", validate_candidate(item))

    def test_registry_requires_exact_state_targets(self):
        result = validate_registry([row()], require_targets=True)
        self.assertFalse(result["valid"])
        self.assertEqual(result["counts_by_state"]["Telangana"], 1)

    def test_nearest_group_respects_maximum_radius(self):
        records = [row()]
        self.assertEqual(nearest_group(17.385, 78.4867, records, max_radius_km=1)["group_id"], "TS-001")
        self.assertIsNone(nearest_group(18.5, 79.5, records, max_radius_km=1))

    def test_candidate_is_not_marked_verified_automatically(self):
        self.assertEqual(row()["review_status"], "candidate")


if __name__ == "__main__":
    unittest.main()
