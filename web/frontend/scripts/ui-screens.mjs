import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Visual fixtures only. All API requests are intercepted; no real account or data is used.
const phase = process.argv[2] || 'after';
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5191';
const dir = resolve('.ui-screens', phase);
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const screens = [
  ['trang-chu', '/'], ['dang-nhap', '/'],
  ['cong-khach', '/khach-hang', 'KhachHang'],
  ['sale', '/nhan-vien-sale', 'Sale'],
  ['quan-ly', '/nhan-vien-quan-ly', 'Quản lý'],
  ['ke-toan', '/nhan-vien-ke-toan', 'Kế toán'],
  ['admin', '/nhan-vien-admin', 'Admin'],
];
const report = [];
try {
  for (const width of [1440, 390]) for (const [name, path, role] of screens) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const user = { maNguoiDung: 'UI-DEMO', maNhanVien: 'UI-DEMO', hoTen: 'Tài khoản giao diện', tenDangNhap: 'ui-demo', maChiNhanh: 'CN-DEMO', tenChiNhanh: 'Chi nhánh demo', vaiTro: role === 'KhachHang' ? role : 'NhanVien', chucVu: role };
    if (role) await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
    await context.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.fallback();
      let json = [];
      if (url.pathname.endsWith('/auth/toi')) json = user;
      if (url.pathname.endsWith('/avalanche/config')) json = { enabled: false };
      if (url.pathname.includes('tong-quan')) json = {};
      return route.fulfill({ json });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor();
    if (name === 'dang-nhap') await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: innerWidth,
      title: document.querySelector('h1,h2')?.textContent,
      headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
      fontsLoaded: document.fonts.check('600 16px Lexend') && document.fonts.check('400 16px Inter'),
    }));
    const filename = `${name}-${width}.png`;
    await page.screenshot({ path: resolve(dir, filename), fullPage: true });
    if (name === 'dang-nhap') await page.screenshot({ path: resolve(dir, `dang-nhap-${width}-viewport.png`) });
    let menu;
    if (phase === 'after' && width === 390 && role && role !== 'KhachHang') {
      const toggle = page.getByRole('button', { name: 'Mở menu', exact: true });
      if (await toggle.count()) {
        await toggle.click();
        const sidebar = page.locator('.ui-employee-shell aside, .app-shell aside');
        menu = await sidebar.isVisible();
        await page.screenshot({ path: resolve(dir, `${name}-${width}-menu.png`), fullPage: true });
        await page.getByRole('button', { name: 'Đóng menu', exact: true }).first().click();
        menu &&= !(await sidebar.isVisible());
        await toggle.click();
        await page.keyboard.press('Escape');
        menu &&= !(await sidebar.isVisible());
      } else menu = false;
    }
    report.push({ name, width, url: page.url(), ...metrics, errors, menu, fixture: Boolean(role), file: filename });
    console.log(JSON.stringify(report.at(-1)));
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(dir, 'report.json'), JSON.stringify(report, null, 2));
if (report.some(item => item.errors.length || (phase === 'after' && (item.scrollWidth > item.width || item.menu === false)))) process.exitCode = 1;
