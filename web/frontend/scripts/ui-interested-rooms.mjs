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
  { id: 'P901', maPhong: 'P901', tenPhong: 'Phòng P901', loaiPhong: 'Phòng 4 người', giaThue: 1400000, chiNhanh: 'Chi nhánh giao diện', diaChi: 'Quận 1', trangThaiQuanTam: 'Còn trống', soGiuongTrong: 4, soGiuongChoCoc: 0 },
  { id: 'P902', maPhong: 'P902', tenPhong: 'Phòng P902', loaiPhong: 'Phòng 4 người', giaThue: 1500000, chiNhanh: 'Chi nhánh giao diện', diaChi: 'Quận 1', trangThaiQuanTam: 'Đang chờ cọc', soGiuongTrong: 0, soGiuongChoCoc: 2 },
  { id: 'P903', maPhong: 'P903', tenPhong: 'Phòng P903', loaiPhong: 'Phòng 4 người', giaThue: 1600000, chiNhanh: 'Chi nhánh giao diện', diaChi: 'Quận 1', trangThaiQuanTam: 'Hết chỗ', soGiuongTrong: 0, soGiuongChoCoc: 0 }
];
const customer = { maNguoiDung: 'KH-DEMO', maKhachHang: 'KH-DEMO', hoTen: 'Khách demo', tenDangNhap: 'kh-demo', vaiTro: 'KhachHang' };
const sale = { maNguoiDung: 'UI-SALE', vaiTro: 'NhanVien', chucVu: 'Sale', hoTen: 'Sale giao diện', maChiNhanh: 'CN-UI' };

async function newPage(width, user, overview = { trangThai: 'Khách mới', hoSo: [], lichXem: [], phongGoiY: [] }) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
  const writes = [];
  const bodies = [];
  await context.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    if (!['GET', 'OPTIONS'].includes(route.request().method())) { writes.push(url.pathname); bodies.push({ path: url.pathname, body: route.request().postDataJSON() }); }
    if (route.request().method() === 'POST' && url.pathname.endsWith('/khach-moi/ho-so')) return route.fulfill({ status: 201, json: { maDangKy: 'DK9999' } });
    if (url.pathname.endsWith('/auth/toi')) return route.fulfill({ json: user });
    if (url.pathname.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
    if (url.pathname.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: overview });
    if (url.pathname.endsWith('/khach-moi/phong-kha-dung')) return route.fulfill({ json: rooms });
    if (/\/khach-moi\/ho-so\/[^/]+\/phong-quan-tam/.test(url.pathname)) return route.fulfill({ status: 201, json: [] });
    const detail = url.pathname.match(/\/khach-moi\/phong\/(P\d+)$/);
    if (detail) return route.fulfill({ json: { ...rooms.find(room => room.id === detail[1]), hinhAnh: [], tienNghi: [], dichVuUocTinh: [] } });
    return route.fulfill({ json: [] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, writes, bodies };
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
    assert.match(await page.locator('.kh-detail-availability').innerText(), /Đã hết chỗ/);
    assert.equal(await full.isDisabled(), true, 'phòng hết chỗ: nút bị khóa');
    assert.match(await full.innerText(), /Hết chỗ/i);
    await page.screenshot({ path: `.ui-screens/interested-rooms/chi-tiet-het-cho-${width}.png` });
    await page.getByRole('button', { name: /Quay lại khám phá phòng/ }).click();

    // Phòng đang chờ cọc: vẫn bấm được và có ghi chú
    await page.locator('.kh-room-card').nth(1).getByRole('button', { name: 'Xem chi tiết' }).click();
    const waiting = page.locator('.kh-detail-register');
    await waiting.waitFor();
    assert.equal(await waiting.isDisabled(), false, 'phòng chờ cọc: vẫn cho quan tâm');
    assert.match(await page.locator('.kh-detail-flow-note').innerText(), /đang có người giữ chỗ/);
    assert.match(await page.locator('.kh-detail-availability').innerText(), /2 giường đang chờ cọc/);

    // Phòng còn trống: hiện số giường trống và nút "Tôi quan tâm phòng này"
    await page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await page.locator('.kh-room-card').first().waitFor({ timeout: 10000 });
    await page.locator('.kh-room-card').first().getByRole('button', { name: 'Xem chi tiết' }).click();
    const open = page.getByRole('button', { name: 'Tôi quan tâm phòng này' });
    await open.waitFor();
    assert.match(await page.locator('.kh-detail-availability').innerText(), /Còn 4 giường trống/);
    assert.match(await page.locator('.kh-detail-bed-note').innerText(), /Sale sẽ xếp giường cụ thể/);
    await page.screenshot({ path: `.ui-screens/interested-rooms/chi-tiet-con-trong-${width}.png` });
    await open.click();

    // Form đăng ký là một trang (không phải hộp thoại), có thẻ phòng quan tâm và cột quy trình
    const modal = page.locator('.kh-register-modal').first();
    await modal.waitFor({ timeout: 8000 });
    assert.equal(await page.locator('.kp-modal-backdrop').count(), 0, 'form là trang, không phải overlay');
    assert.match(await page.locator('.kh-rent-interest').innerText(), /Phòng P901/);
    assert.match(await page.locator('.kh-rent-aside').innerText(), /Quy trình sau khi gửi phiếu/);
    const metrics = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(metrics.pageWidth <= metrics.viewport, `form tràn ngang: ${metrics.pageWidth} > ${metrics.viewport}`);
    await page.screenshot({ path: `.ui-screens/interested-rooms/form-phieu-nhu-cau-${width}.png`, fullPage: true });
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

    // Đăng ký thuê theo nhóm: mở cùng phiếu, tiêu đề nhóm, số người mặc định 2
    await modal.getByRole('button', { name: 'Hủy' }).click();
    await page.locator('.kh-room-card').first().getByRole('button', { name: 'Xem chi tiết' }).click();
    await page.getByRole('button', { name: 'Đăng ký thuê theo nhóm' }).click();
    await page.getByRole('heading', { name: 'Đăng ký thuê theo nhóm' }).waitFor();
    assert.match(await page.locator('.kh-rent-group-note').innerText(), /người đại diện/);
    assert.equal(await page.locator('.kh-register-modal input[type="number"]').first().inputValue(), '2');
    await page.screenshot({ path: `.ui-screens/interested-rooms/form-nhom-${width}.png` });

    assert.equal(errors.length, 0, `browser errors: ${errors.join('; ')}`);
    assert.equal(writes.length, 0, 'không gửi thao tác ghi nào');
    results.push({ width, role: 'khách', ok: true });
    await context.close();

    // --- Phiếu đầy đủ: thời gian xem, tiện ích, ghi chú được gộp vào ghi chú hồ sơ gửi lên
    const fill = await newPage(width, customer);
    await fill.page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await fill.page.locator('.kh-room-card').first().waitFor({ timeout: 10000 });
    await fill.page.locator('.kh-room-card').first().getByRole('button', { name: 'Xem chi tiết' }).click();
    await fill.page.getByRole('button', { name: 'Tôi quan tâm phòng này' }).click();
    const form = fill.page.locator('.kh-register-modal').first();
    await form.waitFor();
    const labelled = (text) => form.locator('label', { hasText: text }).locator('input, select, textarea').first();
    await labelled('Ngày sinh').fill('2000-01-01');
    await labelled('Giới tính*').selectOption('Nam');
    await labelled('Số điện thoại').fill('0901234567');
    await labelled('Quốc tịch').fill('Việt Nam');
    await labelled('CCCD').fill('012345678901');
    await labelled('Khu vực mong muốn').fill('Quận 1');
    await labelled('Thời gian dự kiến dọn vào').fill('2026-12-20');
    await labelled('Thời hạn thuê').fill('6');
    await labelled('Ngày có thể đến xem').fill('2026-12-01');
    await labelled('Khung giờ rảnh').selectOption('Buổi chiều (13:00–17:00)');
    await labelled('Ghi chú thời gian').fill('sau 16:00');
    await form.getByRole('button', { name: 'Máy lạnh' }).click();
    await form.getByRole('button', { name: 'Wifi mạnh' }).click();
    assert.equal(await form.getByRole('button', { name: 'Máy lạnh' }).getAttribute('aria-pressed'), 'true');
    await form.getByPlaceholder(/muốn ở gần trường/).fill('Cần chỗ để xe');
    await fill.page.screenshot({ path: `.ui-screens/interested-rooms/form-day-du-${width}.png`, fullPage: true });
    await form.getByRole('button', { name: 'Gửi phiếu đăng ký' }).click();
    await fill.page.waitForTimeout(800);
    const sent = fill.bodies.find((item) => item.path.endsWith('/khach-moi/ho-so'));
    assert.ok(sent, `đã gửi phiếu (writes: ${fill.writes.join(', ')})`);
    assert.match(sent.body.ghiChu, /Thời gian xem mong muốn: ngày 01\/12\/2026, Buổi chiều \(13:00–17:00\) \(sau 16:00\)\./);
    assert.match(sent.body.ghiChu, /Tiện ích mong muốn: Máy lạnh, Wifi mạnh\./);
    assert.match(sent.body.ghiChu, /Cần chỗ để xe/);
    assert.deepEqual(sent.body.phongQuanTamIds, ['P901']);
    assert.equal(fill.errors.length, 0, `browser errors: ${fill.errors.join('; ')}`);
    results.push({ width, role: 'khách gửi phiếu đầy đủ', ok: true });
    await fill.context.close();

    // --- D-043: khách đã có hồ sơ mở thì thêm phòng bằng một lần bấm, không mở form
    const withProfile = { trangThai: { coQuyTrinhThueDangHoatDong: true }, hoSo: [{ maDangKy: 'DK0001', trangThai: 'Chờ tiếp nhận', loaiPhongYeuCau: 'Phòng 4 người', danhSachPhongQuanTam: [{ maPhong: 'P901', tenPhong: 'Phòng P901', maChiNhanh: 'CN0001', chiNhanh: 'Chi nhánh giao diện' }] }], lichXem: [], phongGoiY: [] };
    const second = await newPage(width, customer, withProfile);
    await second.page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await second.page.locator('.kh-room-card').first().waitFor({ timeout: 10000 });
    assert.match(await second.page.locator('.kh-profile-banner').innerText(), /DK0001/);
    assert.match(await second.page.locator('.kh-profile-banner .kh-profile-room').first().innerText(), /Phòng P901/);
    assert.equal(await second.page.locator('.kh-room-card').nth(0).locator('.kh-heart.is-active').count(), 1, 'phòng đã có trong hồ sơ: trái tim đầy');
    assert.equal(await second.page.locator('.kh-room-card').nth(2).locator('.kh-heart').count(), 0, 'phòng hết chỗ không có trái tim');
    assert.equal(await second.page.getByRole('button', { name: /Thêm vào hồ sơ/ }).count(), 0, 'không còn nút chữ "Thêm vào hồ sơ"');
    await second.page.screenshot({ path: `.ui-screens/interested-rooms/ho-so-nhieu-phong-${width}.png` });
    await second.page.locator('.kh-room-card').nth(1).locator('.kh-heart').click();
    await second.page.waitForTimeout(500);
    assert.ok(second.writes.some((path) => path.endsWith('/khach-moi/ho-so/DK0001/phong-quan-tam')), 'gửi yêu cầu thêm phòng vào hồ sơ');
    assert.equal(await second.page.locator('.kh-register-modal').count(), 0, 'không mở form đăng ký');
    assert.equal(second.errors.length, 0, `browser errors: ${second.errors.join('; ')}`);
    results.push({ width, role: 'khách có hồ sơ mở', ok: true });
    await second.context.close();

    // Hồ sơ loại khác: trái tim bị khóa, không thêm được phòng khác loại
    const otherType = await newPage(width, customer, { ...withProfile, hoSo: [{ ...withProfile.hoSo[0], loaiPhongYeuCau: 'Phòng 6 người', danhSachPhongQuanTam: [] }] });
    await otherType.page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await otherType.page.locator('.kh-room-card').first().waitFor({ timeout: 10000 });
    assert.equal(await otherType.page.locator('.kh-room-card').nth(0).locator('.kh-heart').isDisabled(), true, 'khác loại phòng thì không thêm được');
    await otherType.context.close();

    // --- Hồ sơ đã có lịch xem: báo rõ, không cho thêm phòng
    const scheduled = { trangThai: { coQuyTrinhThueDangHoatDong: true }, hoSo: [{ maDangKy: 'DK0002', trangThai: 'Đã tiếp nhận', sttLich: 1, trangThaiLich: 'Chờ xem', thoiGianHen: '2026-11-20T09:00:00' }], lichXem: [], phongGoiY: [] };
    const third = await newPage(width, customer, scheduled);
    await third.page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await third.page.locator('.kh-room-card').first().waitFor({ timeout: 10000 });
    assert.match(await third.page.locator('.kh-profile-banner--scheduled').innerText(), /Xem xong rồi mới thêm phòng khác/);
    assert.equal(await third.page.getByRole('button', { name: /Thêm vào hồ sơ/ }).count(), 0);
    await third.page.locator('.kh-room-card').first().getByRole('button', { name: 'Xem chi tiết' }).click();
    const busy = third.page.locator('.kh-detail-register');
    await busy.waitFor();
    assert.equal(await busy.isDisabled(), true);
    assert.match(await busy.innerText(), /Đang có lịch xem phòng/);
    await third.page.screenshot({ path: `.ui-screens/interested-rooms/da-co-lich-${width}.png` });
    assert.equal(third.errors.length, 0, `browser errors: ${third.errors.join('; ')}`);
    results.push({ width, role: 'khách đã có lịch', ok: true });
    await third.context.close();

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
