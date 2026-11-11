import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

// C2 check: the move-out inspection shows the move-in condition next to each item, warns when a
// defect already recorded at move-in is charged, and uploads/removes inspection photos.
// Visual fixtures only: every /api request is intercepted, all names are made up.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5191';
await mkdir('.ui-screens/checkout-compare', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const user = { maNguoiDung: 'UI-DEMO', maNhanVien: 'UI-DEMO', hoTen: 'Tài khoản giao diện', tenDangNhap: 'ui-demo', maChiNhanh: 'CN-DEMO', tenChiNhanh: 'Chi nhánh demo', vaiTro: 'NhanVien', chucVu: 'Quản lý' };
const list = [{ maPhieuTra: 'PT-DEMO', hoTenKhach: 'Khách Demo A', sdtKhach: '0900000001', tenPhong: 'P101', loaiNguon: 'HopDong', maNguon: 'HD-DEMO', ngayDuKienTra: '2026-11-20', trangThai: 'Chờ xử lý' }];
const detail = { maPhieuTra: 'PT-DEMO', trangThai: 'Chờ xử lý', ngayDangKyTra: '2026-11-10', ngayDuKienTra: '2026-11-20', maHopDong: 'HD-DEMO',
  hoTenKhach: 'Khách Demo A', sdtKhach: '0900000001', cccdKhach: '000000000000', tenChiNhanh: 'Chi nhánh demo', tenPhong: 'P101', hinhThucThue: 'Nguyên phòng', trangThaiHopDong: 'Đang hiệu lực',
  nghiaVu: [{ LoaiNghiaVu: 'HoaDon', Ten: 'Hóa đơn kỳ 10/2026', TrangThai: 'Chưa thanh toán', SoTien: 500000 }],
  taiSan: [
    { maTaiSan: 'TS001_1', maTaiSanGoc: 'TS001', thuTuTaiSan: 1, tenTaiSan: 'Nệm G01', soLuongBanGiao: 1, donGiaBoiThuong: 2000000 },
    { maTaiSan: 'TS002_1', maTaiSanGoc: 'TS002', thuTuTaiSan: 1, tenTaiSan: 'Tủ', soLuongBanGiao: 1, donGiaBoiThuong: 1500000 },
    { maTaiSan: 'TS003_1', maTaiSanGoc: 'TS003', thuTuTaiSan: 1, tenTaiSan: 'Quạt', soLuongBanGiao: 1, donGiaBoiThuong: 400000 }
  ] };
const moveIn = { nguon: 'xac-nhan-dien-tu', khachDaXacNhan: true, xacNhanLuc: '2026-05-02T03:00:00.000Z', phienBan: 2, ghiChu: 'Phòng sạch, đủ chìa',
  taiSan: [{ maTaiSan: 'TS001', ten: 'Nệm', soLuong: 2, tinhTrang: 'Rách góc 5 cm', coHuHongLucVao: true },
    { maTaiSan: 'TS002', ten: 'Tủ', soLuong: 1, tinhTrang: 'Không có ghi chú', coHuHongLucVao: false }],
  anh: [{ ten: 'nem-luc-vao.png', mediaType: 'image/png', dataBase64: png.toString('base64') }] };

const results = [];
let failed = false;
try {
  for (const width of [1440, 390]) {
    const photos = [];
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
    await context.route('**/api/**', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return route.fallback();
      const path = url.pathname;
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/kiem-tra-tra-phong/quan-ly/cho-xu-ly')) return route.fulfill({ json: { danhSach: list } });
      if (path.endsWith('/quan-ly/chi-tiet/PT-DEMO')) return route.fulfill({ json: detail });
      if (path.endsWith('/quan-ly/ban-giao-vao/PT-DEMO')) return route.fulfill({ json: moveIn });
      if (/\/quan-ly\/anh\/PT-DEMO\/\d+\/file$/.test(path)) return route.fulfill({ body: png, contentType: 'image/png' });
      if (path.endsWith('/quan-ly/anh/PT-DEMO') && request.method() === 'POST') {
        const row = { maAnh: photos.length + 1, keyTaiSan: 'TS001_1', tenGoc: 'nem-luc-tra.png', mediaType: 'image/png', sha256: 'a'.repeat(64) };
        photos.push(row); return route.fulfill({ status: 201, json: row });
      }
      if (path.endsWith('/quan-ly/anh/PT-DEMO')) return route.fulfill({ json: photos });
      if (/\/quan-ly\/anh\/PT-DEMO\/\d+$/.test(path) && request.method() === 'DELETE') {
        photos.splice(photos.findIndex(p => path.endsWith('/' + p.maAnh)), 1); return route.fulfill({ json: { message: 'ok' } });
      }
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/nhan-vien-quan-ly?tab=lap-bien-ban-kiem-tra-phong`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Lập biên bản' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('Khách đã xác nhận').waitFor();
    const check = {};
    check.moveInPhoto = await dialog.locator('img[alt^="Ảnh lúc nhận phòng"]').count();
    check.mattressMoveIn = (await dialog.locator('tbody tr', { hasText: 'Nệm G01' }).locator('.kttp-movein-cell').innerText()).trim();
    check.fanMoveIn = (await dialog.locator('tbody tr', { hasText: 'Quạt' }).locator('.kttp-movein-cell').innerText()).trim();
    await dialog.getByLabel('Hiện trạng Tủ').selectOption('Hư hỏng nhẹ');
    check.warningOnCleanItem = await dialog.locator('tbody tr', { hasText: 'Tủ' }).locator('.kttp-warning').count();
    await dialog.getByLabel('Hiện trạng Nệm G01').selectOption('Hư hỏng nhẹ');
    check.warningOnOldDefect = await dialog.locator('tbody tr', { hasText: 'Nệm G01' }).locator('.kttp-warning').count();
    await dialog.getByLabel('Ảnh này chụp món nào').selectOption('TS001_1');
    await dialog.locator('input[type=file]').setInputFiles({ name: 'nem-luc-tra.png', mimeType: 'image/png', buffer: png });
    await dialog.locator('img[alt^="Ảnh lúc trả phòng"]').first().waitFor();
    check.photoCaption = (await dialog.locator('.kttp-photo figcaption').last().innerText()).trim();
    check.inlineStyles = await page.evaluate(() => document.querySelectorAll('.kttp-modal [style]').length);
    check.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({ path: `.ui-screens/checkout-compare/kiem-tra-${width}.png`, fullPage: true });
    await dialog.getByRole('button', { name: /Xóa ảnh/ }).click();
    await dialog.getByText('Chưa có ảnh.', { exact: false }).waitFor();
    check.photoRemoved = true;
    const ok = !errors.length && check.moveInPhoto === 1 && check.mattressMoveIn === 'Rách góc 5 cm' && check.fanMoveIn === 'Không có trong biên bản'
      && check.warningOnCleanItem === 0 && check.warningOnOldDefect === 1 && check.photoCaption === 'Nệm G01' && check.scrollWidth <= width;
    failed ||= !ok;
    results.push({ width, ok, ...check, errors });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
console.log(failed ? 'FAIL: checkout comparison check' : 'PASS: move-in condition beside each item, old-defect warning only where recorded, photo upload/remove, no horizontal scroll or browser errors.');
process.exitCode = failed ? 1 : 0;
