import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5192';
const output = resolve('.ui-screens/public-room-detail');
await mkdir(output, { recursive: true });
const images = ['hero', 'room', 'living', 'dorm', 'hero'].map((name, index) => ({ stt: index + 1, urlAnh: `/images/home/${name}.jpg`, moTa: `Ảnh kiểm tra ${index + 1}` }));
const room = { id: 'P101', maPhong: 'P101', tenPhong: 'Phòng UI 101', loaiPhong: 'Phòng 2 người', chiNhanh: 'HomeDorm Quận 1', diaChi: '12 Nguyễn Trãi, Quận 1, TP.HCM', sucChua: 2, tang: 1, giaThue: 2200000, giaTheoGiuong: 2200000, giaThueTheoGiuong: 2200000, soChoTrong: 2, anhDai: images[0].urlAnh, hinhAnh: images, tienNghi: [{ maTaiSan: 'TS01', tenTienNghi: 'Giường', soLuong: 2 }], dichVuUocTinh: [{ maDichVu: 'DV01', tenDichVu: 'Điện', donGia: 4000, donViTinh: 'kWh' }] };
const user = { maNguoiDung: 'UI-KH', maKhachHang: 'UI-KH', vaiTro: 'KhachHang', hoTen: 'Khách UI' };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = [];
let responseMode = 'ok';
let locked = false;
async function contextFor(width, authenticated = false) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; const writes = [];
  if (authenticated) await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
  await context.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return route.fallback();
    if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + path);
    if (path === '/api/auth/toi') return route.fulfill({ json: user });
    if (path === '/api/khach-moi/tong-quan') return route.fulfill({ json: { trangThai: { coQuyTrinhThueDangHoatDong: locked }, hoSo: [], lichXem: [] } });
    if (path === '/api/khach-moi/phong-kha-dung') return route.fulfill({ json: [room] });
    if (path.startsWith('/api/trang-chu/phong/') || path.startsWith('/api/khach-moi/phong/')) {
      const id = path.split('/').at(-1);
      if (responseMode === 'error') return route.fulfill({ status: 503, json: { message: 'Dịch vụ đang tạm gián đoạn.' } });
      if (id === 'Z999') return route.fulfill({ status: 404, json: { message: 'Không tìm thấy phòng.' } });
      if (responseMode === 'slow' && id === 'P101') await new Promise(resolve => setTimeout(resolve, 800));
      return route.fulfill({ json: { data: { ...room, maPhong: id, tenPhong: id === 'P102' ? 'Phòng UI 102' : room.tenPhong } } });
    }
    if (path.endsWith('/bo-loc')) return route.fulfill({ json: { data: { khuVuc: [], loaiPhong: [] } } });
    if (path.endsWith('/phong-noi-bat') || path.endsWith('/kham-pha-phong')) return route.fulfill({ json: { data: new URL(request.url()).searchParams.get('khuVuc') === '__empty__' ? [] : [room] } });
    return route.fulfill({ json: {} });
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, writes };
}
async function detailReady(page) {
  await page.locator('.kh-detail-title').waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Thông tin chung', exact: true }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Tiện nghi phòng', exact: true }).count(), 1);
  assert.equal(await page.locator('.kh-all-photo-item').count(), 5);
  assert.equal(await page.locator('.kh-detail-service-row').count(), 1);
}
try {
  for (const width of [1440, 390]) {
    const { context, page, errors, writes } = await contextFor(width);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.tc-room-cta').first().click();
    assert.equal(new URL(page.url()).searchParams.get('phong'), 'P101');
    await detailReady(page);
    assert.equal(await page.locator('.kp-modal-backdrop').count(), 0, 'detail must be a full view, not the old summary modal');
    await page.evaluate(async () => { for (const image of document.querySelectorAll('.kh-detail-view img')) { image.loading = 'eager'; await image.decode().catch(() => {}); } await document.fonts.ready; });
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.equal(metrics.width, metrics.scrollWidth);
    await page.screenshot({ path: resolve(output, `public-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Xem ảnh chính', exact: true }).click();
    const lightbox = page.getByRole('dialog', { name: 'Ảnh phòng phóng to' });
    assert.equal(await lightbox.isVisible(), true);
    const firstImage = await lightbox.locator('img').getAttribute('src');
    await page.keyboard.press('ArrowRight'); assert.notEqual(await lightbox.locator('img').getAttribute('src'), firstImage);
    await page.keyboard.press('ArrowLeft'); assert.equal(await lightbox.locator('img').getAttribute('src'), firstImage);
    await page.keyboard.press('Escape'); assert.equal(await lightbox.count(), 0);
    await page.getByRole('button', { name: '← Quay lại khám phá phòng', exact: false }).click();
    assert.equal(new URL(page.url()).searchParams.has('phong'), false);
    await page.locator('.kp-room-card').first().getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await detailReady(page);
    await page.goBack(); assert.equal(new URL(page.url()).searchParams.has('phong'), false);
    await page.goForward(); await detailReady(page);
    await page.getByRole('button', { name: 'Đăng ký thuê ngay', exact: true }).click();
    const next = new URL(page.url()).searchParams.get('next');
    assert.equal(next, '/khach-hang?tab=kham-pha&phong=P101&dangKy=1');
    await page.getByRole('dialog').waitFor();
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    report.push({ width, ...metrics, publicDetail: 'full content and lightbox passed', signup: 'login with selected room preserved', errors, writes });
    console.log(`PASS public ${width}px`); await context.close();
  }
  {
    const { context, page, errors, writes } = await contextFor(1440, true);
    await page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await page.locator('.kh-room-card').first().getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
    await detailReady(page);
    await page.screenshot({ path: resolve(output, 'customer-shared-view.png'), fullPage: true });
    await page.goto(`${base}/kham-pha-phong?phong=P101`, { waitUntil: 'domcontentloaded' }); await detailReady(page);
    await page.getByRole('button', { name: 'Đăng ký thuê ngay', exact: true }).click();
    await page.getByRole('heading', { name: 'Đăng ký thuê phòng', exact: true }).waitFor();
    assert.equal(await page.locator('.kh-room-card.selected h3').innerText(), room.tenPhong);
    assert.equal(await page.locator('.kh-register-modal .kh-room-type-field select').inputValue(), room.loaiPhong);
    assert.equal(await page.locator('.kh-register-modal label').filter({ hasText: 'Mức giá tối đa' }).locator('input').inputValue(), String(room.giaThue));
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    report.push({ customer: 'shared detail and room-prefilled registration passed', errors, writes });
    console.log('PASS customer reuse + registration'); await context.close();
  }
  {
    locked = true;
    const { context, page, writes } = await contextFor(390, true);
    await page.goto(`${base}/khach-hang?tab=kham-pha&phong=P101&dangKy=1`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Bạn đang có phiếu đăng ký/đặt cọc/hợp đồng chưa kết thúc.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Đăng ký thuê phòng', exact: true }).count(), 0);
    assert.deepEqual(writes, []);
    report.push({ lockedRegistration: 'existing lock retained' });
    console.log('PASS registration lock'); await context.close(); locked = false;
  }
  {
    const { context, page, errors, writes } = await contextFor(390);
    await page.goto(`${base}/kham-pha-phong?phong=Z999`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.kh-detail-view').count(), 0);
    responseMode = 'error';
    await page.goto(`${base}/kham-pha-phong?phong=P101`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').waitFor();
    responseMode = 'ok'; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await detailReady(page);
    await page.goto(`${base}/kham-pha-phong?khuVuc=__empty__&phong=P101`, { waitUntil: 'domcontentloaded' });
    await detailReady(page);
    assert.equal(await page.locator('.kh-detail-title').innerText(), room.tenPhong, 'direct detail must not depend on filtered room results');
    responseMode = 'slow';
    await page.goto(`${base}/kham-pha-phong?phong=P101`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { history.pushState({}, '', '/kham-pha-phong?phong=P102'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.getByRole('heading', { name: 'Phòng UI 102', exact: true }).waitFor();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('.kh-detail-title').innerText(), 'Phòng UI 102', 'a stale response must not replace the current room');
    responseMode = 'ok';
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    report.push({ errors: '404, unavailable service, retry and stale-request cancellation passed' }); console.log('PASS error/retry/race'); await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2)); }
