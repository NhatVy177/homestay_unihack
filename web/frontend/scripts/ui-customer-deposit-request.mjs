import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// D-026: khách bấm "Tôi muốn đặt cọc" ở lịch đã xem. Mọi API đều là fixture, không ghi DB thật.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/customer-deposit-request';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = [];
try {
  for (const width of [1440, 390]) {
    const user = { maNguoiDung: 'KH0001', maKhachHang: 'KH0001', hoTen: 'Khách giữ chỗ', vaiTro: 'KhachHang' };
    const rows = [
      { id: 'DK0001-1', maDangKy: 'DK0001', phongXem: 'Phòng A1', danhSachPhong: 'Phòng A1', thoiGianHen: '2026-11-10T09:00:00+07:00', trangThai: 'Đã xem', phienBanLich: 1, xacNhanLichSanSang: true, khachDaXacNhanLich: true, daGuiYeuCauDatCoc: false },
      { id: 'DK0002-1', maDangKy: 'DK0002', phongXem: 'Phòng B2', danhSachPhong: 'Phòng B2', thoiGianHen: '2026-11-09T09:00:00+07:00', trangThai: 'Đã xem', phienBanLich: 1, xacNhanLichSanSang: true, khachDaXacNhanLich: true, daGuiYeuCauDatCoc: true }];
    const writes = [], errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
    await ctx.addInitScript((u) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: u })), user);
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: { trangThai: { soLichXem: 2, soHoSo: 2 }, hoSo: [], lichXem: rows, phongGoiY: [] } });
      if (path === '/api/lich-xem-phong') return route.fulfill({ json: rows });
      if (path === '/api/dat-coc/khach/phong-da-xem') return route.fulfill({ json: { soNguoi: 2, khacGioi: false, daGuiYeuCau: false, phong: [{ maPhong: 'A101', tenPhong: 'Phòng A1', daXem: 1 }, { maPhong: 'A102', tenPhong: 'Phòng A2', daXem: 0 }] } });
      if (path === '/api/dat-coc/giuong-trong') return route.fulfill({ json: [{ maGiuong: 'G1' }, { maGiuong: 'G2' }, { maGiuong: 'G3' }] });
      if (req.method() === 'POST' && path === '/api/dat-coc/khach/gui-yeu-cau') {
        writes.push(req.postDataJSON()); rows[0].daGuiYeuCauDatCoc = true; return route.fulfill({ json: { maDangKy: 'DK0001' } });
      }
      if (!['GET', 'OPTIONS'].includes(req.method())) throw new Error(`Unexpected mutation ${path}`);
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/khach-hang?tab=lich-xem`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Đã qua \(2\)/ }).click();
    const first = page.getByRole('article', { name: 'Lịch DK0001-1', exact: true }), second = page.getByRole('article', { name: 'Lịch DK0002-1', exact: true });
    await first.waitFor();
    assert.equal(await first.getByRole('button', { name: 'Tôi muốn đặt cọc', exact: true }).count(), 1);
    assert.equal(await second.getByRole('button', { name: 'Tôi muốn đặt cọc', exact: true }).count(), 0, 'đã gửi yêu cầu thì không còn nút');
    await first.getByRole('button', { name: 'Tôi muốn đặt cọc', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Đặt cọc giữ chỗ' }); await modal.waitFor();
    await modal.getByText('Phòng A1', { exact: true }).waitFor();
    assert.equal(await modal.getByRole('radio', { name: /Phòng A2/ }).isDisabled(), true, 'phòng chưa xem không chọn được');
    const send = modal.getByRole('button', { name: 'Gửi yêu cầu giữ chỗ', exact: true });
    assert.equal(await send.isDisabled(), false, 'một phòng đã xem được chọn sẵn, nguyên phòng không cần giường');
    await modal.getByRole('radio', { name: 'Ghép giường', exact: true }).check();
    assert.equal(await send.isDisabled(), true, 'ghép giường phải chọn đủ số giường');
    await modal.getByRole('checkbox', { name: 'G1' }).check(); await modal.getByRole('checkbox', { name: 'G2' }).check();
    assert.equal(await modal.getByRole('checkbox', { name: 'G3' }).isDisabled(), true, 'không chọn quá số người');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `${folder}/modal-${width}.png`, fullPage: true });
    await send.click();
    await page.getByRole('alertdialog').getByText('Đã gửi yêu cầu giữ chỗ', { exact: true }).waitFor();
    assert.deepEqual(writes, [{ maDangKy: 'DK0001', maPhong: 'A101', hinhThucThue: 'Ghép giường', giuongs: ['G1', 'G2'] }]);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Đã hiểu', exact: true }).click();
    await page.getByRole('heading', { name: 'Lịch sử đặt cọc', level: 2 }).waitFor(); // gửi xong tự chuyển sang tab lịch sử
    assert.deepEqual(errors, []);
    report.push({ width, writes: writes.length });
  }
  console.log(JSON.stringify(report));
  console.log('PASS customer deposit request: button, room/bed rules, single POST; fixture APIs only.');
} finally { await browser.close(); }
