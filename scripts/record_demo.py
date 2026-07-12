#!/usr/bin/env python3
"""Record a silent UI walkthrough for demo packaging. Not a live CAP proof."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("CAPWITNESS_BASE_URL", "http://127.0.0.1:3005")
OUT_DIR = Path(os.environ.get("CAPWITNESS_DEMO_DIR", "data/demo"))
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main() -> int:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=str(OUT_DIR),
            record_video_size={"width": 1440, "height": 900},
        )
        page = context.new_page()
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(2500)
        page.locator("#how").scroll_into_view_if_needed()
        page.wait_for_timeout(1500)
        page.get_by_role("link", name="Start a check").first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        page.get_by_role("link", name="Console").first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(1500)
        context.close()
        browser.close()

    videos = sorted(OUT_DIR.glob("*.webm"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not videos:
        print("No video produced", file=sys.stderr)
        return 1
    final = OUT_DIR / "capwitness-ui-walkthrough.webm"
    videos[0].replace(final)
    print(final)
    print(
        "UI-only recording. Splice a real CAP hire before DoraHacks submit.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
