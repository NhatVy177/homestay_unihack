import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Tab "Thông tin cư trú" (D-026 mục 4): khách tự khai người ở, cần ô đồng ý, gửi một lần. API là fixture, không ghi DB.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/customer-residence';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const width of [1440, 390]) {
    const user = { maNguoiDung: 'KH0001', maKhachHang: 'KH0001', hoTen: 'Nguyễn Văn A', vaiTro: 'KhachHang' };
    const state = { phieu: [
      { maPhieuDatCoc: 'DC0003', hinhThucThue: 'Ghép giường', soNguoiDuKienO: 2, soNam: 2, soNu: 0, soDongCoc: 2, viTriThue: 'Phòng 101 - Giường G1, Phòng 101 - Giường G2', gioiTinhChoPhep: 'Nam', maHoSoCuTru: null, trangThaiHoSo: 'Chưa cập nhật', coHopDong: false, coTheKhai: true, thanhVien: [] },
      { maPhieuDatCoc: 'DC0001', hinhThucThue: 'Nguyên phòng', soNguoiDuKienO: 1, soDongCoc: 1, viTriThue: 'Phòng 301', maHoSoCuTru: 'HS0001', trangThaiHoSo: 'Chờ duyệt cư trú', ghiChuQuanLy: 'Quốc tịch cần quản lý kiểm tra; ', coHopDong: false, coTheKhai: false,
        thanhVien: [{ hoTen: 'John', gioiTinh: 'Nam', ngaySinh: '1999-05-01', cccd: 'P1234567', trangThai: 'Chờ duyệt' }] }],
    nguoiDaiDien: { hoTen: 'Nguyễn Văn A', ngaySinh: '2001-02-03', gioiTinh: 'Nam', sdt: '0795749721', email: 'a@example.com', cccd: '012345678901', quocTich: 'Việt Nam' } };
    const writes = [], errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
    await ctx.addInitScript((u) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: u })), user);
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: { trangThai: { soLichXem: 1, soHoSo: 1, soPhieuCoc: 2 }, hoSo: [], lichXem: [], phongGoiY: [] } });
      if (path === '/api/khach-moi/cu-tru' && req.method() === 'GET') return route.fulfill({ json: state });
      if (path === '/api/khach-moi/cu-tru' && req.method() === 'POST') {
        const data = req.postDataJSON(); writes.push(data);
        state.phieu[0] = { ...state.phieu[0], maHoSoCuTru: 'HS0009', trangThaiHoSo: 'Đã duyệt cư trú', coTheKhai: false, thanhVien: data.danhSachThanhVien.map((m) => ({ ...m, trangThai: 'Đủ điều kiện' })) };
        return route.fulfill({ json: { maHoSoCuTru: 'HS0009', trangThaiHoSo: 'Đã duyệt cư trú', lyDo: null } });
      }
      if (!['GET', 'OPTIONS'].includes(req.method())) throw new Error(`Unexpected mutation ${path}`);
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/khach-hang?tab=cu-tru`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Thông tin cư trú', level: 2 }).waitFor();
    const open = page.getByRole('article', { name: 'Cư trú DC0003' }), review = page.getByRole('article', { name: 'Cư trú DC0001' });
    await open.waitFor();
    assert.match(await review.innerText(), /Chờ quản lý duyệt[\s\S]*Quốc tịch cần quản lý kiểm tra/);
    const names = open.getByLabel('Họ và tên');
    assert.equal(await names.count(), 2, 'hai người theo số người dự kiến');
    assert.equal(await names.nth(0).inputValue(), 'Nguyễn Văn A', 'người đại diện điền sẵn từ tài khoản');
    const send = open.getByRole('button', { name: 'Gửi thông tin cư trú' });
    assert.equal(await send.isDisabled(), true, 'chưa đủ thông tin người thứ hai');
    const second = open.locator('fieldset').nth(1);
    await second.getByLabel('Họ và tên').fill('Trần Văn B');
    await second.getByLabel('Ngày sinh').fill('2002-03-04');
    await second.getByLabel('Giới tính').selectOption('Nữ');
    await open.getByText(/Giới tính người ở không khớp phiếu đăng ký \(2 nam, 0 nữ\)/).waitFor();
    assert.equal(await send.isDisabled(), true, 'lệch giới tính thì không gửi được');
    await second.getByLabel('Giới tính').selectOption('Nam');
    await second.getByLabel('Số CCCD').fill('098765432109');
    await second.getByLabel('Số điện thoại').fill('0911111111');
    assert.equal(await send.isDisabled(), true, 'còn thiếu ô đồng ý');
    await open.getByLabel(/đồng ý cung cấp thông tin/).check();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `${folder}/form-${width}.png`, fullPage: true });
    await send.click();
    await open.getByText('Đã duyệt cư trú', { exact: true }).waitFor();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].maPhieuDatCoc, 'DC0003'); assert.equal(writes[0].dongYCungCapThongTin, true);
    assert.deepEqual(writes[0].danhSachThanhVien.map((m) => m.cccd), ['012345678901', '098765432109']);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS customer residence tab: prefilled representative, required fields + consent, one POST, status after submit; fixture APIs only.');
} finally { await browser.close(); }
