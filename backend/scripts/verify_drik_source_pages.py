"""Fetch and verify expected reference tokens against visible Drik Panchang page text.

This is an evidence-presence check, not a semantic DOM parser or independent
calculation. It deliberately reports inaccessible pages and missing tokens as
unverified/failures; it never treats a URL allowlist as source verification.
"""
from __future__ import annotations

import csv
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "accuracy_reference.csv"
REPORT_PATH = Path("drik-source-verification-report.json")
USER_AGENT = "Mozilla/5.0 (compatible; KAALAM-Drik-Source-Verification/1.0)"
RETRYABLE = {429, 500, 502, 503, 504}


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in {"script", "style", "noscript", "svg"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if not self.skip_depth and data.strip():
            self.parts.append(data.strip())


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def time_forms(value: str) -> list[str]:
    parsed = datetime.strptime(value, "%H:%M")
    suffix = "AM" if parsed.hour < 12 else "PM"
    hour = parsed.hour % 12 or 12
    return [f"{hour:02d}:{parsed.minute:02d} {suffix}", f"{hour}:{parsed.minute:02d} {suffix}"]


def fetch_text(url: str) -> tuple[str, int]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    last_error = ""
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                raw = response.read()
                charset = response.headers.get_content_charset() or "utf-8"
                parser = VisibleText()
                parser.feed(raw.decode(charset, errors="replace"))
                return " ".join(parser.parts), response.status
        except urllib.error.HTTPError as exc:
            last_error = f"HTTP {exc.code}"
            if exc.code not in RETRYABLE or attempt == 1:
                raise RuntimeError(last_error) from exc
            time.sleep(min(2 ** attempt, 8))
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            if attempt == 1:
                raise RuntimeError(last_error) from exc
            time.sleep(2 ** attempt)
    raise RuntimeError(last_error or "fetch failed")


def check_tokens(text: str, tokens: dict[str, list[str]]) -> dict[str, bool]:
    haystack = normalize(text)
    return {field: any(normalize(token) in haystack for token in candidates)
            for field, candidates in tokens.items()}


def main() -> int:
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    urls = sorted({row[field].strip() for row in rows
                   for field in ("reference_url", "sun_reference_url")})
    cache: dict[str, tuple[str, int] | str] = {}
    # A small bounded pool avoids a very long serial run while keeping traffic
    # modest. Each worker retries at most once and has a strict request timeout.
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch_text, url): url for url in urls}
        for future in as_completed(futures):
            url = futures[future]
            try:
                cache[url] = future.result()
            except Exception as exc:
                cache[url] = f"{type(exc).__name__}: {exc}"

    results = []
    for row in rows:
        panchang_url = row["reference_url"].strip()
        sun_url = row["sun_reference_url"].strip()
        panchang_page = cache[panchang_url]
        sun_page = cache[sun_url]
        errors = []
        panchang_tokens = {
            "tithi": [row["expected_tithi"]],
            "nakshatra": [row["expected_nakshatra"]],
            "yoga": [row["expected_yoga"], "Indra" if row["expected_yoga"].casefold() == "aindra" else "Aindra" if row["expected_yoga"].casefold() == "indra" else row["expected_yoga"]],
            "karana": [row["expected_karana"]],
        }
        sun_tokens = {
            "sunrise": time_forms(row["expected_sunrise_local"]),
            "sunset": time_forms(row["expected_sunset_local"]),
        }
        panchang_captcha = not isinstance(panchang_page, str) and (
            "recaptcha" in panchang_page[0].casefold()
            or "solve captcha" in panchang_page[0].casefold()
        )
        sun_captcha = not isinstance(sun_page, str) and (
            "recaptcha" in sun_page[0].casefold()
            or "solve captcha" in sun_page[0].casefold()
        )
        if isinstance(panchang_page, str):
            panchang_checks = {key: False for key in panchang_tokens}
            errors.append(f"panchang_page_unavailable:{panchang_page}")
        elif panchang_captcha:
            panchang_checks = {key: False for key in panchang_tokens}
            errors.append("panchang_page_blocked_by_recaptcha")
        else:
            panchang_checks = check_tokens(panchang_page[0], panchang_tokens)
            if panchang_page[1] != 200:
                errors.append(f"panchang_http_status:{panchang_page[1]}")
        if isinstance(sun_page, str):
            sun_checks = {key: False for key in sun_tokens}
            errors.append(f"sun_page_unavailable:{sun_page}")
        elif sun_captcha:
            sun_checks = {key: False for key in sun_tokens}
            errors.append("sun_page_blocked_by_recaptcha")
        else:
            sun_checks = check_tokens(sun_page[0], sun_tokens)
            if sun_page[1] != 200:
                errors.append(f"sun_http_status:{sun_page[1]}")
        if not panchang_captcha and not isinstance(panchang_page, str):
            for key, present in panchang_checks.items():
                if not present:
                    errors.append(f"panchang_token_not_found:{key}")
        if not sun_captcha and not isinstance(sun_page, str):
            for key, present in sun_checks.items():
                if not present:
                    errors.append(f"sun_token_not_found:{key}")
        results.append({
            "state": row["state"], "place_name": row["place_name"], "date": row["date"],
            "reference_url": panchang_url, "sun_reference_url": sun_url,
            "panchang_tokens_present": panchang_checks, "sun_tokens_present": sun_checks,
            "panchang_visible_text_length": len(panchang_page[0]) if not isinstance(panchang_page, str) else 0,
            "sun_visible_text_length": len(sun_page[0]) if not isinstance(sun_page, str) else 0,
            "panchang_captcha_blocked": panchang_captcha,
            "sun_captcha_blocked": sun_captcha,
            "sun_time_tokens_found": sorted(set(re.findall(r"\b\d{1,2}:\d{2}\s?(?:AM|PM)\b", sun_page[0], re.I))) if not isinstance(sun_page, str) and not sun_captcha else [],
            "sun_label_contexts": [
                sun_page[0][max(0, match.start()-100):match.end()+180]
                for match in list(re.finditer(r"Sunrise|Sunset", sun_page[0], re.I))[-6:]
            ] if not isinstance(sun_page, str) and not sun_captcha else [],
            "panchang_label_contexts": [
                panchang_page[0][max(0, match.start()-100):match.end()+180]
                for match in list(re.finditer(r"Tithi|Tithulu|Nakshatra|Nakshatramulu|Yoga|Yogalu|Karana|Karanamulu", panchang_page[0], re.I))[-12:]
            ] if not isinstance(panchang_page, str) and not panchang_captcha else [],
            "panchang_text_preview": panchang_page[0][:500] if not isinstance(panchang_page, str) else "",
            "sun_text_preview": sun_page[0][:300] if not isinstance(sun_page, str) else "",
            "passed": not errors, "errors": errors,
        })

    unique_urls = len(cache)
    fetched = sum(1 for value in cache.values() if not isinstance(value, str))
    failed = [item for item in results if not item["passed"]]
    report = {
        "test_type": "drik_source_visible_text_token_presence",
        "rows": len(rows), "unique_source_urls": unique_urls, "fetched_source_urls": fetched,
        "passed_rows": len(rows) - len(failed), "failed_rows": len(failed),
        "rows_blocked_by_captcha": sum(1 for item in results if item["panchang_captcha_blocked"] or item["sun_captcha_blocked"]),
        "source_url_fetch_failures": [
            {"url": url, "error": value} for url, value in cache.items() if isinstance(value, str)
        ],
        "results": results,
        "limitations": [
            "This checks token presence in visible page text, not label-to-value semantic association.",
            "A matching token can occur elsewhere on the page; a human review or structured parser is still needed.",
            "A pass does not prove the publisher's astronomical methodology or KAALAM's universal accuracy.",
            "Pages may change over time; archive immutable source snapshots for durable audit evidence.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("rows", "unique_source_urls", "fetched_source_urls", "passed_rows", "failed_rows")}, indent=2))
    if failed:
        print(json.dumps(failed[:20], ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
