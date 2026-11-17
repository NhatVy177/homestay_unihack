import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5191';
const output = resolve('.ui-screens/home-effects/motion');
await mkdir(output, { recursive: true });
const branches = ['HomeDorm Quận 1', 'HomeDorm Bình Thạnh', 'HomeDorm Thủ Đức'];
const rooms = Array.from({ length: 6 }, (_, index) => ({ MaPhong: `UI-${index + 1}`, TenPhong: `Phòng P${Math.floor(index / 3) + 1}01`, TenChiNhanh: branches[index % 3], MaLoaiPhong: 'LP0002', TenLoaiPhong: 'Phòng 2 người', GiaThueTheoGiuong: 2200000, SucChuaToiDa: 2 }));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const results = [];
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
try {
  for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const errors = [];
    const writes = [];
    await context.route('**/api/**', route => {
      const request = route.request(); const path = new URL(request.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + path);
      return route.fulfill({ json: { data: path.endsWith('/bo-loc') ? { khuVuc: branches.map(tenChiNhanh => ({ tenChiNhanh })), loaiPhong: ['Phòng 2 người'] } : rooms } });
    });
    await context.route('https://tiles.openfreemap.org/**', route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8ede7' } }] } }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.hx-room-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const active = () => page.locator('.hx-hero-slide.is-active img').getAttribute('src');
    const initial = await active();
    const animationName = await page.locator('.hx-hero-slide.is-active img').evaluate(element => getComputedStyle(element).animationName);
    assert.equal(animationName, reduced ? 'none' : 'hx-ken-burns');
    const startTransform = await page.locator('.hx-hero-slide.is-active img').evaluate(element => getComputedStyle(element).transform);
    await page.waitForTimeout(6500);
    if (reduced) assert.equal(await active(), initial, 'reduced motion must not autoplay');
    else {
      assert.notEqual(await active(), initial, 'hero must autoplay');
      assert.notEqual(await page.locator('.hx-hero-slide.is-active img').evaluate(element => getComputedStyle(element).transform), startTransform, 'hero zoom must move');
    }
    await page.getByRole('button', { name: 'Tạm dừng chuyển ảnh', exact: true }).click();
    await page.mouse.move(0, 0); await page.locator('.tc-logo').first().focus();
    const pausedImage = await active(); await page.waitForTimeout(6200);
    assert.equal(await active(), pausedImage, 'manual pause must persist after pointer and focus leave');
    await page.screenshot({ path: resolve(output, `hero-${reduced ? 'reduced' : 'animated'}.png`) });

    const gallery = page.locator('.hx-curved-gallery');
    await page.locator('.hx-gallery-section').scrollIntoViewIfNeeded();
    await page.locator('.hx-curved-gallery[data-ready=true]').waitFor();
    await page.waitForTimeout(700);
    const before = Number(await gallery.getAttribute('data-offset'));
    await page.waitForTimeout(450);
    const afterAutoplay = Number(await gallery.getAttribute('data-offset'));
    if (reduced) assert.equal(afterAutoplay, before, 'reduced motion must keep the gallery stationary');
    else assert.ok(afterAutoplay < before, 'gallery must automatically travel from right to left');
    const bounds = await gallery.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .5);
    await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .25, bounds.y + bounds.height * .5, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(350);
    assert.ok(Math.abs(Number(await gallery.getAttribute('data-offset')) - before) > 1, 'gallery drag must move actual mesh');
    await gallery.focus(); const offset = Number(await gallery.getAttribute('data-offset')); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
    assert.notEqual(Number(await gallery.getAttribute('data-offset')), offset, 'gallery must support keyboard');
    await gallery.screenshot({ path: resolve(output, `gallery-${reduced ? 'reduced' : 'animated'}.png`) });

    await page.locator('#phong-noi-bat').scrollIntoViewIfNeeded(); await page.waitForTimeout(reduced ? 100 : 1100);
    const card = page.locator('.hx-room-card').first(); const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * .9, box.y + box.height * .25);
    const tilt = await card.evaluate(element => element.style.getPropertyValue('--ry'));
    assert.equal(Boolean(tilt), !reduced, 'tilt must follow mouse only when motion is enabled');
    if (!reduced) assert.notEqual(tilt, '0deg');
    await page.mouse.move(0, 0);

    await page.locator('#gioi-thieu').scrollIntoViewIfNeeded();
    const house = page.locator('.hx-house-scene[data-ready=true]'); await house.waitFor(); await page.waitForTimeout(600);
    const closed = digest(await house.screenshot());
    await page.getByRole('button', { name: 'Mở các căn', exact: true }).click(); await page.waitForTimeout(1000);
    assert.equal(await house.getAttribute('data-expanded'), 'true');
    const opened = await house.screenshot({ path: resolve(output, `house-open-${reduced ? 'reduced' : 'animated'}.png`) });
    assert.notEqual(digest(opened), closed, 'opening house must change actual rendered geometry');
    const houseBox = await house.boundingBox();
    await page.mouse.move(houseBox.x + houseBox.width * .6, houseBox.y + houseBox.height * .5); await page.mouse.down(); await page.mouse.move(houseBox.x + houseBox.width * .3, houseBox.y + houseBox.height * .5, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(500);
    assert.notEqual(digest(await house.screenshot()), digest(opened), 'house drag must rotate rendered model');
    await page.getByRole('button', { name: 'Chi nhánh tiếp theo', exact: true }).click();
    assert.match(await page.locator('.hx-house-toolbar h3').innerText(), /Bình Thạnh/);
    await page.getByRole('button', { name: 'Gộp lại', exact: true }).click(); await page.waitForTimeout(700);
    assert.equal(await house.getAttribute('data-expanded'), 'false');

    await page.locator('#vi-tri').scrollIntoViewIfNeeded(); await page.locator('.hx-live-map[data-ready=true]').waitFor();
    assert.equal(await page.locator('.hx-map-marker').count(), 3);
    await page.getByRole('button', { name: 'Chuyển bản đồ 3D', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Chuyển bản đồ 3D', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.locator('.hx-map-item').nth(1).click();
    assert.match(await page.locator('.hx-map-detail strong').innerText(), /Bình Thạnh/);
    await page.getByRole('button', { name: 'Mở tư vấn', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: 'Tư vấn phòng' }).isVisible(), true);
    assert.equal(await page.getByRole('dialog', { name: 'Tư vấn phòng' }).getByRole('link', { name: '0795749721', exact: true }).getAttribute('href'), 'tel:0795749721');
    assert.equal(await page.locator('a[href^="tel:"]').evaluateAll(links => links.length === 4 && links.every(link => link.getAttribute('href') === 'tel:0795749721')), true, 'all homepage phone links must use the supplied contact number');
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog', { name: 'Tư vấn phòng' }).count(), 0);
    await page.getByRole('button', { name: 'Điều khoản và chính sách bảo mật', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: 'Điều khoản và chính sách bảo mật' }).isVisible(), true);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    results.push({ reduced, heroAnimation: animationName, autoplay: reduced ? 'disabled' : 'passed', pause: 'passed', gallery: 'right-to-left autoplay, drag and keyboard passed', cardTilt: 'passed', house: 'geometry explosion, rotation, branch switch passed', map: '3 markers, select and 3D passed (fixture style)', contact: '0795749721 text and all 4 telephone links passed', policy: 'passed', errors, writes });
    console.log(`PASS motion ${reduced ? 'reduced' : 'enabled'}`);
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'report.json'), JSON.stringify(results, null, 2)); }
