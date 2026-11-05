import importlib.util
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
def load_script(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

coverage = load_script("coverage_validator", "validate_eight_state_coverage.py")
accuracy = load_script("accuracy_validator", "validate_reference_accuracy.py")


class FakeResponse:
    def __init__(self, body=b'{"ok": true}'):
        self.body = body
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self):
        return self.body


def gateway_error(code=502):
    return HTTPError("https://kaalam-mobile.onrender.com/test", code, "Gateway error", {}, None)


def test_coverage_request_retries_transient_502():
    with patch("urllib.request.urlopen", side_effect=[gateway_error(502), FakeResponse()]) as urlopen:
        with patch.object(coverage.time, "sleep"):
            result = coverage.request_json("https://kaalam-mobile.onrender.com/test")
    assert result == {"ok": True}
    assert urlopen.call_count == 2


def test_accuracy_request_retries_transient_503():
    with patch("urllib.request.urlopen", side_effect=[gateway_error(503), FakeResponse()]) as urlopen:
        with patch.object(accuracy.time, "sleep"):
            result = accuracy.get_json("https://kaalam-mobile.onrender.com/test")
    assert result == {"ok": True}
    assert urlopen.call_count == 2


def test_non_retryable_http_error_fails_immediately():
    with patch("urllib.request.urlopen", side_effect=gateway_error(404)) as urlopen:
        with patch.object(coverage.time, "sleep"):
            try:
                coverage.request_json("https://kaalam-mobile.onrender.com/test")
            except HTTPError as exc:
                assert exc.code == 404
            else:
                raise AssertionError("expected HTTP 404 to propagate")
    assert urlopen.call_count == 1
