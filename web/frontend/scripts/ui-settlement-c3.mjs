import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

// C3 check: the accountant's settlement dialog shows the refund rate from the locked policy (D-040)
// and the move-in vs. move-out comparison; the tenant sees a top-up card only when there is something to pay.
// Visual fixtures only: every /api request is intercepted, all names are made up.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5191';
await mkdir('.ui-screens/settlement-c3', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const accountant = { maNguoiDung: 'UI-DEMO', maNhanVien: 'UI-DEMO', hoTen: 'Kế toán demo', tenDangNhap: 'ui-demo', maChiNhanh: 'CN-DEMO', tenChiNhanh: 'Chi nhánh demo', vaiTro: 'NhanVien', chucVu: 'Kế toán' };
const pending = Array.from({ length: 12 }, (_, i) => ({ maPhieuTra: i ? `PT-DEMO${i}` : 'PT-DEMO', hoTenKhachHang: `Khách Demo ${i}`, sdtKhachHang: '0900000001', maHopDong: 'HD-DEMO', ngayTraThucTe: '2026-03-15', daDoiSoat: false }));
const detail = {
  phieuTraPhong: { maPhieuTra: 'PT-DEMO', maHopDong: 'HD-DEMO', ngayTraThucTe: '2026-03-15', trangThai: 'Chờ đối soát' },
  loaiHoSo: 'HOP_DONG_THUE',
  khachHang: { hoTen: 'Khách Demo A', sdt: '0900000001', email: 'demo@example.invalid' },
  hopDong: { maHopDong: 'HD-DEMO', ngayBatDau: '2026-01-01', ngayKetThuc: '2026-12-31', soTienCoc: 3000000 },
  phieuDatCoc: null, danhSachPhong: [],
  macDinhKhauTru: { tienThueConNo: 0, tienDichVuConNo: 0, tongChiPhiSuaChua: 500000, tienPhat: 0 },
  chiTietKhauTru: {},
  tinhToanTam: { tyLeHoanCocHienTai: 40, soThangLuuTru: 3, tienCocDuocHoan: 1200000, truongHopHoan: 'duoi-6-thang', nguonTyLe: 'chinh-sach' },
  chinhSachHoanCoc: { nguon: 'chinh-sach', phienBan: 'abcd1234', truongHop: 'duoi-6-thang' },
};
const moveIn = { nguon: 'xac-nhan-dien-tu', khachDaXacNhan: true, xacNhanLuc: '2026-01-02T03:00:00.000Z', phienBan: 2, ghiChu: '',
  taiSan: [{ maTaiSan: 'TS001', ten: 'Nệm', soLuong: 1, tinhTrang: 'Rách góc 5 cm', coHuHongLucVao: true }], anh: [] };
const photos = [{ maAnh: 1, keyTaiSan: 'TS001_1', tenGoc: 'nem.png', mediaType: 'image/png', sha256: 'a'.repeat(64) }];

const results = [];
let failed = false;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), accountant);
    await context.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.fallback();
      const path = url.pathname;
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: accountant });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/accountant/doi-soat/cho-doi-soat')) return route.fulfill({ json: { danhSach: pending } });
      if (path.endsWith('/accountant/doi-soat/phieu-tra-phong/PT-DEMO')) return route.fulfill({ json: detail });
      if (path.endsWith('/doi-chieu/ban-giao-vao/PT-DEMO')) return route.fulfill({ json: moveIn });
      if (path.endsWith('/doi-chieu/anh/PT-DEMO/1/file')) return route.fulfill({ body: png, contentType: 'image/png' });
      if (path.endsWith('/doi-chieu/anh/PT-DEMO')) return route.fulfill({ json: photos });
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/nhan-vien-ke-toan`, { waitUntil: 'domcontentloaded' });
    if (width < 800) await page.locator('.ui-navigation-toggle').click();
    await page.locator('aside nav button', { hasText: 'Đối soát hoàn cọc' }).click();
    const paging = (await page.locator('.ui-pagination-summary').innerText()).trim();
    await page.locator('tbody tr', { hasText: 'PT-DEMO' }).first().locator('button').first().click();
    const compare = page.getByLabel('Đối chiếu lúc nhận phòng và lúc trả phòng');
    await compare.getByText('Khách đã xác nhận').waitFor({ timeout: 8000 });
    const check = {
      paging,
      rate: (await page.locator('.qt-summary-panel').getByText('40%').count()) > 0,
      rateSource: (await page.locator('.qt-rate-source').innerText()).trim(),
      moveInDefect: (await compare.locator('.is-defect').first().innerText()).trim(),
      checkoutPhoto: await compare.locator('img[alt^="Ảnh lúc trả phòng"]').count(),
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    };
    await page.screenshot({ path: `.ui-screens/settlement-c3/ke-toan-${width}.png`, fullPage: true });
    const ok = !errors.length && check.paging.includes("1–10 / 12") && check.rate && /phiên bản abcd1234/.test(check.rateSource) && check.moveInDefect === 'Rách góc 5 cm'
      && check.checkoutPhoto === 1 && check.scrollWidth <= width;
    failed ||= !ok;
    results.push({ width, ok, ...check, errors });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
console.log(failed ? 'FAIL: settlement C3 check' : 'PASS: locked-policy rate and its version shown, move-in/move-out comparison visible to the accountant, no horizontal scroll or browser errors.');
process.exitCode = failed ? 1 : 0;
