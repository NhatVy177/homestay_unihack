import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Đăng nhập / đăng ký bằng Google: nút chỉ hiện khi máy chủ có cấu hình; email mới phải bổ sung thông tin; ở lại trang chủ sau khi xong.
// Google và API đều là fixture (không gọi Google thật).
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/google-auth';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const fakeGoogle = `window.google = { accounts: { id: { initialize(o) { window.__cb = o.callback; }, renderButton(el) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Tiếp tục với Google (giả lập)'; b.onclick = () => window.__cb({ credential: 'fake-credential' }); el.appendChild(b); } } } };`;
const customer = { maNguoiDung: 'KH9100', tenDangNhap: 'khach@gmail.com', hoTen: 'Khách Google', email: 'khach@gmail.com', vaiTro: 'KhachHang' };
try {
  for (const width of [1440, 390]) {
    for (const enabled of [false, true]) {
      const errors = [], posts = [];
      let existing = false;
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await ctx.route('https://accounts.google.com/gsi/client', (route) => route.fulfill({ contentType: 'text/javascript', body: fakeGoogle }));
      await ctx.route('**/api/**', (route) => {
        const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
        if (!path.startsWith('/api/')) return route.fallback();
        if (path === '/api/auth/google/cau-hinh') return route.fulfill({ json: enabled ? { enabled: true, clientId: 'fixture.apps.googleusercontent.com' } : { enabled: false, clientId: null } });
        if (path === '/api/auth/google' && method === 'POST') { posts.push(['google', req.postDataJSON()]); return route.fulfill({ json: existing ? { token: 't', user: customer } : { needsProfile: true, email: 'khach@gmail.com', hoTen: 'Khách Google', profileToken: 'profile-token' } }); }
        if (path === '/api/auth/google/hoan-tat' && method === 'POST') { posts.push(['finish', req.postDataJSON()]); return route.fulfill({ status: 201, json: { token: 't', user: customer } }); }
        if (path === '/api/auth/toi') return route.fulfill({ json: customer });
        if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
        if (method === 'GET') return route.fulfill({ json: [] });
        throw new Error(`Unexpected ${method} ${path} ${req.postData() || ''}`);
      });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Đăng nhập' }).first().click().catch(async () => {
        await page.locator('.tc-nav-toggle, .tc-menu-toggle, .tc-hamburger').first().click();
        await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
      });
      await page.locator('input[name="tenDangNhap"]').first().waitFor();
      const googleButton = page.getByRole('button', { name: /Tiếp tục với Google/ });
      if (!enabled) {
        await page.waitForTimeout(600);
        assert.equal(await googleButton.count(), 0, 'chưa cấu hình thì không hiện nút Google');
        await ctx.close(); continue;
      }
      await googleButton.waitFor();
      await page.screenshot({ path: `${folder}/login-${width}.png` });
      await googleButton.click();
      const dialog = page.getByRole('dialog', { name: 'Hoàn tất đăng ký' });
      await dialog.getByText('khach@gmail.com').waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Tạo tài khoản' }).isDisabled(), true, 'thiếu số điện thoại thì chưa tạo được');
      await dialog.getByLabel('Ngày sinh').fill('2003-05-20');
      await dialog.getByLabel('Giới tính').selectOption('Nữ');
      await dialog.getByLabel('Số điện thoại').fill('0912345678');
      await page.screenshot({ path: `${folder}/profile-${width}.png` });
      await dialog.getByRole('button', { name: 'Tạo tài khoản' }).click();
      await page.locator('.acm-trigger').waitFor();
      assert.equal(new URL(page.url()).pathname, '/', 'xong vẫn ở trang chủ');
      assert.deepEqual(posts.map((p) => p[0]), ['google', 'finish']);
      assert.deepEqual([posts[1][1].profileToken, posts[1][1].ngaySinh, posts[1][1].gioiTinh, posts[1][1].soDienThoai], ['profile-token', '2003-05-20', 'Nữ', '0912345678']);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
  }
  console.log('PASS google auth: button hidden without config, new email completes profile then stays on the homepage; Google and API are fixtures.');
} finally { await browser.close(); }
