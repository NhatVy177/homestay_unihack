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
    let nextId = 0, failUpdate = false;
    for (const [role, user, path] of [['customer', customer, '/khach-hang?tab=bao-hong'], ['manager', manager, '/nhan-vien-quan-ly'], ['customer-readonly', customer, '/khach-hang?tab=bao-hong']]) {
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
          const id = `SC${String(++nextId).padStart(4, '0')}`;
          items.unshift({ maYeuCau: id, ngayYeuCau: '2026-11-18', loai: body.loai, moTa: body.moTa, anh: body.anh.map((_, i) => `/uploads/sua-chua/${id}-${i + 1}.png`), trangThai: 'Chờ tiếp nhận', maHopDong: 'HD0001', tenPhong: 'Phòng P101', hoTenKhach: 'Khách thử', sdtKhach: '0900000000' });
          return route.fulfill({ status: 201, json: items[0] });
        }
        const ownerAction = /\/sua-chua-bao-tri\/(SC\d+)$/.exec(p);
        if (ownerAction && ['PUT', 'DELETE'].includes(req.method())) {
          const id = ownerAction[1], index = items.findIndex(item => item.maYeuCau === id), item = items[index];
          const body = req.method() === 'PUT' ? req.postDataJSON() : null;
          writes.push([req.method(), id, body]);
          if (failUpdate && req.method() === 'PUT') return route.fulfill({ status: 503, json: { message: 'Chưa lưu được. Vui lòng thử lại.' } });
          if (item.trangThai !== 'Chờ tiếp nhận') return route.fulfill({ status: 409, json: { message: 'Báo hỏng đã được tiếp nhận. Vui lòng tải lại.' } });
          if (req.method() === 'DELETE') { items.splice(index, 1); return route.fulfill({ json: { maYeuCau: id, daXoa: true } }); }
          Object.assign(item, { loai: body.loai, moTa: body.moTa, anh: [...body.giuAnh, ...body.anhMoi.map((_, i) => `/uploads/sua-chua/${id}-edit-${i + 1}.jpg`)] });
          return route.fulfill({ json: item });
        }
        const action = /\/sua-chua-bao-tri\/(SC\d+)\/(tiep-nhan|hoan-tat|tu-choi)$/.exec(p);
        if (action) {
          const body = req.postDataJSON(); writes.push([action[2], body]);
          const item = items.find(item => item.maYeuCau === action[1]);
          Object.assign(item, action[2] === 'tiep-nhan' ? { trangThai: 'Đang xử lý', ngayTiepNhan: '2026-11-18' } : { trangThai: 'Hoàn tất', ngayHoanTat: '2026-11-18', chiPhi: body.chiPhi, loiDoKhach: body.loiDoKhach, ghiChu: body.ghiChu, trangThaiPhi: body.loiDoKhach ? 'Đã xác nhận' : null });
          return route.fulfill({ json: item });
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
        const add = page.getByRole('button', { name: 'Thêm ảnh hư hỏng', exact: true });
        await add.waitFor();
        assert.equal(await add.locator('.ui-icon').evaluate(icon => getComputedStyle(icon).width), '24px');
        await add.screenshot({ path: `${folder}/add-photo-${width}.png` });
        const [cancelledChooser] = await Promise.all([page.waitForEvent('filechooser'), add.click()]);
        await cancelledChooser.setFiles([]);
        assert.equal(await page.locator('.scb-thumb').count(), 0);
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), add.click()]);
        await chooser.setFiles([1, 2, 3].map(index => ({ name: `hong-${index}.png`, mimeType: 'image/png', buffer: png })));
        await page.locator('.scb-thumb').first().waitFor();
        await add.waitFor({ state: 'detached' });
        assert.equal(await page.locator('.scb-thumb').count(), 3);
        await page.getByRole('button', { name: 'Bỏ ảnh 3', exact: true }).click();
        await page.getByRole('button', { name: 'Bỏ ảnh 2', exact: true }).click();
        await add.waitFor();
        assert.equal(await page.locator('.scb-thumb').count(), 1);
        await page.locator('.scb-form').screenshot({ path: `${folder}/upload-${width}.png` });
        await page.getByRole('button', { name: 'Gửi báo hỏng' }).click();
        await page.getByText('Đã gửi báo hỏng').waitFor();
        assert.equal(writes[0][1].maHopDong, 'HD0001');
        assert.equal(writes[0][1].loai, 'Nước, vòi, bồn cầu');
        assert.match(writes[0][1].anh[0], /^data:image\/jpeg;base64,/, 'ảnh được thu nhỏ thành JPEG trước khi gửi');
        assert.equal(await page.locator('.scb-item').count(), 1);
        const report = page.locator('.scb-item').filter({ hasText: 'SC0001' });
        await report.getByRole('button', { name: 'Sửa', exact: true }).click();
        await report.getByLabel(/Mô tả hư hỏng/).fill('Nội dung chưa lưu');
        await report.getByRole('button', { name: 'Hủy', exact: true }).click();
        assert.equal(await report.getByRole('heading').innerText(), 'Vòi nước bồn rửa bị rỉ');
        await report.getByRole('button', { name: 'Sửa', exact: true }).click();
        await report.getByLabel(/Loại hư hỏng/).selectOption('Cửa, khóa');
        await report.getByLabel(/Mô tả hư hỏng/).fill('Khóa cửa bị kẹt');
        const [editChooser] = await Promise.all([page.waitForEvent('filechooser'), report.getByRole('button', { name: 'Thêm ảnh hư hỏng' }).click()]);
        await editChooser.setFiles([1, 2, 3].map(index => ({ name: `edit-${index}.png`, mimeType: 'image/png', buffer: png })));
        await report.locator('.scb-thumb').nth(2).waitFor();
        assert.equal(await report.locator('.scb-thumb').count(), 3, 'existing and new photos share the three-photo limit');
        assert.equal(await report.getByRole('button', { name: 'Thêm ảnh hư hỏng' }).count(), 0);
        await report.getByRole('button', { name: 'Bỏ ảnh mới 2', exact: true }).click();
        await report.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
        await report.getByRole('button', { name: 'Sửa', exact: true }).waitFor();
        assert.equal(await report.getByRole('heading').innerText(), 'Khóa cửa bị kẹt');
        assert.equal(await report.locator('.scb-photos a').count(), 2);
        assert.equal(writes.at(-1)[0], 'PUT');
        assert.match(writes.at(-1)[2].anhMoi[0], /^data:image\/jpeg;base64,/);
        failUpdate = true;
        await report.getByRole('button', { name: 'Sửa', exact: true }).click();
        await report.getByLabel(/Mô tả hư hỏng/).fill('Bản nháp phải được giữ lại');
        await report.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
        await report.getByRole('alert').waitFor();
        assert.equal(await report.getByLabel(/Mô tả hư hỏng/).inputValue(), 'Bản nháp phải được giữ lại');
        await report.getByRole('button', { name: 'Hủy', exact: true }).click(); failUpdate = false;
        assert.equal(await report.getByRole('heading').innerText(), 'Khóa cửa bị kẹt');
        await page.locator('.scb-form').getByLabel(/Loại hư hỏng/).selectOption('Khác');
        await page.locator('.scb-form').getByLabel(/Mô tả hư hỏng/).fill('Báo hỏng để kiểm tra xóa');
        await page.getByRole('button', { name: 'Gửi báo hỏng' }).click();
        const deleted = page.locator('.scb-item').filter({ hasText: 'SC0002' });
        await deleted.waitFor();
        const beforeCancel = writes.length;
        await deleted.getByRole('button', { name: 'Xóa', exact: true }).click();
        await deleted.getByRole('button', { name: 'Hủy', exact: true }).click();
        assert.equal(writes.length, beforeCancel);
        await deleted.getByRole('button', { name: 'Xóa', exact: true }).click();
        await deleted.getByRole('button', { name: 'Xóa báo hỏng', exact: true }).click();
        await deleted.waitFor({ state: 'detached' });
        assert.equal(await page.locator('.scb-item').count(), 1);
        await page.locator('.scb-form').getByLabel(/Loại hư hỏng/).selectOption('Khác');
        await page.locator('.scb-form').getByLabel(/Mô tả hư hỏng/).fill('Báo hỏng kiểm tra tiếp nhận đồng thời');
        await page.getByRole('button', { name: 'Gửi báo hỏng' }).click();
        const concurrent = page.locator('.scb-item').filter({ hasText: 'SC0003' });
        await concurrent.getByRole('button', { name: 'Sửa', exact: true }).click();
        items.find(item => item.maYeuCau === 'SC0003').trangThai = 'Đang xử lý';
        await concurrent.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: 'Báo hỏng đã được tiếp nhận.' }).waitFor();
        await concurrent.getByText('Đang xử lý', { exact: true }).waitFor();
        assert.equal(await concurrent.getByRole('button', { name: 'Sửa', exact: true }).count(), 0);
        assert.equal(await concurrent.getByRole('button', { name: 'Xóa', exact: true }).count(), 0);
        await page.screenshot({ path: `${folder}/customer-${width}.png`, fullPage: true });
      } else if (role === 'manager') {
        if (width === 390) await page.locator('.ui-navigation-toggle').click();
        await page.locator('aside nav button', { hasText: 'Báo hỏng & sửa chữa' }).click();
        const item = page.locator('.scb-item').filter({ hasText: 'SC0001' }).first();
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
      } else {
        await page.locator('.scb-item').filter({ hasText: 'SC0001' }).getByText('Hoàn tất', { exact: true }).waitFor();
        assert.equal(await page.locator('.scb-list .scb-actions').count(), 0, 'accepted/completed reports have no owner edit/delete actions');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `${role} không tràn ngang`);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
  }
  console.log('PASS repair: create/edit/cancel/delete, keep failed drafts, photo limit and JPEG, concurrent acceptance refresh, readonly completed reports, manager billing; fixture APIs only.');
} finally { await browser.close(); }
