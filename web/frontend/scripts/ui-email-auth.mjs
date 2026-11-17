import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Đăng nhập bằng email, quên mật khẩu bằng OTP, đăng ký không còn ô tên đăng nhập, form đăng nhập không có thanh cuộn bên trong,
// mục dịch vụ ở trang chủ và liên kết /#phong-noi-bat cuộn tới mục phòng. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/email-auth';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const room = { MaPhong: 'P0101', TenPhong: 'Phòng 101', MaLoaiPhong: 'LP0001', TenLoaiPhong: 'Dorm', GiaThue: 1500000, GiaThueThang: 1500000, TrangThai: 'Trống' };
try {
  for (const [width, height] of [[1440, 700], [390, 700]]) {
    const errors = [], calls = [];
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await ctx.route('**/api/**', async (route) => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (req.method() !== 'GET') calls.push([path, req.postDataJSON?.() ?? null]);
      if (path === '/api/auth/quen-mat-khau') return route.fulfill({ json: { ok: true } });
      if (path === '/api/auth/dat-lai-mat-khau') {
        const body = req.postDataJSON();
        return body.otp === '123456' ? route.fulfill({ json: { ok: true } }) : route.fulfill({ status: 400, json: { message: 'Mã OTP không đúng.' } });
      }
      if (path === '/api/auth/google/cau-hinh') return route.fulfill({ json: { enabled: false } });
      if (path.includes('phong-noi-bat') || path.endsWith('/kham-pha-phong')) return route.fulfill({ json: [room] });
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    assert.ok(await page.locator('#dich-vu').count(), 'có mục dịch vụ');
    assert.match(await page.locator('#dich-vu').innerText(), /Dịch vụ thiết yếu/);
    await page.getByRole('button', { name: /^Đăng nhập$/ }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /Tên hoặc email đăng nhập/);
    const inner = await dialog.evaluate((el) => ({ overflowY: getComputedStyle(el).overflowY, scrolls: el.scrollHeight > el.clientHeight + 1 }));
    assert.ok(inner.overflowY !== 'auto' && inner.overflowY !== 'scroll' && !inner.scrolls, 'khung đăng nhập không có thanh cuộn bên trong');
    await page.screenshot({ path: `${folder}/login-${width}.png` });
    await dialog.getByRole('button', { name: 'Quên mật khẩu?' }).click();
    await dialog.getByLabel('Email').fill('khach@example.com');
    await dialog.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await dialog.getByLabel('Mã OTP').waitFor();
    assert.deepEqual(calls.at(-1), ['/api/auth/quen-mat-khau', { email: 'khach@example.com' }]);
    await dialog.getByLabel('Mã OTP').fill('000000');
    await dialog.getByLabel('Mật khẩu mới').fill('matkhau1');
    await dialog.getByLabel('Xác nhận mật khẩu').fill('matkhau1');
    await dialog.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await dialog.getByText('Mã OTP không đúng.').waitFor();
    await dialog.getByLabel('Mã OTP').fill('123456');
    await dialog.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await dialog.getByLabel('Tên hoặc email đăng nhập').waitFor();
    assert.equal(await dialog.getByLabel('Tên hoặc email đăng nhập').inputValue(), 'khach@example.com', 'quay lại đăng nhập với email đã nhập');
    assert.deepEqual(calls.at(-1)[1], { email: 'khach@example.com', otp: '123456', matKhauMoi: 'matkhau1' });
    await dialog.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    assert.equal(await dialog.getByText('Tên đăng nhập').count(), 0, 'đăng ký không còn ô tên đăng nhập');
    assert.ok(await dialog.getByLabel(/^Email/).count());
    const reg = await dialog.evaluate((el) => ({ overflowY: getComputedStyle(el).overflowY }));
    assert.ok(reg.overflowY !== 'auto' && reg.overflowY !== 'scroll');
    await page.screenshot({ path: `${folder}/register-${width}.png` });
    await page.goto(`${base}/#phong-noi-bat`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.scrollY > 300, null, { timeout: 5000 });
    const top = await page.locator('#phong-noi-bat').evaluate((el) => Math.round(el.getBoundingClientRect().top));
    assert.ok(top < 200 && top > -100, `mục phòng nằm gần đầu màn hình (top=${top})`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS email auth: email login label, forgot-password OTP flow, register without username, no inner scroll, services section, #phong-noi-bat jump; fixture APIs only.');
} finally { await browser.close(); }
