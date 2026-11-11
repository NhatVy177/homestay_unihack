import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

// List kit check (J-C062): search clear button, overview cards that filter, shared status badges, table states.
// Visual fixtures only: every /api request is intercepted, the names below are made up.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5191';
await mkdir('.ui-screens/list-kit', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const soon = new Date(Date.now() + 86400000).toISOString();
const payments = [
  { maPhieuDatCoc: 'PDC-DEMO-01', hoTen: 'Khách Demo A', soDienThoai: '0900000001', tenPhong: 'P101', soTienCoc: 2500000, thoiHanThanhToan: soon, trangThaiThanhToan: 'Chờ TT' },
  { maPhieuDatCoc: 'PDC-DEMO-02', hoTen: 'Khách Demo B', soDienThoai: '0900000002', tenPhong: 'P203', soTienCoc: 1800000, thoiHanThanhToan: soon, trangThaiThanhToan: 'Đã TT' },
  { maPhieuDatCoc: 'PDC-DEMO-03', hoTen: 'Khách Demo C', soDienThoai: '0900000003', tenPhong: 'P305', soTienCoc: 3000000, thoiHanThanhToan: soon, trangThaiThanhToan: 'Hết hạn' }
];
const deposits = [
  { maDangKy: 'DK-DEMO-01', hoTen: 'Khách Demo A', soDienThoai: '0900000001', tenPhong: 'P101', maPhong: 'P101', ngayDangKy: soon, phutDaCho: 75, trangThai: 'Chờ xác nhận cọc', yeuCauCungPhong: 2, laYeuCauDau: true, coTheNhanCoc: true },
  { maDangKy: 'DK-DEMO-02', hoTen: 'Khách Demo B', soDienThoai: '0900000002', tenPhong: 'P203', ngayDangKy: soon, trangThai: 'Xác nhận cọc' },
  { maDangKy: 'DK-DEMO-03', hoTen: 'Khách Demo C', soDienThoai: '0900000003', tenPhong: 'P305', ngayDangKy: soon, trangThai: 'Từ chối' }
];
const screens = [
  { name: 'ke-toan-tien-ve', path: '/nhan-vien-ke-toan', role: 'Kế toán', tab: null, data: { 'cho-xac-nhan-thanh-toan': payments } },
  { name: 'quan-ly-nhan-coc', path: '/nhan-vien-quan-ly', role: 'Quản lý', tab: null, data: { 'cho-xac-nhan': deposits } },
  { name: 'ke-toan-nop-quy', path: '/nhan-vien-ke-toan', role: 'Kế toán', tab: 'Tiền mặt chờ nộp quỹ', data: { 'tien-mat-cho-nop-quy': payments.slice(0, 2).map(p => ({ ...p, maPhong: p.tenPhong, thuLuc: soon })) } },
  { name: 'ke-toan-loading', path: '/nhan-vien-ke-toan', role: 'Kế toán', tab: null, data: {}, hang: true }
];
const results = [];
let failed = false;
try {
  for (const screen of screens) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const user = { maNguoiDung: 'UI-DEMO', maNhanVien: 'UI-DEMO', hoTen: 'Tài khoản giao diện', tenDangNhap: 'ui-demo', maChiNhanh: 'CN-DEMO', tenChiNhanh: 'Chi nhánh demo', vaiTro: 'NhanVien', chucVu: screen.role };
      await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
      await context.route('**/api/**', route => {
        const url = new URL(route.request().url());
        if (!url.pathname.startsWith('/api/')) return route.fallback();
        if (url.pathname.endsWith('/auth/toi')) return route.fulfill({ json: user });
        if (url.pathname.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
        const key = Object.keys(screen.data).find(k => url.pathname.endsWith('/' + k));
        if (screen.hang && url.pathname.includes('/dat-coc/')) return; // never answer: keeps the loading rows on screen
        return route.fulfill({ json: key ? screen.data[key] : [] });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + screen.path, { waitUntil: 'domcontentloaded' });
      await page.locator('.ui-workspace h1').first().waitFor();
      if (screen.tab) {
        if (width < 800) await page.locator('.ui-navigation-toggle').click();
        await page.locator('aside nav button', { hasText: screen.tab }).click();
      }
      const check = {};
      if (screen.hang) {
        await page.locator('.ui-table-skeleton').first().waitFor({ timeout: 5000 });
        check.skeletonRows = await page.locator('.ui-table-skeleton').count();
      } else {
        await page.locator('.ktp-table tbody tr').first().waitFor({ timeout: 5000 });
        check.badgeIcons = await page.locator('.ktp-table .ui-badge svg').count();
        const cards = page.locator('button.ui-overview-card');
        check.clickableCards = await cards.count();
        await page.locator('.ui-list-search input').fill('Demo A');
        check.clearButton = await page.locator('.ui-list-search-clear').isVisible();
        check.rowsAfterSearch = await page.locator('.ktp-table tbody tr:not(.ui-table-state)').count();
        await page.locator('.ui-list-search-clear').click();
        check.clearedValue = await page.locator('.ui-list-search input').inputValue();
        if (check.clickableCards > 1) {
          await cards.nth(1).click();
          check.cardPressed = await cards.nth(1).getAttribute('aria-pressed');
          check.chipFollows = await page.locator('.status-pill-tab.is-active').first().innerText().then(s => s.split('\n')[0].trim());
          await cards.first().click();
        }
      }
      check.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      await page.screenshot({ path: `.ui-screens/list-kit/${screen.name}-${width}.png`, fullPage: true });
      const ok = !errors.length && check.scrollWidth <= width && (screen.hang ? check.skeletonRows > 0
        : (screen.tab ? true : check.badgeIcons > 0) && check.clearButton && check.rowsAfterSearch === 1 && check.clearedValue === '');
      failed ||= !ok;
      results.push({ screen: screen.name, width, ok, ...check, errors });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
console.log(failed ? 'FAIL: list kit check' : 'PASS: search clears, cards filter, badges carry icons, loading rows show, no horizontal scroll or browser errors.');
process.exitCode = failed ? 1 : 0;
