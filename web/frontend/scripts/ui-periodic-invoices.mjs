import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Tab "Hóa đơn định kỳ" của kế toán (theo màn của nhóm Hằng): chọn hợp đồng, chốt chỉ số, phí phát sinh,
// lập hóa đơn, danh sách và ngăn chi tiết, thu tiền. Mọi /api là fixture, không ghi dữ liệu thật.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/periodic-invoices';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const accountant = { maNguoiDung: 'NV9008', maNhanVien: 'NV9008', hoTen: 'Kế toán demo', maChiNhanh: 'CN9002', tenChiNhanh: 'Chi nhánh demo', vaiTro: 'NhanVien', chucVu: 'Kế toán' };
try {
  for (const width of [1440, 390]) {
    const contracts = [{ maHopDong: 'HD9002', hoTen: 'Khách Demo', sdt: '0900000002', maPhong: 'P901', tenPhong: 'Phòng P901', giuong: '', hinhThucThue: 'Nguyên phòng',
      giaThue: 7200000, soGiuongThue: 1, maChiNhanh: 'CN9002', tenChiNhanh: 'Chi nhánh demo', kyCuoi: '2026-11', kyCanLap: '2026-12' }];
    let fees = [{ maPhi: 'CPPS-4102-1111', tenPhi: 'Đền bù làm mất thẻ từ/chìa khóa', soTien: 100000, trangThai: 'Chưa xác nhận', ngayGhiNhan: '2026-11-16' }];
    let invoices = [{ maHoaDon: 'HO9002', maHopDong: 'HD9002', kyThanhToan: '2026-11', hoTen: 'Khách Demo', tenPhong: 'Phòng P901', maChiNhanh: 'CN9002', tenChiNhanh: 'Chi nhánh demo',
      loai: 'Kỳ đầu', tienPhong: 7200000, tienDien: 0, tienNuoc: 0, tienDichVu: 630000, tienPhatSinh: 0, tongTien: 7830000, ngayHanTT: '2026-11-18', trangThai: 'Đã TT', nhom: 'paid' }];
    const posts = [], errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
    await ctx.addInitScript((u) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: u })), accountant);
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: accountant });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      const b = '/api/ke-toan/hoa-don-dinh-ky';
      if (path === `${b}/hop-dong`) return route.fulfill({ json: contracts });
      if (path === `${b}/hop-dong/HD9002`) return route.fulfill({ json: { hopDong: contracts[0], kyThanhToan: '2026-12', tyLeChia: 1, hanThanhToan: '2027-01-10',
        chiSo: { current: null, previous: { maPhieuGhi: 'PG9001', kyGhi: '2026-11', dienDau: 0, dienCuoi: 1240, nuocDau: 0, nuocCuoi: 45 } },
        dichVu: [{ maChiTietDVHD: 'DVH901', tenDichVu: 'Điện', donViTinh: 'kWh', donGia: 4000, soLuong: 1 }, { maChiTietDVHD: 'DVH902', tenDichVu: 'Nước', donViTinh: 'm3', donGia: 18000, soLuong: 1 },
          { maChiTietDVHD: 'DVH903', tenDichVu: 'Gửi xe', donViTinh: 'tháng', donGia: 150000, soLuong: 3 }, { maChiTietDVHD: 'DVH904', tenDichVu: 'Wifi', donViTinh: 'tháng', donGia: 100000, soLuong: 1 }],
        phiPhatSinh: fees } });
      if (path === `${b}/phi-phat-sinh/CPPS-4102-1111/xac-nhan` && method === 'POST') { fees = fees.map((f) => ({ ...f, trangThai: 'Đã xác nhận' })); return route.fulfill({ json: { maPhi: 'CPPS-4102-1111' } }); }
      if (path === `${b}/phi-phat-sinh/them` && method === 'POST') { const d = req.postDataJSON(); posts.push(['fee', d]); fees = [...fees, { maPhi: d.maPhi, tenPhi: d.tenPhi, soTien: d.soTien, trangThai: d.trangThai, ngayGhiNhan: d.ngayGhiNhan }]; return route.fulfill({ json: d }); }
      if (path.startsWith(`${b}/phi-phat-sinh/`) && method === 'DELETE') { const id = decodeURIComponent(path.split('/').pop()); fees = fees.filter((f) => f.maPhi !== id); return route.fulfill({ json: { maPhi: id } }); }
      if (path === b && method === 'POST') {
        const d = req.postDataJSON(); posts.push(['invoice', d]);
        invoices = [{ maHoaDon: 'HO9003', maHopDong: 'HD9002', kyThanhToan: '2026-12', hoTen: 'Khách Demo', tenPhong: 'Phòng P901', maChiNhanh: 'CN9002', tenChiNhanh: 'Chi nhánh demo', loai: 'Hàng tháng',
          tienPhong: 7200000, tienDien: 340000, tienNuoc: 108000, tienDichVu: 550000, tienPhatSinh: 100000, tongTien: 8298000, ngayHanTT: '2027-01-10', trangThai: 'Chưa TT', nhom: 'pending' }, ...invoices];
        contracts[0] = { ...contracts[0], kyCuoi: '2026-12', kyCanLap: '2027-01' };
        return route.fulfill({ json: { maHoaDon: 'HO9003', tongTien: 8298000, kyThanhToan: '2026-12' } });
      }
      if (path === b) return route.fulfill({ json: invoices });
      if (path === `${b}/HO9003`) return route.fulfill({ json: { ...invoices.find((i) => i.maHoaDon === 'HO9003'), chiTiet: [
        { maChiTietHD: 'CH9001', tenDichVu: 'Điện', donViTinh: 'kWh', soLuong: 85, donGia: 4000, thanhTien: 340000 }, { maChiTietHD: 'CH9002', tenDichVu: 'Nước', donViTinh: 'm3', soLuong: 6, donGia: 18000, thanhTien: 108000 },
        { maChiTietHD: 'CH9003', tenDichVu: 'Gửi xe', donViTinh: 'tháng', soLuong: 3, donGia: 150000, thanhTien: 450000 }], phiPhatSinh: [{ maPhi: 'CPPS-4102-1111', tenPhi: 'Đền bù làm mất thẻ từ/chìa khóa', soTien: 100000 }] } });
      if (path === `${b}/HO9003/thu-tien` && method === 'POST') { posts.push(['collect', req.postDataJSON()]); invoices = invoices.map((i) => (i.maHoaDon === 'HO9003' ? { ...i, trangThai: 'Đã TT', nhom: 'paid' } : i)); return route.fulfill({ json: { maHoaDon: 'HO9003', trangThai: 'Đã TT' } }); }
      if (method === 'GET') return route.fulfill({ json: [] });
      throw new Error(`Unexpected ${method} ${path}`);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/nhan-vien-ke-toan`, { waitUntil: 'domcontentloaded' });
    if (width < 800) await page.locator('.ui-navigation-toggle').click();
    await page.locator('aside nav button', { hasText: 'Hóa đơn định kỳ' }).click();
    await page.getByRole('heading', { name: 'Hóa đơn định kỳ', level: 2 }).waitFor();
    await page.locator('.hdk-contract', { hasText: 'HD9002' }).waitFor();
    assert.equal(await page.getByLabel('Kỳ thanh toán').inputValue(), '2026-12', 'kỳ mặc định = kỳ cần lập sớm nhất');
    await page.getByRole('heading', { name: 'Chưa chọn hợp đồng' }).waitFor();
    await page.locator('.hdk-contract', { hasText: 'HD9002' }).click();
    await page.getByRole('heading', { name: 'Khoản phí phát sinh chưa xác nhận' }).waitFor();
    const meters = page.locator('.hdk-meter');
    assert.equal(await meters.nth(0).locator('input').first().inputValue(), '1240');
    assert.equal(await meters.nth(0).locator('input').first().getAttribute('readonly'), '', 'chỉ số cũ khóa khi có kỳ trước');
    await meters.nth(0).locator('input').nth(1).fill('1325');
    await meters.nth(1).locator('input').nth(1).fill('51');
    assert.match(await meters.nth(0).innerText(), /85 kWh[\s\S]*340\.000 đ/);
    await page.getByRole('button', { name: 'Lập hóa đơn định kỳ', exact: false }).last().click();
    await page.getByText('chưa xác nhận! Vui lòng xác nhận', { exact: false }).waitFor();
    assert.equal(posts.filter((p) => p[0] === 'invoice').length, 0, 'không lập khi còn phí chưa xác nhận');
    await page.getByRole('button', { name: 'Xác nhận tất cả' }).click();
    await page.getByRole('heading', { name: 'Khoản phí phát sinh chưa xác nhận' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: /Thêm khoản phí/ }).click();
    await page.getByRole('dialog', { name: /Chi phí phát sinh/ }).waitFor();
    await page.getByLabel(/Loại chi phí phát sinh/).selectOption('tu_ao');
    assert.equal(await page.getByLabel(/Số tiền phạt/).inputValue(), '500000');
    await page.screenshot({ path: `${folder}/fee-modal-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Xác nhận thêm' }).click();
    await page.locator('.hdk-fee', { hasText: 'tủ quần áo' }).waitFor();
    await page.getByRole('button', { name: 'Xóa Đền bù hư hỏng tủ quần áo' }).click();
    await page.locator('.hdk-fee', { hasText: 'tủ quần áo' }).waitFor({ state: 'detached' });
    assert.match(await page.locator('.hdk-lines.is-summary').innerText(), /8\.298\.000 đ/);
    const wide = await page.evaluate((w) => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > w + 1).slice(0, 6).map((el) => el.className + ' ' + Math.round(el.getBoundingClientRect().right)), width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, JSON.stringify(wide));
    await page.screenshot({ path: `${folder}/input-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /Lập hóa đơn định kỳ/ }).last().click();
    await page.getByText('Lập hóa đơn định kỳ thành công', { exact: false }).waitFor();
    const sent = posts.find((p) => p[0] === 'invoice')[1];
    assert.deepEqual([sent.maHopDong, sent.kyThanhToan, Number(sent.chiSoDienMoi), Number(sent.chiSoNuocMoi)], ['HD9002', '2026-12', 1325, 51]);
    await page.getByRole('heading', { name: /Danh sách hóa đơn tháng 12\/2026/ }).waitFor();
    const row = page.locator('.hdk-table tbody tr', { hasText: 'HO9003' });
    assert.match(await row.innerText(), /8\.298\.000[\s\S]*Chờ TT/i);
    assert.match(await page.locator('.hdk-cards').innerText(), /DỰ KIẾN THÁNG\s*8\.298\.000 đ/i);
    await row.getByRole('button', { name: 'Xem HO9003' }).click();
    const drawer = page.getByRole('dialog', { name: 'Chi tiết hóa đơn' });
    await drawer.getByText('Điện (85 kWh x 4.000):', { exact: false }).waitFor();
    await drawer.getByText('Đền bù làm mất thẻ từ/chìa khóa', { exact: false }).waitFor();
    await page.screenshot({ path: `${folder}/drawer-${width}.png`, fullPage: false });
    await drawer.locator('select').selectOption('Tiền mặt');
    await drawer.getByRole('button', { name: 'Ghi nhận TT' }).click();
    await drawer.getByText('Đã thanh toán', { exact: true }).waitFor();
    assert.deepEqual(posts.find((p) => p[0] === 'collect')[1], { phuongThuc: 'Tiền mặt' });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS periodic invoices tab: contract pick, readings, fee confirm/add/delete gate, create POST, list, drawer, collect; fixture APIs only.');
} finally { await browser.close(); }
