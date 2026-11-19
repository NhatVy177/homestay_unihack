import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const app = process.env.ASSET_UI_URL || 'http://127.0.0.1:5196';
const api = process.env.ASSET_API_URL || 'http://127.0.0.1:5026/api';
const username = process.env.ASSET_DEMO_USER || 'demo-quan-ly';
const password = process.env.ASSET_DEMO_PASSWORD;
if (!password) throw new Error('Set ASSET_DEMO_PASSWORD for the disposable/demo database account.');

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });

try {
  const login = await page.request.post(`${api}/auth/dang-nhap`, { data: { tenDangNhap: username, matKhau: password } });
  assert.equal(login.ok(), true, `demo login failed: ${login.status()} ${await login.text()}`);
  const session = await login.json();
  await page.addInitScript((value) => localStorage.setItem('happyroom_session', JSON.stringify({ ...value, _v: 2 })), session);

  await page.goto(`${app}/nhan-vien-quan-ly?tab=dieu-phoi-tai-san`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('main').getByRole('heading', { name: 'Điều phối tài sản', exact: true }).waitFor();
  await page.getByText('Phòng P203', { exact: true }).waitFor();

  const occupiedCards = page.locator('.asset-room.is-occupied');
  assert.ok(await occupiedCards.count() >= 2, 'occupied rooms must be visibly marked');
  for (let index = 0; index < await occupiedCards.count(); index += 1) {
    const buttons = occupiedCards.nth(index).getByRole('button');
    for (let button = 0; button < await buttons.count(); button += 1) assert.equal(await buttons.nth(button).isDisabled(), true);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'desktop page overflows horizontally');

  const stamp = Date.now();
  const form = page.locator('#asset-transfer-form');
  const selects = form.locator('select');
  await selects.nth(0).selectOption('PHONG_KHO');
  await selects.nth(1).selectOption('P203');
  await selects.nth(2).selectOption('TS0001');
  await form.locator('input[type="number"]').fill('1');
  await form.locator('textarea').fill(`UI ${stamp}: phòng sang kho`);
  await form.getByRole('button', { name: 'Xác nhận điều chuyển' }).click();
  await page.getByText('Đã điều chuyển tài sản và ghi đúng một dòng lịch sử.').waitFor();
  await page.getByText(`UI ${stamp}: phòng sang kho`).waitFor();

  await form.locator('select').nth(0).selectOption('KHO_PHONG');
  await form.locator('select').nth(1).selectOption('P301');
  await form.locator('select').nth(2).selectOption('TS0001');
  await form.locator('input[type="number"]').fill('1');
  await form.locator('textarea').fill(`UI ${stamp}: kho sang phòng`);
  await form.getByRole('button', { name: 'Xác nhận điều chuyển' }).click();
  await page.getByText(`UI ${stamp}: kho sang phòng`).waitFor();
  assert.equal(await page.getByText(new RegExp(`UI ${stamp}:`)).count(), 2, 'two transfers must render as two history rows');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('main').getByRole('heading', { name: 'Điều phối tài sản', exact: true }).scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '390px page overflows horizontally');
  assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join(' | ')}`);
  console.log('PASS: real demo SQL, room → warehouse → empty room, two history rows, occupied-room lock, 1440px/390px, no browser errors.');
} finally {
  await browser.close();
}
