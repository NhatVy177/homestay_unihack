import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5200';
const output = resolve('.ui-screens/house-layout');
await mkdir(output, { recursive: true });
const branches = ['HomeDorm Quận 1', 'HomeDorm Bình Thạnh', 'HomeDorm Thủ Đức', 'Chi nhánh chưa có phòng', 'Chi nhánh chưa rõ tầng'];
const room = (id, name, branch) => ({ MaPhong: id, TenPhong: name, TenChiNhanh: branches[branch],
  DiaChi: branches[branch], GiaThueTheoGiuong: 2200000, MaLoaiPhong: 'LP0002', UrlImg: '/images/home/hero.jpg' });
const rooms = [room('P101', 'Phòng P101', 0), room('P104', 'Phòng P201', 0),
  ...Array.from({ length: 6 }, (_, i) => room(`P4${String(i).padStart(2, '0')}`, `Phòng P40${i + 1}`, 0)),
  room('P921', 'Phòng thử chưa đánh số', 0),
  room('P201', 'Phòng P101', 1), room('P204', 'Phòng P201', 1),
  room('P301', 'Phòng P101', 2), room('P941', 'Phòng thử chưa rõ tầng', 4)];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const hash = value => createHash('sha256').update(value).digest('hex');
const report = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], writes = [];
    await context.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (!['GET', 'OPTIONS'].includes(req.method())) writes.push(req.method() + ' ' + path);
      const data = path.endsWith('/bo-loc') ? { khuVuc: branches.map(tenChiNhanh => ({ tenChiNhanh })), loaiPhong: [] }
        : path.endsWith('/phong-noi-bat') ? rooms.slice(0, 3) : path.endsWith('/kham-pha-phong') ? rooms : {};
      return route.fulfill({ json: { data } });
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('.hx-house-panel'); await panel.scrollIntoViewIfNeeded();
    const scene = panel.locator('.hx-house-scene');
    await panel.locator('.hx-house-scene[data-ready=true]').waitFor();
    assert.equal(await scene.getAttribute('data-floor-count'), '4');
    assert.equal(await scene.getAttribute('data-room-count'), '8');
    assert.equal(await panel.locator('.hx-house-summary').innerText(), '4 tầng · 9 phòng');
    assert.deepEqual((await panel.locator('.hx-house-floors button').allInnerTexts()).map(text => text.replace(/\s+/g, '')),
      ['Tầng11phòng', 'Tầng21phòng', 'Tầng30phòng', 'Tầng46phòng', 'Chưarõtầng1phòng']);
    await panel.getByRole('button', { name: 'Tầng 4', exact: false }).click();
    assert.equal(await panel.locator('.hx-house-rooms button').count(), 6);
    const closed = hash(await scene.screenshot());
    await panel.getByRole('button', { name: 'Mở các căn', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.hx-house-scene')?.dataset.expanded === 'true');
    await page.waitForTimeout(250);
    const opened = await scene.screenshot(); assert.notEqual(hash(opened), closed);
    await panel.screenshot({ path: resolve(output, `four-floors-open-${width}.png`) });
    await panel.getByRole('button', { name: 'Tầng 3', exact: false }).click();
    assert.equal(await panel.locator('.hx-house-rooms button').count(), 0);
    assert.match(await panel.locator('.hx-house-empty').innerText(), /Chưa có phòng tầng 3/);
    await panel.locator('.hx-house-floors').getByRole('button', { name: 'Chưa rõ tầng', exact: false }).click();
    assert.equal(await panel.locator('.hx-house-rooms button').count(), 1);
    await panel.getByRole('button', { name: 'Chi nhánh tiếp theo', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.hx-house-scene')?.dataset.floorCount === '2' && document.querySelector('.hx-house-scene')?.dataset.ready === 'true');
    assert.equal(await scene.getAttribute('data-room-count'), '2');
    assert.match(await panel.locator('.hx-house-rooms').innerText(), /P101/);
    assert.equal(await panel.locator('.hx-house-floors button[aria-pressed=true]').count(), 1);
    await panel.getByRole('button', { name: 'Chi nhánh tiếp theo', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.hx-house-scene')?.dataset.floorCount === '1' && document.querySelector('.hx-house-scene')?.dataset.ready === 'true');
    assert.equal(await scene.getAttribute('data-room-count'), '1');
    await panel.screenshot({ path: resolve(output, `one-floor-${width}.png`) });
    await panel.getByRole('button', { name: 'Chi nhánh tiếp theo', exact: true }).click();
    assert.equal(await scene.getAttribute('data-floor-count'), '0');
    assert.equal(await scene.locator('canvas').count(), 0);
    assert.match(await panel.locator('.hx-house-summary').innerText(), /Chưa có dữ liệu phòng/);
    assert.equal(await panel.locator('.hx-house-expand').isDisabled(), true);
    await panel.getByRole('button', { name: 'Chi nhánh tiếp theo', exact: true }).click();
    assert.equal(await scene.getAttribute('data-floor-count'), '0');
    assert.equal(await scene.locator('canvas').count(), 0);
    assert.equal(await panel.locator('.hx-house-rooms button').count(), 1);
    await panel.getByRole('button', { name: `Xem ${branches[0]}`, exact: true }).click();
    await panel.getByRole('button', { name: 'Tầng 4', exact: false }).click();
    await panel.locator('.hx-house-rooms button').first().click();
    assert.equal(new URL(page.url()).pathname, '/phong/P400', 'navigation must use the real ID even when the display number differs');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    report.push({ width, floors: '4→2→1→empty→unknown', rooms: '8→2→1→0; unassigned retained', renderedExpansion: true, errors, writes });
    console.log(`PASS branch floors/rooms ${width}px`); await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2)); }
