import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// D-042: nhãn trạng thái phòng (còn trống / đang chờ cọc / hết chỗ), nút mờ khi hết chỗ, chặn dưới 18 tuổi
// trên form đăng ký, và Sale không còn nút "Tạo phiếu mới cho khách vãng lai".
// Dữ liệu giả: mọi request /api đều bị chặn lại, tên và mã chỉ để thử giao diện.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5193';
await mkdir('.ui-screens/interested-rooms', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

const rooms = [
  { id: 'P901', maPhong: 'P901', tenPhong: 'Phòng P901', loaiPhong: 'Phòng 4 người', giaThue: 1400000, chiNhanh: 'Chi nhánh giao diện', diaChi: 'Quận 1', trangThaiQuanTam: 'Còn trống' },
  { id: 'P902', maPhong: 'P902', tenPhong: 'Phòng P902', loaiPhong: 'Phòng 4 người', giaThue: 1500000, chiNhanh: 'Chi nhánh giao diện', diaChi: 'Quận 1', trangThaiQuanTam: 'Đang chờ cọc' },
  { id: 'P903', maPhong: 'P903', tenPhong: 'Phòng P903', loaiPhong: 'Phòng 4 người', giaThue: 1600000, chiNhanh: 'Chi nhánh giao diện', diaChi: 'Quận 1', trangThaiQuanTam: 'Hết chỗ' }
];
const customer = { maNguoiDung: 'KH-DEMO', maKhachHang: 'KH-DEMO', hoTen: 'Khách demo', tenDangNhap: 'kh-demo', vaiTro: 'KhachHang' };
const sale = { maNguoiDung: 'UI-SALE', vaiTro: 'NhanVien', chucVu: 'Sale', hoTen: 'Sale giao diện', maChiNhanh: 'CN-UI' };

async function newPage(width, user) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
  const writes = [];
  await context.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    if (!['GET', 'OPTIONS'].includes(route.request().method())) writes.push(url.pathname);
    if (url.pathname.endsWith('/auth/toi')) return route.fulfill({ json: user });
    if (url.pathname.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
    if (url.pathname.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: { trangThai: 'Khách mới', hoSo: [], lichXem: [], phongGoiY: [] } });
    if (url.pathname.endsWith('/khach-moi/phong-kha-dung')) return route.fulfill({ json: rooms });
    const detail = url.pathname.match(/\/khach-moi\/phong\/(P\d+)$/);
    if (detail) return route.fulfill({ json: { ...rooms.find(room => room.id === detail[1]), hinhAnh: [], tienNghi: [], dichVuUocTinh: [] } });
    return route.fulfill({ json: [] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, writes };
}

const results = [];
try {
  for (const width of [1440, 390]) {
    // --- cổng khách
    const { context, page, errors, writes } = await newPage(width, customer);
    await page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await page.locator('.kh-room-card').first().waitFor({ timeout: 10000 });

    const chips = await page.locator('.kh-room-card .kh-room-status').allInnerTexts();
    assert.deepEqual(chips, ['Còn trống', 'Đang chờ cọc', 'Hết chỗ'], 'mỗi thẻ phòng có nhãn trạng thái');
    await page.screenshot({ path: `.ui-screens/interested-rooms/danh-sach-${width}.png` });

    // Phòng hết chỗ: nút mờ, không mở được form
    await page.locator('.kh-room-card').nth(2).getByRole('button', { name: 'Xem chi tiết' }).click();
    const full = page.locator('.kh-detail-register');
    await full.waitFor();
    assert.equal(await full.isDisabled(), true, 'phòng hết chỗ: nút bị khóa');
    assert.match(await full.innerText(), /Hết chỗ/i);
    await page.screenshot({ path: `.ui-screens/interested-rooms/chi-tiet-het-cho-${width}.png` });
    await page.getByRole('button', { name: /Quay lại khám phá phòng/ }).click();

    // Phòng đang chờ cọc: vẫn bấm được và có ghi chú
    await page.locator('.kh-room-card').nth(1).getByRole('button', { name: 'Xem chi tiết' }).click();
    const waiting = page.locator('.kh-detail-register');
    await waiting.waitFor();
    assert.equal(await waiting.isDisabled(), false, 'phòng chờ cọc: vẫn cho quan tâm');
    assert.match(await page.locator('.kh-detail-note').innerText(), /đang có người giữ chỗ/);
    await waiting.click();

    // Form đăng ký: dưới 18 tuổi bị báo lỗi, quốc tịch khác chỉ cảnh báo
    const modal = page.locator('.kh-register-modal').first();
    await modal.waitFor({ timeout: 8000 });
    const birth = modal.locator('input[type="date"]').first();
    await birth.fill('2015-01-01');
    await page.screenshot({ path: `.ui-screens/interested-rooms/form-duoi-18-${width}.png` });
    assert.match(await modal.innerText(), /từ đủ 18 tuổi/);
    await birth.fill('2000-01-01');
    assert.doesNotMatch(await modal.innerText(), /từ đủ 18 tuổi/);
    await modal.getByPlaceholder('Ví dụ: Việt Nam').fill('Nhật Bản');
    assert.match(await modal.innerText(), /quản lý chi nhánh sẽ xem xét thêm/);
    await modal.getByPlaceholder('Ví dụ: Việt Nam').fill('Việt Nam');
    assert.doesNotMatch(await modal.innerText(), /quản lý chi nhánh sẽ xem xét thêm/);

    assert.equal(errors.length, 0, `browser errors: ${errors.join('; ')}`);
    assert.equal(writes.length, 0, 'không gửi thao tác ghi nào');
    results.push({ width, role: 'khách', ok: true });
    await context.close();

    // --- Sale: không còn nút tạo phiếu khách vãng lai
    const saleCtx = await newPage(width, sale);
    await saleCtx.page.goto(`${base}/nhan-vien-sale`, { waitUntil: 'domcontentloaded' });
    await saleCtx.page.locator('h1').first().waitFor();
    if (width === 390) await saleCtx.page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await saleCtx.page.locator('aside nav').getByRole('button', { name: 'Lịch hẹn xem phòng', exact: true }).click();
    await saleCtx.page.getByRole('button', { name: 'Tiếp nhận hồ sơ đăng ký', exact: false }).click();
    await saleCtx.page.locator('.ktp-container').waitFor();
    assert.equal(await saleCtx.page.getByRole('button', { name: /khách vãng lai/i }).count(), 0, 'Sale không còn nút tạo phiếu khách vãng lai');
    assert.equal(saleCtx.errors.length, 0, `browser errors (Sale): ${saleCtx.errors.join('; ')}`);
    await saleCtx.page.screenshot({ path: `.ui-screens/interested-rooms/sale-tiep-nhan-${width}.png` });
    results.push({ width, role: 'Sale', ok: true });
    await saleCtx.context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results));
console.log('PASS: D-042 trạng thái phòng, nút mờ khi hết chỗ, chặn dưới 18 tuổi, Sale không còn nút khách vãng lai.');
