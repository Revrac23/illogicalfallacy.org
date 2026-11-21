const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const [buildDir, executablePath] = process.argv.slice(2);
const origin = 'https://illogicalfallacy.org';

async function main() {
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  async function openPage(javaScriptEnabled) {
    const page = await browser.newPage({
      javaScriptEnabled,
      hasTouch: true,
      viewport: { width: 1366, height: 850 },
    });
    page.setDefaultTimeout(2500);
    await page.route(origin + '/**', async route => {
      const { pathname } = new URL(route.request().url());
      const file = path.join(buildDir, pathname, pathname.endsWith('/') ? 'index.html' : '');
      await route.fulfill(fs.existsSync(file) ? { path: file } : { status: 404 });
    });
    return page;
  }

  try {
    const page = await openPage(true);
    const checks = {
      async 'keyboard GET search'() {
        const input = page.getByRole('searchbox', { name: 'Search fallacies' });
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to main content');
        await page.keyboard.press('Enter');
        for (let step = 0; step < 8; step++) {
          if (await input.evaluate(element => element === document.activeElement)) break;
          await page.keyboard.press('Tab');
        }
        assert.ok(await input.evaluate(element => element === document.activeElement));
        const query = 'Maya & straw man?';
        await page.keyboard.insertText(query);
        const [response] = await Promise.all([
          page.waitForNavigation(),
          page.keyboard.press('Enter'),
        ]);
        assert.equal(response.status(), 200);
        const url = new URL(page.url());
        assert.equal(url.pathname, '/fallacies/');
        assert.deepEqual([...url.searchParams], [['q', query]]);
      },

      async 'no-JS homepage search, browse and native practice'() {
        const page = await openPage(false);
        await page.goto(origin);
        for (const [name, pathname] of [
          ['Explore Fallacies', '/fallacies/'],
          ['Browse Categories', '/categories/'],
        ]) {
          const [response] = await Promise.all([
            page.waitForNavigation(),
            page.getByRole('link', { name, exact: true }).click(),
          ]);
          assert.equal(response.status(), 200);
          assert.equal(new URL(page.url()).pathname, pathname);
          await page.goto(origin);
        }

        const disclosures = page.locator('.example-section details');
        assert.equal(await disclosures.count(), 3);
        const labels = await disclosures.locator('summary').allTextContents();
        assert.equal(new Set(labels).size, 3);
        for (const disclosure of await disclosures.all()) {
          const answer = disclosure.locator('p');
          const summary = disclosure.locator('summary');
          assert.equal(await answer.isVisible(), false);
          await summary.focus();
          await page.keyboard.press('Space');
          assert.equal(await answer.isVisible(), true);
          assert.ok((await answer.innerText()).trim().length > 40);
          const reference = answer.getByRole('link');
          await page.keyboard.press('Tab');
          assert.ok(await reference.evaluate(element => element === document.activeElement));
          const response = await page.evaluate(async url => (await fetch(url)).status, await reference.getAttribute('href'));
          assert.equal(response, 200);
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Enter');
          assert.equal(await answer.isVisible(), false);
        }
        assert.equal(await page.locator('form.hero-search').isVisible(), false,
          'The homepage offers search with JavaScript disabled');
        assert.equal(await page.getByRole('searchbox', { name: 'Search fallacies' }).count(), 0);
      },

      async 'mobile layout, search and disclosure'() {
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 844 });
          await page.goto(origin);
          const input = page.getByRole('searchbox', { name: 'Search fallacies' });
          const button = page.getByRole('button', { name: 'Search', exact: true });
          const summary = page.locator('.example-section summary').first();
          await summary.tap();
          assert.equal(await page.locator('.example-section details[open]').count(), 1);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await input.fill('false dilemma');
          await Promise.all([page.waitForNavigation(), button.tap()]);
          assert.equal(new URL(page.url()).searchParams.get('q'), 'false dilemma');
        }
      },

      async 'homepage social image'() {
        const image = await page.locator('meta[property="og:image"]').getAttribute('content');
        assert.equal(new URL(image).origin, origin);
        assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'), image);
        assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
        const response = await page.evaluate(async url => {
          const result = await fetch(url);
          return {
            status: result.status,
            type: result.headers.get('content-type'),
            bytes: Array.from(new Uint8Array(await result.arrayBuffer()).slice(0, 24)),
          };
        }, image);
        assert.equal(response.status, 200);
        assert.match(response.type, /^image\/png/);
        const png = Buffer.from(response.bytes);
        assert.equal(png.readUInt32BE(16), 1200);
        assert.equal(png.readUInt32BE(20), 630);
      },
    };

    for (const [name, check] of Object.entries(checks)) {
      try {
        await page.goto(origin);
        await check();
        console.log('PASS', name);
      } catch (error) {
        process.exitCode = 1;
        console.error('FAIL', name, error.message);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
