import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

// C4 / D-041 check on the manager's "Kết thúc hợp đồng" tab: a contract whose refund is unpaid
// stays open and lists what is missing even after the keys are returned; the no-consent close
// stays locked until money and evidence are complete; a closed contract offers the evidence bundle.
// Visual fixtures only: every /api request is intercepted, all names are made up.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5192';
await mkdir('.ui-screens/checkout-closure', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const user = { maNguoiDung: 'UI-DEMO', maNhanVien: 'UI-DEMO', hoTen: 'Quản lý demo', tenDangNhap: 'ui-demo', maChiNhanh: 'CN-DEMO', tenChiNhanh: 'Chi nhánh demo', vaiTro: 'NhanVien', chucVu: 'Quản lý' };
const row = (id, patch) => ({
  contractId: id, settlementId: `DS-${id}`, hasReturn: true, closed: false, mode: null, mailStatus: null,
  keysReturnedAt: null, canReturnKeys: true, response: { overdue: false },
  money: { ready: true, missing: [] }, exception: { allowed: false }, exceptionPrepared: false, canCloseWithoutConsent: false, ...patch,
});
const rows = [
  row('HD-UNPAID', { keysReturnedAt: '2026-11-12T03:00:00.000Z', canReturnKeys: false, response: { overdue: true },
    money: { ready: false, missing: ['Chưa có chứng từ chi hoàn cọc 1.200.000đ.'] }, exception: { allowed: true }, exceptionPrepared: true }),
  row('HD-READY', {}),
  row('HD-CLOSED', { closed: true, mode: 'without-consent', mailStatus: 'sent', keysReturnedAt: '2026-11-10T03:00:00.000Z', canReturnKeys: false }),
];

const results = [];
let failed = false;
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/checkout-lifecycle')) return route.fulfill({ json: rows });
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/nhan-vien-quan-ly?tab=lap-bien-ban-kiem-tra-phong`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Kết thúc hợp đồng' }).click();
    const unpaid = page.locator('tbody tr', { hasText: 'HD-UNPAID' });
    await unpaid.waitFor({ timeout: 8000 });
    const closed = page.locator('tbody tr', { hasText: 'HD-CLOSED' });
    const check = {
      unpaidMissing: (await unpaid.locator('.checkout-missing').innerText()).trim(),
      unpaidKeys: (await unpaid.locator('td').nth(3).innerText()).trim(),
      unpaidStillOpen: (await unpaid.getByText('Quá hạn phản hồi').count()) > 0,
      noConsentLocked: await unpaid.getByRole('button', { name: 'Thanh lý không có xác nhận của khách' }).isDisabled(),
      readyKeyButton: await page.locator('tbody tr', { hasText: 'HD-READY' }).getByRole('button', { name: 'Đã thu chìa khóa' }).count(),
      closedBundle: await closed.getByRole('button', { name: 'Tải gói bằng chứng' }).count(),
      closedLabel: (await closed.getByText('Đóng không có xác nhận của khách').count()) > 0,
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    };
    await page.screenshot({ path: `.ui-screens/checkout-closure/ket-thuc-${width}.png`, fullPage: true });
    const ok = !errors.length && /chứng từ chi hoàn cọc/.test(check.unpaidMissing) && check.unpaidKeys === 'Đã thu chìa khóa'
      && check.unpaidStillOpen && check.noConsentLocked && check.readyKeyButton === 1 && check.closedBundle === 1
      && check.closedLabel && check.scrollWidth <= width;
    failed ||= !ok;
    results.push({ width, ok, ...check, errors });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
console.log(failed ? 'FAIL: checkout closure check' : 'PASS: unpaid refund stays open with keys returned, no-consent close locked, closed contract offers the bundle; no horizontal scroll or browser errors.');
process.exitCode = failed ? 1 : 0;
