import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Nút chia sẻ phòng và danh sách tài khoản dùng thử ở form đăng nhập. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/share-demo';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const room = { maPhong: 'P103', tenPhong: 'Phòng P103', loaiPhong: 'Phòng 4 người', giaNguyenPhong: 7200000, sucChua: 4, soChoTrong: 4, gioiTinhChoPhep: 'Không phân biệt', chiNhanh: 'HomeDorm Thủ Đức', diaChi: '88 Võ Văn Ngân, Thủ Đức' };
try {
  for (const width of [1440, 390]) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base }).catch(() => {});
    await ctx.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path === '/api/trang-chu/kham-pha-phong') return route.fulfill({ json: { data: [room] } });
      if (path === '/api/trang-chu/kham-pha-phong/bo-loc') return route.fulfill({ json: { data: { loaiPhong: [], khuVuc: [] } } });
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/kham-pha-phong?phong=P103`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('dialog').getByRole('button', { name: 'Chia sẻ' }).click();
    const fb = page.getByRole('menuitem', { name: 'Chia sẻ lên Facebook' });
    const href = await fb.getAttribute('href');
    assert.match(href, /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
    assert.ok(decodeURIComponent(href).includes('/kham-pha-phong?phong=P103'), 'link trỏ đúng phòng');
    await page.getByRole('menuitem', { name: /Sao chép link/ }).click();
    await page.getByRole('menuitem', { name: 'Đã sao chép link' }).waitFor();
    await page.screenshot({ path: `${folder}/share-${width}.png` });
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Đăng nhập' }).first().click().catch(async () => {
      await page.locator('.tc-nav-toggle, .tc-menu-toggle, .tc-hamburger').first().click();
      await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
    });
    await page.locator('summary', { hasText: 'Tài khoản dùng thử' }).click();
    await page.getByRole('button', { name: /Kế toán: Đinh Lan Ngọc/ }).click();
    assert.equal(await page.locator('input[name="tenDangNhap"]').first().inputValue(), 'nv0012');
    assert.equal(await page.locator('input[name="matKhau"]').first().inputValue(), '123456');
    await page.screenshot({ path: `${folder}/demo-accounts-${width}.png` });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS share + demo accounts: Facebook share link targets the room, copy link works, demo account fills the login form; fixture APIs only.');
} finally { await browser.close(); }
