import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
// Link trong thư mời thành viên cư trú mở sẵn form đăng ký, điền sẵn email. API là fixture, không ghi DB.
const base = process.env.UI_BASE_URL || 'http://localhost:5199';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const errors = [];
    await ctx.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ status: 401, json: { message: 'Chưa đăng nhập' } });
      if (!['GET', 'OPTIONS'].includes(route.request().method())) throw new Error(`Unexpected mutation ${path}`);
      return route.fulfill({ json: { data: [] } });
    });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/?dangKy=1&email=lan%2Bx%40example.com`, { waitUntil: 'domcontentloaded' });
    const email = page.locator('input[type="email"]').first();
    await email.waitFor();
    assert.equal(await email.inputValue(), 'lan+x@example.com');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor();
    assert.equal(await page.locator('input[type="email"]').count(), 0, 'không có tham số thì không tự mở form');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS member invite link opens the register form with the email prefilled; fixture APIs only.');
} finally { await browser.close(); }
