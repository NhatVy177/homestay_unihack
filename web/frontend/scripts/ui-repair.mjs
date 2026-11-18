import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Báo hỏng: khách gửi mô tả + ảnh từ cổng khách; quản lý tiếp nhận rồi hoàn tất với "không do khách". API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/repair';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const customer = { maNguoiDung: 'KH0001', hoTen: 'Khách thử', vaiTro: 'KhachHang', email: 'k@example.com' };
const manager = { maNguoiDung: 'NV0007', hoTen: 'Quản lý thử', vaiTro: 'NhanVien', chucVu: 'Quản lý', maChiNhanh: 'CN0002' };
try {
  for (const width of [1440, 390]) {
    const items = [], writes = [];
    for (const [role, user, path] of [['customer', customer, '/khach-hang?tab=bao-hong'], ['manager', manager, '/nhan-vien-quan-ly']]) {
      const errors = [];
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await ctx.addInitScript((value) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
      await ctx.route('**/api/**', async (route) => {
        const req = route.request(), url = new URL(req.url()), p = url.pathname;
        if (!p.startsWith('/api/')) return route.fallback();
        if (p.endsWith('/auth/toi')) return route.fulfill({ json: user });
        if (p.includes('tong-quan')) return route.fulfill({ json: { trangThai: { soHopDong: 1, soPhieuCoc: 1 } } });
        if (p.endsWith('/sua-chua-bao-tri/hop-dong-cua-toi')) return route.fulfill({ json: [{ maHopDong: 'HD0001', maPhong: 'P101', tenPhong: 'Phòng P101' }] });
        if (p.endsWith('/sua-chua-bao-tri') && req.method() === 'GET') return route.fulfill({ json: items });
        if (p.endsWith('/sua-chua-bao-tri') && req.method() === 'POST') {
          const body = req.postDataJSON(); writes.push(['tao', body]);
          items.unshift({ maYeuCau: 'SC0001', ngayYeuCau: '2026-11-18', loai: body.loai, moTa: body.moTa, anh: body.anh.map((_, i) => `/uploads/sua-chua/SC0001-${i + 1}.png`), trangThai: 'Chờ tiếp nhận', maHopDong: 'HD0001', tenPhong: 'Phòng P101', hoTenKhach: 'Khách thử', sdtKhach: '0900000000' });
          return route.fulfill({ status: 201, json: items[0] });
        }
        const action = /\/sua-chua-bao-tri\/(SC\d+)\/(tiep-nhan|hoan-tat|tu-choi)$/.exec(p);
        if (action) {
          const body = req.postDataJSON(); writes.push([action[2], body]);
          Object.assign(items[0], action[2] === 'tiep-nhan' ? { trangThai: 'Đang xử lý', ngayTiepNhan: '2026-11-18' } : { trangThai: 'Hoàn tất', ngayHoanTat: '2026-11-18', chiPhi: body.chiPhi, loiDoKhach: body.loiDoKhach, ghiChu: body.ghiChu, trangThaiPhi: body.loiDoKhach ? 'Đã xác nhận' : null });
          return route.fulfill({ json: items[0] });
        }
        return route.fulfill({ json: [] });
      });
      await ctx.route('**/uploads/**', (route) => route.fulfill({ contentType: 'image/png', body: png }));
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
      if (role === 'customer') {
        await page.getByRole('heading', { name: 'Báo hư hỏng trong phòng' }).waitFor();
        await page.getByLabel(/Loại hư hỏng/).selectOption('Nước, vòi, bồn cầu');
        await page.getByLabel(/Mô tả hư hỏng/).fill('Vòi nước bồn rửa bị rỉ');
        await page.locator('input[type=file]').setInputFiles({ name: 'hong.png', mimeType: 'image/png', buffer: png });
        await page.locator('.scb-thumb').first().waitFor();
        await page.getByRole('button', { name: 'Gửi báo hỏng' }).click();
        await page.getByText('Đã gửi báo hỏng').waitFor();
        assert.equal(writes[0][1].maHopDong, 'HD0001');
        assert.equal(writes[0][1].loai, 'Nước, vòi, bồn cầu');
        assert.match(writes[0][1].anh[0], /^data:image\/jpeg;base64,/, 'ảnh được thu nhỏ thành JPEG trước khi gửi');
        assert.equal(await page.locator('.scb-item').count(), 1);
        await page.screenshot({ path: `${folder}/customer-${width}.png`, fullPage: true });
      } else {
        if (width === 390) await page.locator('.ui-navigation-toggle').click();
        await page.locator('aside nav button', { hasText: 'Báo hỏng & sửa chữa' }).click();
        const item = page.locator('.scb-item').first();
        await item.waitFor();
        assert.match(await item.innerText(), /Khách thử/);
        await item.getByRole('button', { name: 'Tiếp nhận' }).click();
        await item.getByRole('button', { name: 'Đã sửa xong' }).click();
        await item.getByText('Do khách gây ra').click();
        await item.getByRole('spinbutton').fill('350000');
        await item.getByLabel(/Lý do tính cho khách/).fill('Khách làm vỡ bồn rửa');
        await item.getByRole('button', { name: 'Xác nhận hoàn tất' }).click();
        await page.getByText('350.000đ sẽ được cộng vào hóa đơn tháng kế tiếp.').waitFor();
        assert.deepEqual(writes.at(-1), ['hoan-tat', { chiPhi: 350000, loiDoKhach: true, ghiChu: 'Khách làm vỡ bồn rửa' }]);
        await page.screenshot({ path: `${folder}/manager-${width}.png`, fullPage: true });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `${role} không tràn ngang`);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
  }
  console.log('PASS repair: customer reports with a shrunk photo; manager accepts and completes as not the tenant\'s fault; fixture APIs only.');
} finally { await browser.close(); }
