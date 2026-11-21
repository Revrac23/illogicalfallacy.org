const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');

const executablePath = process.argv[2];
const staticDir = path.join(__dirname, '..', 'static');

async function render() {
  const favicon = await fs.readFile(path.join(staticDir, 'favicon.svg'));
  const icon = 'data:image/svg+xml;base64,' + favicon.toString('base64');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(`
      <!doctype html>
      <html lang="en">
      <meta charset="utf-8">
      <title>Illogical Fallacy social preview</title>
      <style>
        body {
          box-sizing: border-box;
          margin: 0;
          height: 630px;
          padding: 72px 88px;
          border-left: 14px solid #b33a2e;
          background: #f8f7f4;
          color: #202020;
          font-family: "DejaVu Sans", sans-serif;
        }
        header { display: flex; align-items: center; gap: 24px; font-size: 32px; font-weight: 800; }
        h1 { margin: 54px 0 20px; font-size: 86px; line-height: 1.05; letter-spacing: -5px; }
        h1 span { color: #b33a2e; }
        p { margin: 0; font-size: 29px; color: #595955; }
      </style>
      <header><img src="${icon}" width="64" height="64" alt="">Illogical Fallacy</header>
      <h1>Learn to recognize<br><span>bad arguments.</span></h1>
      <p>A practical reference guide to logical fallacies.</p>
      </html>
    `);
    await page.screenshot({ path: path.join(staticDir, 'social-preview.png') });
  } finally {
    await browser.close();
  }
}

render().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
