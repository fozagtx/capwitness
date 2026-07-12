import os

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("CAPWITNESS_BASE_URL", "http://127.0.0.1:3017")
OPERATOR_TOKEN = "test-only-capwitness-operator-token"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    browser_errors = []
    page.on(
        "console",
        lambda message: browser_errors.append(message.text)
        if message.type == "error"
        else None,
    )

    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    assert page.title().startswith("CAPWitness")
    assert page.get_by_role(
        "heading", name="Stop trusting screenshots. Get a receipt."
    ).is_visible()
    assert page.get_by_text("What’s on the receipt", exact=True).is_visible()
    page.screenshot(path="/tmp/capwitness-home.png", full_page=True)

    page.get_by_role("link", name="Start a check", exact=True).click()
    page.wait_for_url(f"{BASE_URL}/integrate")
    page.get_by_role("heading", name="Set up your check.").wait_for()
    assert page.get_by_label("Target agent ID").input_value() == ""
    assert page.get_by_label("Timeout (ms)").input_value() == ""
    assert page.get_by_label("Input JSON for the target").input_value() == ""
    page.get_by_role("button", name="Build request").click()
    page.locator("p[role='alert']").wait_for()
    page.get_by_label("Target agent ID").fill("browser-test-target")
    page.get_by_label("Timeout (ms)").fill("10000")
    page.get_by_label("Input JSON for the target").fill('{"status":"check"}')
    page.get_by_role("button", name="Build request").click()
    page.get_by_text('"targetServiceId": "browser-test-target"', exact=False).wait_for()

    page.get_by_role("link", name="Console", exact=True).click()
    page.wait_for_url(f"{BASE_URL}/access")
    page.wait_for_load_state("networkidle")
    page.get_by_role("heading", name="Operator console").wait_for()

    page.get_by_role("textbox", name="Access token").fill("incorrect-token")
    page.get_by_role("button", name="Continue").click()
    page.locator("#access-error").wait_for()
    assert "The operator token is incorrect." in page.locator(
        "#access-error"
    ).inner_text()
    browser_errors.clear()  # The intentional 401 is reported by Chromium.

    page.get_by_role("textbox", name="Access token").fill(OPERATOR_TOKEN)
    page.get_by_role("button", name="Continue").click()
    page.wait_for_url(f"{BASE_URL}/console")
    page.wait_for_load_state("networkidle")
    page.get_by_role("heading", name="Setup status").wait_for()
    page.get_by_text("No receipts yet").wait_for()
    assert page.get_by_text("Missing", exact=True).count() >= 1
    page.screenshot(path="/tmp/capwitness-console.png", full_page=True)

    fresh_context = browser.new_context()
    fresh_page = fresh_context.new_page()
    fresh_page.goto(f"{BASE_URL}/console")
    fresh_page.wait_for_load_state("networkidle")
    assert fresh_page.url == f"{BASE_URL}/access"
    assert fresh_page.get_by_role("heading", name="Operator console").is_visible()
    fresh_context.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.goto(BASE_URL)
    mobile.wait_for_load_state("networkidle")
    overflow = mobile.evaluate(
        "document.documentElement.scrollWidth > document.documentElement.clientWidth"
    )
    assert not overflow
    mobile.screenshot(path="/tmp/capwitness-home-mobile.png", full_page=True)
    mobile.close()

    assert not browser_errors, browser_errors
    browser.close()
    print("ui_smoke ok")
