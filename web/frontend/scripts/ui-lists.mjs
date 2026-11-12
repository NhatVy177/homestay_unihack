import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const phase = process.argv[2] || 'after';
const dir = resolve('.ui-screens', `lists-${phase}`);
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const cases = [
  ['sale-profiles', 'Sale', '/nhan-vien-sale'],
  ['sale-schedules', 'Sale', '/nhan-vien-sale', 'Lịch xem phòng'],
  ['sale-deposits', 'Sale', '/nhan-vien-sale', 'Đặt cọc'],
  ['sale-deposit-slips', 'Sale', '/nhan-vien-sale', 'Đặt cọc', 'Ghi nhận chứng từ thanh toán'],
  ['sale-residence', 'Sale', '/nhan-vien-sale', 'Ghi nhận cư trú'],
  ['sale-contracts', 'Sale', '/nhan-vien-sale', 'Hợp đồng thuê'],
  ['manager-deposits', 'Quản lý', '/nhan-vien-quan-ly'],
  ['manager-residence', 'Quản lý', '/nhan-vien-quan-ly', 'Kiểm tra lưu trú'],
  ['manager-handover', 'Quản lý', '/nhan-vien-quan-ly', 'Bàn giao tài sản'],
  ['manager-checkout', 'Quản lý', '/nhan-vien-quan-ly', 'Quản lý hợp đồng'],
  ['manager-feedback', 'Quản lý', '/nhan-vien-quan-ly', 'Quản lý hợp đồng', 'Xử lý phản hồi'],
  ['manager-closeout', 'Quản lý', '/nhan-vien-quan-ly', 'Quản lý hợp đồng', 'Kết thúc hợp đồng'],
  ['accountant-deposits', 'Kế toán', '/nhan-vien-ke-toan'],
  ['accountant-checkin', 'Kế toán', '/nhan-vien-ke-toan', 'Hóa đơn nhận phòng'],
  ['accountant-settlement', 'Kế toán', '/nhan-vien-ke-toan', 'Đối soát hoàn cọc'],
  ['accountant-extra', 'Kế toán', '/nhan-vien-ke-toan', 'Chi tiền thanh lý', 'Ghi nhận thu thêm'],
  ['accountant-refund', 'Kế toán', '/nhan-vien-ke-toan', 'Chi tiền thanh lý', 'Ghi nhận hoàn cọc'],
  ['accountant-results', 'Kế toán', '/nhan-vien-ke-toan', 'Đối soát hoàn cọc', 'Kết quả đối soát'],
  ['admin-overview', 'Admin', '/nhan-vien-admin'],
  ['admin-employees', 'Admin', '/nhan-vien-admin', 'Tài khoản nhân viên'],
];
const report = [];
const residence = ['Chờ duyệt cư trú', 'Đã duyệt cư trú', 'Từ chối cư trú'].map((status, index) => ({
  maHoSoCuTru: `UI-${index + 1}`, maPhieuDatCoc: `DC-UI-${index + 1}`, hoTenKhachHang: `Khách giao diện ${index + 1}`,
  viTriThue: `Phòng UI-${index + 1}`, trangThaiHoSo: status, ngayCapNhat: '2026-11-10', thanhVien: [],
}));
try {
  for (const width of [1440, 390]) for (const [name, role, path, nav, sub] of cases) {
    if (process.env.UI_LIST_CASES && !new RegExp(process.env.UI_LIST_CASES).test(name)) continue;
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const user = { maNguoiDung: 'UI-DEMO', vaiTro: 'NhanVien', chucVu: role, hoTen: 'Giao diện thử', maChiNhanh: 'CN-UI' };
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-only', user: value })), user);
    const writes = [];
    await context.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.fallback();
      if (!['GET', 'OPTIONS'].includes(route.request().method())) writes.push(url.pathname);
      let json = [];
      if (url.pathname.endsWith('/auth/toi')) json = user;
      if (url.pathname.endsWith('/avalanche/config')) json = { enabled: false };
      if (url.pathname.endsWith('/cu-tru/cho-duyet')) {
        const search = url.searchParams.get('tuKhoa') || '';
        json = residence.filter(row => JSON.stringify(row).includes(search));
      }
      return route.fulfill({ json });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.UI_BASE_URL || 'http://127.0.0.1:5173') + path, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor();
    if (nav) {
      if (width === 390) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await page.locator('aside nav').getByRole('button', { name: nav, exact: true }).click();
    }
    if (sub) {
      const button = page.getByRole('button', { name: sub, exact: true });
      if (await button.count()) await button.click();
      else await page.getByText(sub, { exact: true }).click();
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth }));
    await page.screenshot({ path: resolve(dir, `${name}-${width}.png`), fullPage: true });
    if (phase === 'after') {
      assert.equal(errors.length, 0, `${name}: browser error`);
      assert.ok(metrics.pageWidth <= width, `${name}: page overflow`);
      if (name === 'manager-residence') {
        assert.deepEqual(await page.locator('.ui-overview-value').allTextContents(), ['3', '1', '1', '1']);
        await page.locator('.status-pill-tab').filter({ hasText: 'Đã duyệt' }).click();
        assert.equal(await page.locator('tbody tr').count(), 1, 'Status filter must still select the approved row');
        assert.ok((await page.locator('tbody').textContent()).includes('UI-2'));
        await page.locator('.ui-list-search input').fill('UI-3');
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.ui-overview-value').first().textContent(), '1', 'Existing API search count must be used');
      }
    }
    assert.equal(writes.length, 0, 'Visual check must not submit mutations');
    report.push({ name, width, ...metrics, errors, writes, fixture: true });
    console.log(JSON.stringify(report.at(-1)));
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(dir, 'report.json'), JSON.stringify(report, null, 2));
