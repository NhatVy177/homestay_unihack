import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

// The customer modals render next to the workspace shell, outside .kp-page. This check opens the
// registration form and makes sure it still has a solid background and a readable submit button.
// Visual fixtures only: every /api request is intercepted, all names are made up.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5192';
await mkdir('.ui-screens/customer-register-modal', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const user = { maNguoiDung: 'KH-DEMO', maKhachHang: 'KH-DEMO', hoTen: 'Khách demo', tenDangNhap: 'kh-demo', vaiTro: 'KhachHang' };
const transparent = value => value === 'rgba(0, 0, 0, 0)' || value === 'transparent';

const results = [];
let failed = false;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Đăng ký nhu cầu thuê|Tạo nhu cầu thuê/ }).first().click();
    const modal = page.locator('.kh-register-modal').first();
    await modal.waitFor({ timeout: 8000 });
    const submit = modal.getByRole('button', { name: 'Gửi yêu cầu đăng ký' });
    const check = {
      modalBackground: await modal.evaluate(el => getComputedStyle(el).backgroundColor),
      submitBackground: await submit.evaluate(el => getComputedStyle(el).backgroundColor),
      submitColor: await submit.evaluate(el => getComputedStyle(el).color),
      cancelBorder: await modal.getByRole('button', { name: 'Hủy' }).evaluate(el => getComputedStyle(el).borderTopStyle),
    };
    await page.screenshot({ path: `.ui-screens/customer-register-modal/dang-ky-${width}.png` });
    const ok = !errors.length && !transparent(check.modalBackground) && !transparent(check.submitBackground)
      && check.submitBackground !== check.submitColor;
    failed ||= !ok;
    results.push({ width, ok, ...check, errors });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
console.log(failed ? 'FAIL: customer registration modal' : 'PASS: registration modal has a solid background and a visible submit button at both widths.');
process.exitCode = failed ? 1 : 0;
