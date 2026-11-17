import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Trang công khai Danh sách phòng (/phong) và Dịch vụ (/dich-vu): lọc theo chi nhánh, lọc dịch vụ, liên kết từ trang chủ. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/public-pages';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const room = (id, branch, price) => ({ MaPhong: id, TenPhong: `Phòng ${id}`, TenLoaiPhong: 'Phòng 2 người', TenChiNhanh: branch, GiaThueNguyenPhong: price, SucChuaToiDa: 2 });
const rooms = [room('P1', 'Quận 1', 2200000), room('P2', 'Quận 1', 1800000), room('P3', 'Quận 7', 1500000)];
const services = [
  { maDichVu: 'DV1', tenDichVu: 'Điện', donViTinh: 'kWh', donGia: 4000 }, { maDichVu: 'DV2', tenDichVu: 'Wifi', donViTinh: 'tháng', donGia: 100000 },
  { maDichVu: 'DV3', tenDichVu: 'Gửi xe', donViTinh: 'tháng', donGia: 150000 }, { maDichVu: 'DV4', tenDichVu: 'Vệ sinh', donViTinh: 'tháng', donGia: 250000 },
];
try {
  for (const width of [1440, 390]) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await ctx.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path === '/api/trang-chu/dich-vu') return route.fulfill({ json: { data: services } });
      if (path === '/api/trang-chu/kham-pha-phong' || path === '/api/trang-chu/phong-noi-bat') return route.fulfill({ json: { data: rooms } });
      if (path === '/api/trang-chu/kham-pha-phong/bo-loc') return route.fulfill({ json: { data: { khuVuc: [], loaiPhong: [] } } });
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#phong-noi-bat').getByRole('button', { name: /Xem tất cả phòng/ }).click();
    await page.waitForURL('**/phong');
    await page.getByRole('heading', { name: 'Danh sách phòng' }).waitFor();
    assert.equal(await page.locator('.dsp-back').count(), 0, 'không có nút trở về cổng khách khi mở từ trang chủ');
    assert.equal(await page.locator('.hx-room-card').count(), 3);
    assert.match(await page.locator('.dsp-head').innerText(), /3 phòng/);
    await page.getByRole('button', { name: 'Quận 7' }).click();
    assert.equal(await page.locator('.hx-room-card').count(), 1);
    assert.match(await page.locator('.dsp-head').innerText(), /1 phòng/);
    assert.equal(await page.getByRole('button', { name: 'Quận 7' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByText('Lịch', { exact: true }).count(), 0, 'không có tab Lịch');
    await page.screenshot({ path: `${folder}/phong-${width}.png` });
    await page.locator('.hx-room-card .hx-room-view').first().click();
    await page.waitForURL('**/phong/P3');
    await page.goto(`${base}/dich-vu`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Dịch vụ & tiện ích' }).waitFor();
    assert.equal(await page.locator('.dv-card').count(), 4);
    assert.match(await page.locator('.dv-stats').innerText(), /4 dịch vụ/);
    await page.getByLabel('Tìm kiếm dịch vụ').fill('wifi');
    assert.equal(await page.locator('.dv-card').count(), 1);
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await page.getByLabel('Khoảng giá').selectOption('low');
    assert.deepEqual(await page.locator('.dv-card h2').allInnerTexts(), ['Điện']);
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await page.getByLabel('Hình thức phí').selectOption('Theo chỉ số');
    assert.deepEqual(await page.locator('.dv-card h2').allInnerTexts(), ['Điện']);
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    assert.equal(await page.locator('.dv-card').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `${folder}/dich-vu-${width}.png` });
    await page.goto(`${base}/dich-vu`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
    await page.waitForURL('**/?auth=login');
    await page.getByRole('dialog').waitFor();
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS public pages: /phong lists rooms with branch chips and no calendar tab, /dich-vu filters by search, price band and fee type, login opens from sub-pages; fixture APIs only.');
} finally { await browser.close(); }
