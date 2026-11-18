import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Trang chủ sau đăng nhập: ở lại trang chủ, menu tài khoản có "Tài khoản của tôi" và "Đăng xuất" (luôn hỏi lại). API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/account-menu';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const customer = { maNguoiDung: 'KH9001', tenDangNhap: 'khachdemo', hoTen: 'Khách Demo', email: 'khach@example.com', vaiTro: 'KhachHang' };
try {
  for (const width of [1440, 390]) {
    let loggedOut = false;
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
      if (!path.startsWith('/api/')) return route.fallback();
      if (path === '/api/auth/dang-nhap' && method === 'POST') return route.fulfill({ json: { token: 'fixture-only', user: customer } });
      if (path === '/api/auth/toi') return route.fulfill({ json: customer });
      if (path === '/api/auth/dang-xuat' && method === 'POST') { loggedOut = true; return route.fulfill({ json: { ok: true } }); }
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: { trangThai: { soLichXem: 0, soHoSo: 0, soPhieuCoc: 0 }, hoSo: [], lichXem: [], phongGoiY: [] } });
      if (method === 'GET') return route.fulfill({ json: [] });
      throw new Error(`Unexpected ${method} ${path}`);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.tc-nav-actions').getByRole('button', { name: 'Đăng nhập' }).click({ timeout: 15000 }).catch(async () => {
      await page.locator('.tc-nav-toggle, .tc-menu-toggle, .tc-hamburger').first().click().catch(() => {});
      await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
    });
    await page.locator('input[name="tenDangNhap"]').first().fill('khachdemo');
    await page.locator('input[name="matKhau"]').first().fill('123456');
    await page.locator('form').getByRole('button', { name: /Đăng nhập/ }).last().click();
    const trigger = page.locator('.acm-trigger');
    await trigger.waitFor();
    assert.equal(new URL(page.url()).pathname, '/', 'sau đăng nhập vẫn ở trang chủ');
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Tài khoản của tôi' }).waitFor();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).waitFor();
    await page.screenshot({ path: `${folder}/menu-${width}.png` });
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByText('Xác nhận đăng xuất', { exact: true }).waitFor();
    const layout = await dialog.evaluate(element => {
      const actions = [...element.querySelectorAll('.lc-actions button')].map(button => { const r = button.getBoundingClientRect(); return { top: r.top, width: r.width, height: r.height }; });
      const rect = element.getBoundingClientRect();
      return { actions, left: rect.left, right: rect.right, align: getComputedStyle(element).textAlign, icon: Boolean(element.querySelector('.lc-symbol .ui-icon')) };
    });
    assert.equal(layout.align, 'center');
    assert.equal(layout.icon, true);
    assert.equal(await dialog.locator('.lc-symbol .ui-icon').evaluate(icon => getComputedStyle(icon).width), '32px');
    assert.ok(layout.left >= 0 && layout.right <= width);
    assert.equal(layout.actions[0].top, layout.actions[1].top, 'two balanced actions stay on the same row');
    assert.equal(layout.actions[0].width, layout.actions[1].width);
    assert.ok(layout.actions.every(button => button.height >= 44));
    await page.screenshot({ path: `${folder}/confirm-${width}.png` });
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(loggedOut, false, 'hủy thì chưa đăng xuất');
    for (const cancel of ['close', 'escape', 'backdrop']) {
      await trigger.click();
      await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
      if (cancel === 'close') await dialog.getByRole('button', { name: 'Đóng hộp thoại đăng xuất' }).click();
      if (cancel === 'escape') await page.keyboard.press('Escape');
      if (cancel === 'backdrop') await page.locator('.lc-overlay').click({ position: { x: 4, y: 4 } });
      await dialog.waitFor({ state: 'detached' });
      assert.equal(loggedOut, false, `${cancel} keeps session`);
    }
    await trigger.waitFor();
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Tài khoản của tôi' }).click();
    await page.waitForURL('**/khach-hang');
    assert.equal(loggedOut, false);
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.acm-trigger').click();
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.locator('.tc-nav-actions').getByRole('button', { name: 'Đăng nhập' }).or(page.getByRole('button', { name: 'Đăng nhập' }).first()).waitFor();
    assert.equal(loggedOut, true, 'xác nhận thì mới đăng xuất');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS account menu: stay on homepage after login, "Tài khoản của tôi" opens the portal, logout asks first (cancel keeps the session); fixture APIs only.');
} finally { await browser.close(); }
