import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Trang "Quản lý hợp đồng" của quản lý: một danh sách, lọc trạng thái, mở màn xử lý trả phòng theo hợp đồng. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/manager-contracts';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const manager = { maNguoiDung: 'NV9003', maNhanVien: 'NV9003', hoTen: 'Quản lý demo', maChiNhanh: 'CN9003', tenChiNhanh: 'Chi nhánh demo', vaiTro: 'NhanVien', chucVu: 'Quản lý' };
const rows = [
  { maHopDong: 'HD9003', hoTen: 'Khách A', sdt: '0900000003', tenPhong: 'Phòng P901', giuong: '', hinhThucThue: 'Nguyên phòng', giaThue: 7200000, ngayBatDau: '2026-11-15', ngayKetThuc: '2027-11-15', trangThai: 'Hiệu lực', nhom: 'tra-phong', viecCanLam: 'kiem-tra', maPhieuTra: 'TP9003', trangThaiPhieuTra: 'Chờ xử lý', daThuChiaKhoa: false },
  { maHopDong: 'HD9002', hoTen: 'Khách B', sdt: '0900000002', tenPhong: 'Phòng P902', giuong: 'G01', hinhThucThue: 'Ghép giường', giaThue: 1400000, ngayBatDau: '2026-11-14', ngayKetThuc: '2027-11-14', trangThai: 'Đã thanh lý', nhom: 'thanh-ly', viecCanLam: 'ket-thuc', maPhieuTra: 'TP9002', trangThaiPhieuTra: 'Hoàn tất', daThuChiaKhoa: false },
  { maHopDong: 'HD9001', hoTen: 'Khách C', sdt: '0900000001', tenPhong: 'Phòng P903', giuong: '', hinhThucThue: 'Nguyên phòng', giaThue: 5000000, ngayBatDau: '2026-10-01', ngayKetThuc: '2027-10-01', trangThai: 'Hiệu lực', nhom: 'hieu-luc', viecCanLam: null, daThuChiaKhoa: false },
];
try {
  for (const width of [1440, 390]) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((u) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: u })), manager);
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: manager });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path === '/api/hop-dong/quan-ly-chi-nhanh') return route.fulfill({ json: rows });
      if (path === '/api/checkout-lifecycle') return route.fulfill({ json: [{ contractId: 'HD9002', settlementId: 'DS9002', hasReturn: true, closed: true, mode: 'accepted', mailStatus: 'sent',
        keysReturnedAt: null, canReturnKeys: true, money: { ready: true, missing: [] }, response: { overdue: false }, exception: { allowed: false } }] });
      if (req.method() === 'GET') return route.fulfill({ json: [] });
      throw new Error(`Unexpected ${req.method()} ${path}`);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/nhan-vien-quan-ly`, { waitUntil: 'domcontentloaded' });
    if (width < 800) await page.locator('.ui-navigation-toggle').click();
    await page.locator('aside nav button', { hasText: 'Quản lý hợp đồng' }).click();
    await page.getByRole('heading', { name: 'Quản lý hợp đồng', level: 2 }).waitFor();
    const body = page.locator('.qlhd-table tbody tr');
    await body.first().waitFor();
    assert.equal(await body.count(), 3, 'mọi hợp đồng trong một danh sách');
    assert.equal(await page.getByRole('tab').count(), 0, 'không còn tab con');
    await page.getByRole('group', { name: 'Lọc hợp đồng theo trạng thái' }).getByRole('button', { name: /Đang trả phòng/ }).click();
    assert.equal(await body.count(), 1); assert.match(await body.first().innerText(), /HD9003/);
    await page.getByRole('group', { name: 'Lọc hợp đồng theo trạng thái' }).getByRole('button', { name: /Tất cả/ }).click();
    assert.match(await body.filter({ hasText: 'HD9002' }).innerText(), /Chưa thu chìa khóa/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `${folder}/list-${width}.png`, fullPage: true });
    await body.filter({ hasText: 'HD9003' }).getByRole('button', { name: 'Kiểm tra trả phòng' }).click();
    await page.getByRole('heading', { name: 'Kiểm tra trả phòng · HD9003' }).waitFor();
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await body.filter({ hasText: 'HD9002' }).getByRole('button', { name: 'Kết thúc hợp đồng' }).click();
    await page.getByRole('heading', { name: 'Kết thúc hợp đồng · HD9002' }).waitFor();
    const focus = page.locator('.checkout-focus');
    await focus.getByRole('button', { name: 'Đã thu chìa khóa' }).waitFor();
    assert.equal(await focus.locator('table').count(), 0, 'thẻ gọn, không bảng');
    assert.match(await focus.innerText(), /DS9002[\s\S]*Đã thanh lý[\s\S]*Chưa thu chìa khóa/);
    await page.screenshot({ path: `${folder}/ket-thuc-${width}.png` });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS manager contracts: one list with status filters and counts, no sub-tabs, row action opens the checkout step for that contract; fixture APIs only.');
} finally { await browser.close(); }
