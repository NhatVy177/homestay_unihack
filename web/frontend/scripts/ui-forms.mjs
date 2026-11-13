import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const phase = process.argv[2] || 'after';
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const dir = resolve('.ui-screens', `forms-${phase}`);
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = [];
try {
  for (const width of [1440, 390]) {
    for (const role of ['Admin', 'public']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
      const user = { maNguoiDung: 'UI-DEMO', vaiTro: 'NhanVien', chucVu: role, hoTen: 'Giao diện thử', maChiNhanh: 'CN-UI' };
      if (role !== 'public') await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-only', user: value })), user);
      const writes = [];
      await context.route('**/api/**', route => {
        const url = new URL(route.request().url());
        if (!url.pathname.startsWith('/api/')) return route.fallback();
        if (!['GET', 'OPTIONS'].includes(route.request().method())) writes.push(url.pathname);
        let json = [];
        if (url.pathname.endsWith('/auth/toi')) json = user;
        if (url.pathname.endsWith('/avalanche/config')) json = { enabled: false };
        if (url.pathname.endsWith('/admin/branches')) json = [{ maChiNhanh: 'CN-UI', tenChiNhanh: 'Chi nhánh giao diện', trangThai: 'Hoạt động' }];
        if (url.pathname.endsWith('/employees/next-id')) json = { maNhanVien: 'NV-UI' };
        return route.fulfill({ json });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const capture = async name => {
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
        const dialog = page.locator('.ktp-modal, .admin-modal, .tc-modal').last();
        const metrics = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
        const bounds = await dialog.boundingBox();
        const actions = dialog.locator('.ktp-modal-footer, .admin-modal-actions');
        const actionBounds = await actions.count() ? await actions.last().boundingBox() : null;
        await page.screenshot({ path: resolve(dir, `${name}-${width}.png`) });
        report.push({ name, width, ...metrics, dialog: bounds, actions: actionBounds, errors: [...errors], writes: [...writes] });
        assert.equal(errors.length, 0, `${name}: browser errors`);
        assert.equal(writes.length, 0, `${name}: should not submit any API mutation`);
        if (phase === 'after') {
          assert.ok(metrics.pageWidth <= width, `${name}: page overflows`);
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${name}: dialog overflows`);
          assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= (width === 390 ? 844 : 1000) + 1, `${name}: dialog exceeds viewport`);
          if (actionBounds) assert.ok(actionBounds.y >= 0 && actionBounds.y + actionBounds.height <= (width === 390 ? 844 : 1000) + 1, `${name}: actions outside viewport`);
        }
        console.log(JSON.stringify(report.at(-1)));
      };
      await page.goto(base + (role === 'Admin' ? '/nhan-vien-admin' : '/'), { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor();
      if (role === 'Admin') {
        await page.getByRole('button', { name: 'Tạo nhân viên', exact: true }).click();
        await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
        await page.getByRole('heading', { name: 'Tạo tài khoản mới', exact: true }).waitFor();
        await capture('admin-form');
        assert.ok(await page.locator('.admin-modal input[readonly]').count() > 0);
      } else {
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
        await capture('login-form');
        await page.getByRole('button', { name: 'Đăng ký', exact: true }).last().click();
        await page.getByRole('heading', { name: 'Tạo tài khoản mới' }).waitFor();
        await capture('register-form');
      }
      await context.close();
    }
  }
} finally { await browser.close(); }
await writeFile(resolve(dir, 'report.json'), JSON.stringify(report, null, 2));
