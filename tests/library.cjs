const assert = require("node:assert/strict");
const { homedir } = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const base = process.env.LIBRARY_BASE_URL || "http://127.0.0.1:4172";
const library = `${base}/fallacies/`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ||
      path.join(homedir(), ".hermes/tools/chromium-1248/chrome-linux64/chrome"),
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(2500);
  const input = page.getByRole("searchbox");
  const status = page.locator("#results-status");
  const titles = () => page.locator("#search-results article:visible h2").allTextContents()
    .then(items => items.map(title => title.trim()));
  const category = name => page.locator(".filter-list").getByText(name, { exact: true });
  const params = () => new URL(page.url()).searchParams;

  async function ready(url = library) {
    const fetched = page.waitForResponse(response => response.url() === `${library}index.json`);
    await page.goto(url);
    await (await fetched).finished();
    await status.filter({ hasText: "Showing" }).waitFor();
  }

  async function check(name, test) {
    try {
      await test();
      console.log(`PASS ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}\n${error.stack}`);
      process.exitCode = 1;
    }
  }

  try {
    await ready();
    await check("default alphabetical order and canonical library URL", async () => {
      const all = await titles();
      assert.ok(all.length > 4);
      assert.deepEqual(all, [...all].sort((a, b) => a.localeCompare(b)));
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),
        "https://illogicalfallacy.org/fallacies/");
    });

    for (const [query, title] of [
      ["strawman", "Straw Man"],
      ["AD-HOMINEM", "Ad Hominem"],
      ["gamblers fallacy", "Gambler's Fallacy"],
      ["gambler’s fallacy", "Gambler's Fallacy"],
      ["  ad   hominem  ", "Ad Hominem"],
      ["personal attack", "Ad Hominem"]
    ]) {
      await check(`first result for ${query}`, async () => {
        await input.fill(query);
        assert.equal((await titles())[0], title);
      });
    }

    await check("full-text search reuses the rendered card and its canonical link", async () => {
      const card = page.locator('#search-results article:has(a[href="/fallacies/straw-man/"])');
      const renderedCard = await card.elementHandle();
      await input.fill("defenseless");
      assert.deepEqual(await titles(), ["Straw Man"]);
      assert.ok(await card.evaluate((element, original) => element === original, renderedCard));
      await renderedCard.dispose();
    });

    await check("deep link, reload, keyboard focus and history", async () => {
      await ready(`${library}?q=fallacy&category=probability`);
      assert.equal(await input.inputValue(), "fallacy");
      assert.equal(await category("Probability").getAttribute("aria-current"), "true");
      assert.ok((await titles()).includes("Gambler's Fallacy"));
      assert.ok(!(await titles()).includes("Straw Man"));

      await page.reload();
      assert.equal(await input.inputValue(), "fallacy");
      const length = await page.evaluate(() => history.length);
      await input.fill("");
      await input.pressSequentially("gamblers fallacy");
      assert.equal(await page.evaluate(() => history.length), length);
      assert.equal(params().get("q"), "gamblers fallacy");
      assert.ok(await input.evaluate(el => el === document.activeElement));

      const all = category("All categories");
      await all.focus();
      await all.press("Enter");
      assert.ok(await all.evaluate(el => el === document.activeElement));
      assert.equal(params().get("category"), null);
      assert.equal(params().get("q"), "gamblers fallacy");
      await page.goBack();
      assert.equal(params().get("category"), "probability");
      assert.equal(await category("Probability").getAttribute("aria-current"), "true");
      await page.goForward();
      assert.equal(await all.getAttribute("aria-current"), "true");
      assert.equal(await input.inputValue(), "gamblers fallacy");

      await input.fill("zzzz-no-match");
      assert.equal((await titles()).length, 0);
      await page.locator("#no-results").waitFor();
      const reset = page.getByRole("button", { name: "Reset filters" });
      await reset.click();
      assert.ok(await reset.evaluate(el => el === document.activeElement));
      assert.equal(page.url(), library);
      assert.equal(await input.inputValue(), "");
      assert.ok((await titles()).length > 4);
    });

    await check("loading and HTTP failure preserve basic search and categories", async () => {
      let finishRequest;
      const requestHeld = new Promise(resolve => { finishRequest = resolve; });
      await page.route("**/fallacies/index.json", async route => {
        await requestHeld;
        await route.fulfill({ status: 503, body: "Unavailable" });
      });
      try {
        await page.goto(`${library}?q=gambler%E2%80%99s&category=probability`);
        await status.filter({ hasText: /loading/i }).waitFor();
        assert.deepEqual(await titles(), ["Gambler's Fallacy"]);
      } finally {
        finishRequest();
      }
      await status.filter({ hasText: /unavailable/i }).waitFor();
      await category("All categories").click();
      await input.fill("personal attack");
      assert.equal((await titles())[0], "Ad Hominem");
      await input.fill("");
      await category("Probability").click();
      assert.equal((await titles()).length, 4);
    });

    await check("rendered cards and category links work without JavaScript", async () => {
      const basic = await browser.newPage({ javaScriptEnabled: false });
      basic.setDefaultTimeout(2500);
      try {
        await basic.goto(library);
        assert.ok(await basic.locator('#search-results a[href="/fallacies/straw-man/"]').isVisible());
        await basic.locator(".filter-list").getByRole("link", { name: "Probability", exact: true }).click();
        assert.equal(new URL(basic.url()).pathname, "/categories/probability/");
      } finally {
        await basic.close();
      }
    });
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
