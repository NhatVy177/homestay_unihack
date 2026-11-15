import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Tab "Hóa đơn & thanh toán": danh sách nhiều kỳ, thẻ tổng quan, bộ lọc, mở phiếu cọc để thanh toán. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/customer-invoices';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const width of [1440, 390]) {
    const user = { maNguoiDung: 'KH0001', maKhachHang: 'KH0001', hoTen: 'Khách hóa đơn', vaiTro: 'KhachHang' };
    const deposits = [{ maPhieuCoc: 'DC0003', trangThai: 'Chờ thanh toán', soTienCoc: 2800000, thoiHanThanhToan: '2026-11-15T10:00:00.000Z', ngayLapPhieu: '2026-11-14', tenPhong: 'Phòng 101', hinhThucThue: 'Nguyên phòng', phuongThucThanhToan: 'Chuyển khoản', sdtKhachHang: '0900000000',
      cachTinhCoc: { soThang: 2, dong: [{ donGia: 1400000, soLuong: 1, donVi: 'giường' }], motThang: 1400000, tong: 2800000 },
      taiKhoanThanhToan: { nganHang: 'MB Bank', maNganHang: '970422', soTaiKhoan: '0000000000', chuTaiKhoan: 'TAI KHOAN KIEM THU', vietQr: true } }];
    let proof = null, proofUploads = 0;
    const invoices = [
      { maHoaDon: 'HD0001', maHopDong: 'HD0001', kyThanhToan: '2026-11', ngayHanTT: '2026-11-20', tongTien: 3000000, trangThai: 'Chưa TT', ngayBatDau: '2026-11-15', loai: 'Kỳ đầu' },
      { maHoaDon: 'HD0002', maHopDong: 'HD0001', kyThanhToan: '2026-10', ngayHanTT: '2026-10-10', tongTien: 2900000, trangThai: 'Đã TT', ngayBatDau: '2026-09-15', loai: 'Hàng tháng' },
      { maHoaDon: 'HD0003', maHopDong: 'HD0001', kyThanhToan: '2026-09', ngayHanTT: '2026-09-10', tongTien: 2900000, trangThai: 'Nợ', ngayBatDau: '2026-09-15', loai: 'Kỳ đầu' }];
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
    await ctx.addInitScript((u) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: u })), user);
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: { trangThai: { soLichXem: 1, soHoSo: 1, soPhieuCoc: 1 }, hoSo: [], lichXem: [], phongGoiY: [] } });
      if (path === '/api/khach-moi/dat-coc') return route.fulfill({ json: deposits });
      if (path === '/api/khach-moi/hoa-don') return route.fulfill({ json: invoices });
      if (path === '/api/khach-moi/ky-dau/HD9001/minh-chung') {
        if (req.method() === 'PUT') { assert.match(req.headers()['content-type'] || '', /^multipart\/form-data/); proofUploads += 1; proof = { maHopDong: 'HD9001', duongDan: '/uploads/chung-tu/HD9001-1.png', tenTep: 'ck.png', ngayGui: '2026-11-16T01:00:00' }; }
        return route.fulfill({ json: proof });
      }
      if (path === '/api/thanh-toan-mo-phong/thu-nhan-phong') return route.fulfill({ json: [{ purpose: 'thu-nhan-phong', refId: 'HD9001', status: 'Pending', amountVnd: 8100000, startDate: '2026-12-01' }] });
      if (!['GET', 'OPTIONS'].includes(req.method())) throw new Error(`Unexpected mutation ${path}`);
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/khach-hang?tab=dat-coc`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Hóa đơn của tôi', level: 2 }).waitFor();
    const rows = page.locator('.cinv-table tbody tr');
    await rows.first().waitFor();
    assert.equal(await rows.count(), 5, 'phiếu cọc + 3 hóa đơn các kỳ + khoản thu kỳ đầu khi nhận phòng');
    assert.match(await rows.filter({ hasText: 'KD-HD9001' }).first().innerText(), /Nhận phòng[\s\S]*8\.100\.000/);
    assert.match(await page.locator('.cinv-cards').innerText(), /04\s*Hóa đơn/, 'chưa trả = cọc + kỳ đầu + kỳ nợ + khoản thu nhận phòng');
    await page.screenshot({ path: `${folder}/list-${width}.png`, fullPage: true });
    await rows.filter({ hasText: 'KD-HD9001' }).getByRole('button', { name: 'Thanh toán' }).click();
    await page.getByRole('heading', { name: 'Thanh toán khoản thu khi nhận phòng', level: 2 }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'QR chuyển khoản', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('heading', { name: 'Minh chứng thanh toán' }).waitFor();
    await page.locator('.dc-file-drop input[type="file"]').setInputFiles({ name: 'ck.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
    await page.getByRole('button', { name: 'Gửi chứng từ thanh toán' }).click();
    await page.getByText('Đã gửi chứng từ', { exact: false }).first().waitFor();
    assert.equal(proofUploads, 1);
    await page.getByText('Đã nộp minh chứng', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ví điện tử (mô phỏng)' }).click();
    await page.getByRole('button', { name: 'Xác nhận thanh toán (mô phỏng)' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Minh chứng thanh toán' }).count(), 0);
    await page.getByRole('button', { name: 'Tiền mặt tại quầy' }).click();
    await page.getByText('nộp 8.100.000 VNĐ bằng tiền mặt', { exact: false }).waitFor();
    await page.getByRole('button', { name: /Quay lại danh sách/ }).click();
    await page.getByRole('heading', { name: 'Hóa đơn của tôi', level: 2 }).waitFor();
    await page.getByRole('button', { name: 'Quá hạn', exact: true }).click();
    assert.equal(await rows.count(), 1); assert.match(await rows.first().innerText(), /HD0003/);
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await page.getByLabel('Lọc theo loại').selectOption('Đặt cọc');
    assert.equal(await rows.count(), 1); assert.match(await rows.first().innerText(), /DC0003/);
    await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
    await page.getByRole('button', { name: /Quay lại danh sách/ }).waitFor();
    await page.getByRole('heading', { name: 'Thanh toán đặt cọc', level: 2 }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'QR chuyển khoản', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole("button", { name: "Ví điện tử (mô phỏng)" }).count(), 1);
    await page.getByRole("button", { name: "Ví điện tử (mô phỏng)" }).click();
    await page.getByRole("button", { name: "Xác nhận thanh toán (mô phỏng)" }).waitFor();
    assert.equal(await page.locator(".dpay-transfer").count(), 0);
    await page.getByRole("button", { name: "QR chuyển khoản", exact: true }).click();
    assert.match(await page.locator('.dpay-formula').innerText(), /1\.400\.000đ\/giường × 1 giường × 2 tháng = 2\.800\.000đ/);
    const qr = page.locator('.vietqr-code img');
    await qr.waitFor();
    const src = await qr.getAttribute('src');
    assert.match(src, /^https:\/\/img\.vietqr\.io\/image\/970422-0000000000-compact2\.png\?/);
    assert.match(src, /amount=2800000/); assert.match(src, /addInfo=DC0003\+0900000000/);
    await page.waitForFunction(() => { const img = document.querySelector('.vietqr-code img'); return !img || img.complete; });
    await page.screenshot({ path: `${folder}/deposit-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /Quay lại danh sách/ }).click();
    await page.getByRole('heading', { name: 'Hóa đơn của tôi', level: 2 }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS customer invoices tab: multi-period list, summary cards, filters, deposit detail round trip; fixture APIs only.');
} finally { await browser.close(); }
