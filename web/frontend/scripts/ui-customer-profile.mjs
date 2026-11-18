import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Cổng khách: tab đầu là Thông tin cá nhân (thông tin nằm gọn trong thẻ ảnh đại diện, không còn khối hàng riêng), Thông tin cư trú không bị khóa
// và hiện người đại diện khi chưa có phiếu cọc, góc phải là menu xổ xuống (Thông tin cá nhân / Đăng xuất) thay vì nút đăng xuất lộ sẵn. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/customer-profile';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const user = { maNguoiDung: 'KH9319', hoTen: 'Nguyễn Văn A', tenDangNhap: 'a@example.com', email: 'a@example.com', soDienThoai: '0188939399', gioiTinh: 'Nữ', ngaySinh: '2000-01-02', vaiTro: 'KhachHang', trangThai: 'Hoạt động' };
const room = { maPhong: 'P101', tenPhong: 'Phòng giao diện 101', loaiPhong: 'Phòng 2 người', chiNhanh: 'Chi nhánh giao diện', giaThue: 2200000,
  hinhAnh: [{ stt: 1, urlAnh: `${base}/images/home/hero.jpg` }] };
try {
  for (const width of [1440, 390]) {
    const errors = [], avatarWrites = [];
    const fixtureUser = { ...user, avatarUrl: width === 390 ? `${base}/images/home/room.jpg` : null };
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((value) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), fixtureUser);
    await ctx.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: fixtureUser });
      if (path.endsWith('/auth/avatar')) {
        avatarWrites.push({ method: route.request().method(), body: route.request().postDataJSON() });
        return route.fulfill({ json: { avatarUrl: `${base}/images/home/hero.jpg` } });
      }
      if (path.includes('tong-quan')) return route.fulfill({ json: {} });
      if (path.endsWith('/cu-tru')) return route.fulfill({ json: { phieu: [] } });
      if (path === '/api/trang-chu/kham-pha-phong') return route.fulfill({ json: { data: [room] } });
      if (path === '/api/trang-chu/phong/P101') return route.fulfill({ json: { data: room } });
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/khach-hang`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Thông tin cá nhân', level: 1 }).waitFor();
    if (width === 390) await page.locator('.ui-navigation-toggle').click();
    const items = await page.locator('aside nav button').allInnerTexts();
    assert.deepEqual(items.slice(0, 3).map((t) => t.trim()), ['Thông tin cá nhân', 'Thông tin cư trú', 'Hồ sơ đăng ký']);
    assert.equal(await page.locator('aside nav button.is-locked', { hasText: 'Thông tin cư trú' }).count(), 0, 'thông tin cư trú không khóa');
    if (width === 390) await page.keyboard.press('Escape');
    assert.equal(await page.locator('.kp-info-panel').count(), 0, 'không còn khối hàng thông tin riêng');
    const card = page.locator('.acs-card').first();
    const text = await card.innerText();
    for (const part of ['Nguyễn Văn A', 'KH9319', '0188939399', 'a@example.com']) assert.ok(text.includes(part), `thẻ ảnh đại diện có ${part}`);
    assert.doesNotMatch(text, /Đổi ảnh|Xóa ảnh|Ảnh đại diện: PNG/);
    const pencil = card.getByRole('button', { name: 'Chỉnh ảnh đại diện', exact: true });
    const avatarBounds = await card.locator('.acs-avatar').boundingBox(), pencilBounds = await pencil.boundingBox();
    assert.ok(pencilBounds.x > avatarBounds.x && pencilBounds.y > avatarBounds.y);
    assert.ok(pencilBounds.x < avatarBounds.x + avatarBounds.width && pencilBounds.y < avatarBounds.y + avatarBounds.height, 'bút nằm chồng lên góc ảnh');
    await pencil.focus();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
    await card.getByRole('alert').filter({ hasText: 'Ảnh phải là PNG, JPG hoặc WebP.' }).waitFor();
    assert.equal(avatarWrites.length, 0);
    await card.locator('input[type=file]').setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
    await card.getByRole('alert').filter({ hasText: 'Ảnh tối đa 2MB.' }).waitFor();
    assert.equal(avatarWrites.length, 0);
    const nextChooser = page.waitForEvent('filechooser'); await pencil.click();
    await (await nextChooser).setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=', 'base64') });
    await card.getByRole('status').filter({ hasText: 'Đã cập nhật ảnh đại diện.' }).waitFor();
    assert.equal(avatarWrites.length, 1); assert.equal(avatarWrites[0].method, 'PUT'); assert.match(avatarWrites[0].body.anh, /^data:image\/png;base64,/);
    assert.equal(await card.locator('.acs-avatar img').getAttribute('src'), `${base}/images/home/hero.jpg`);
    await card.locator('.acs-avatar img').evaluate(image => image.decode());
    await card.screenshot({ path: `${folder}/avatar-pencil-${width}.png` });
    assert.equal(await page.getByRole('button', { name: 'Đăng xuất' }).count(), 0, 'không để nút đăng xuất lộ sẵn');
    const trigger = page.locator('.acm--shell .acm-trigger');
    await trigger.click();
    assert.ok(await page.getByRole('menuitem', { name: 'Thông tin cá nhân' }).isVisible());
    assert.ok(await page.getByRole('menuitem', { name: 'Đăng xuất' }).isVisible());
    await page.screenshot({ path: `${folder}/profile-${width}.png` });
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    if (width === 390) await page.locator('.ui-navigation-toggle').click();
    await page.locator('aside nav button', { hasText: 'Thông tin cư trú' }).click();
    await page.getByRole('heading', { name: 'Thông tin cư trú', level: 2 }).waitFor();
    await page.getByText('NGƯỜI ĐẠI DIỆN').waitFor();
    assert.match(await page.locator('.cres-page').innerText(), /NGƯỜI ĐẠI DIỆN[\s\S]*Nguyễn Văn A/);
    await page.screenshot({ path: `${folder}/residence-${width}.png` });
    if (width === 390) await page.locator('.ui-navigation-toggle').click();
    // Mục "Khám phá phòng" trong cổng khách đã bỏ (D-067): vào danh sách phòng từ cổng bằng trạng thái điều hướng như trước.
    await page.evaluate(() => { history.pushState({ usr: { customerPortalTab: 'tai-khoan' }, key: 'fixture', idx: (history.state?.idx || 0) + 1 }, '', '/phong'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.getByRole('heading', { name: 'Danh sách phòng', exact: true }).waitFor();
    const returnToPortal = page.getByRole('button', { name: 'Quay lại', exact: true });
    assert.equal(await returnToPortal.isVisible(), true);
    await page.screenshot({ path: `${folder}/rooms-return-${width}.png` });
    // Reload and clearing a search must retain the original portal tab.
    await page.evaluate(() => history.replaceState(history.state, '', '/phong?khuVuc=fixture'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.dsp-clear').click();
    await page.waitForURL('**/phong');
    assert.equal(await returnToPortal.isVisible(), true);
    await page.locator('.hx-room-card .hx-room-view').first().click();
    await page.waitForURL('**/phong/P101');
    await page.locator('.kh-detail-back').click();
    await page.waitForURL('**/phong');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await returnToPortal.click();
    await page.waitForURL('**/khach-hang?tab=cu-tru');
    await page.getByRole('heading', { name: 'Thông tin cư trú', level: 2 }).waitFor();
    await page.goto(`${base}/phong`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Danh sách phòng', exact: true }).waitFor();
    assert.equal(await returnToPortal.count(), 0, 'không hiện nút trở về cổng khi mở danh sách trực tiếp');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS customer profile: personal info first, info inside avatar card, residence unlocked with representative, account dropdown with logout confirm; fixture APIs only.');
} finally { await browser.close(); }
