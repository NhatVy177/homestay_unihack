import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

// Read-only visual fixtures. Never submit credentials or write to the real API.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5191';
const output = resolve('.ui-screens/home-effects/layout');
await mkdir(output, { recursive: true });
const rooms = [
  { MaPhong: 'UI-1', TenPhong: 'Phòng minh họa 101', MaLoaiPhong: 'LP0002', TenLoaiPhong: 'Phòng 2 người', TenChiNhanh: 'Chi nhánh minh họa', SucChuaToiDa: 2, GiaThueTheoGiuong: 2200000 },
  { MaPhong: 'UI-2', TenPhong: 'Phòng minh họa 102', MaLoaiPhong: 'LP0001', TenLoaiPhong: 'Phòng 4 người', TenChiNhanh: 'Chi nhánh minh họa', SucChuaToiDa: 4, GiaThueTheoGiuong: 1800000 },
  { MaPhong: 'UI-3', TenPhong: 'Phòng minh họa 103', MaLoaiPhong: 'LP0004', TenLoaiPhong: 'Phòng VIP 2 người', TenChiNhanh: 'Chi nhánh minh họa', SucChuaToiDa: 2, GiaThueTheoGiuong: 3500000, UrlImg: '/missing-room-image-for-ui-fixture.jpg' },
];
const branchNames = ['HomeDorm Quận 1', 'HomeDorm Bình Thạnh', 'HomeDorm Thủ Đức'];
const addresses = ['12 Nguyễn Trãi, Quận 1, TP.HCM', '45 Điện Biên Phủ, Bình Thạnh, TP.HCM', '88 Võ Văn Ngân, Thủ Đức, TP.HCM'];
rooms.forEach((room, index) => { room.TenChiNhanh = branchNames[index]; room.DiaChi = addresses[index]; });
rooms.push(...rooms.map((room, index) => ({ ...room, MaPhong: `UI-${index + 4}`, TenPhong: `Phòng minh họa ${index + 104}` })));
const filterData = { khuVuc: branchNames.map((name, index) => ({ tenChiNhanh: name, diaChi: addresses[index] })), loaiPhong: [{ maLoaiPhong: 'LP0001', tenLoaiPhong: 'Phòng 2 người' }] };
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const report = [];

async function capture(page, name) {
  await page.evaluate(async () => {
    for (let top = 0; top < document.documentElement.scrollHeight; top += 650) {
      scrollTo(0, top);
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    scrollTo(0, 0);
    await document.fonts.ready;
  });
  for (const selector of ['.hx-curved-gallery[data-ready=true]', '.hx-house-scene[data-ready=true]', '.hx-live-map[data-ready=true]']) await page.locator(selector).waitFor({ state: 'attached' });
  await page.waitForTimeout(300);
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter(img => !img.naturalWidth).map(img => img.getAttribute('src')),
    overflowing: [...document.querySelectorAll('header *, main *, footer *')].filter(element => {
      // The mobile branch list intentionally scrolls horizontally inside its own panel.
      if (element.closest('.hx-map-list, .maplibregl-control-container, .maplibregl-marker')) return false;
      const box = element.getBoundingClientRect();
      return box.width && (box.right > innerWidth + 1 || box.left < -1) && getComputedStyle(element).position !== 'absolute';
    }).map(element => element.className),
  }));
  assert.equal(metrics.scrollWidth, metrics.width, `${name}: document overflow`);
  assert.deepEqual(metrics.brokenImages, [], `${name}: broken image`);
  assert.deepEqual(metrics.overflowing, [], `${name}: clipped content`);
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
  return metrics;
}

try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    const writes = [];
    await context.route('**/api/**', route => {
      const request = route.request();
      if (!new URL(request.url()).pathname.startsWith('/api/')) return route.fallback();
      if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      const path = new URL(request.url()).pathname;
      const data = path.endsWith('/bo-loc') ? filterData : path.endsWith('/phong-noi-bat') ? rooms.slice(0, 3) : path.endsWith('/kham-pha-phong') ? rooms : [];
      return route.fulfill({ json: { data } });
    });
    await context.route('https://tiles.openfreemap.org/**', route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8ede7' } }] } }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.tc-room-card').first().waitFor();
    assert.equal(await page.locator('.tc-room-card').count(), 4);
    assert.equal(await page.locator('#gioi-thieu').count(), 1);
    const metrics = await capture(page, `verified-${width}`);

    await page.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click();
    assert.equal(await page.locator('.hx-hero-slide.is-active .tc-hero-photo').getAttribute('src'), '/images/home/living.jpg');
    await page.getByRole('button', { name: 'Ảnh trước', exact: true }).click();
    assert.equal(await page.locator('.hx-hero-slide.is-active .tc-hero-photo').getAttribute('src'), '/images/home/hero.jpg');
    await page.getByRole('button', { name: 'Xem ảnh 3', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Xem ảnh 3', exact: true }).getAttribute('aria-pressed'), 'true');

    if (width <= 768) {
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      assert.equal(await page.locator('#tc-public-menu').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#tc-public-menu').isVisible(), false);
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await page.locator('#tc-public-menu').getByRole('link', { name: 'Giới thiệu', exact: true }).click();
      assert.equal(await page.locator('#tc-public-menu').isVisible(), false);
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await page.getByRole('button', { name: 'Đăng ký tài khoản', exact: true }).click();
    } else {
      await page.locator('.tc-nav-actions').getByRole('button', { name: 'Đăng ký', exact: true }).click();
    }
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.locator('.tc-nav-actions').getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await capture(page, `login-${width}`);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);

    for (const [index, label] of [[0, 'Thủ Đức'], [1, 'Phòng 4 người'], [2, 'Dưới 2 triệu']]) {
      await page.locator('.tc-search-dropdown-toggle').nth(index).click();
      await page.getByRole('option', { name: label, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    let url = new URL(page.url());
    assert.equal(url.pathname, '/kham-pha-phong');
    assert.equal(url.searchParams.get('khuVuc'), 'Thủ Đức');
    assert.equal(url.searchParams.get('loaiPhong'), 'Phòng 4 người');
    assert.equal(url.searchParams.get('mucGiaToiDa'), '2000000');
    await page.goto(base);
    await page.locator('.tc-room-cta').first().click();
    assert.equal(new URL(page.url()).searchParams.get('phong'), 'UI-1');
    await page.goto(base);
    await page.locator('.hx-map-item').filter({ hasText: 'Bình Thạnh' }).click();
    await page.locator('.hx-map-detail').getByRole('button', { name: 'Xem các phòng', exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get('khuVuc'), 'Bình Thạnh');
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    report.push({ width, ...metrics, errors, writes, interactions: 'slider, menu, auth modals, search, room detail, area link passed' });
    console.log(`PASS ${width}px`);
    await context.close();
  }
  for (const state of ['empty', 'error']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/api/**', route => new URL(route.request().url()).pathname.startsWith('/api/')
      ? route.fulfill({ status: state === 'error' ? 503 : 200, json: { data: [] } }) : route.fallback());
    await page.route('https://tiles.openfreemap.org/**', route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8ede7' } }] } }));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.tc-rooms-empty').waitFor();
    assert.equal(await page.locator('.tc-rooms-empty').isVisible(), true);
    assert.equal(await page.locator('.tc-room-card').count(), 0);
    await capture(page, state);
    report.push({ state, result: 'empty state shown without fabricated rooms' });
    console.log(`PASS ${state}`);
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
}
