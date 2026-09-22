import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failed = [];
page.on('requestfailed', (req) => failed.push(req.url() + ' :: ' + req.failure()?.errorText));
page.on('response', (res) => {
  if (res.url().includes('fontawesome') || res.url().includes('webfont') || /\.(woff2?|ttf)(\?|$)/.test(res.url())) {
    console.log('FONT RESOURCE:', res.status(), res.url());
  }
});

await page.goto('http://localhost:4302/auth/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const i = document.querySelector('.auth-brand__logo-badge i');
  if (!i) return { found: false };
  const cs = getComputedStyle(i);
  const before = getComputedStyle(i, '::before');
  return {
    found: true,
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    beforeContent: before.content,
    beforeFontFamily: before.fontFamily,
  };
});
console.log('Icon element info:', JSON.stringify(info, null, 2));
console.log('Failed requests:', JSON.stringify(failed, null, 2));

await browser.close();
