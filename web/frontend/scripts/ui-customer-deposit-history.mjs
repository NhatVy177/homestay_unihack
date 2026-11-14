import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Tab "Lịch sử đặt cọc": yêu cầu giữ chỗ đang chờ quản lý + phiếu cọc, thống kê, tìm kiếm, mở phiếu để thanh toán. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/customer-deposit-history';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const width of [1440, 390]) {
    const user = { maNguoiDung: 'KH0001', maKhachHang: 'KH0001', hoTen: 'Khách lịch sử cọc', vaiTro: 'KhachHang' };
    const deposits = [
      { maPhieuCoc: 'DC0003', trangThai: 'Chờ thanh toán', soTienCoc: 2800000, thoiHanThanhToan: '2026-11-16T10:00:00.000Z', tenPhong: 'Phòng 101', tenChiNhanh: 'Cơ sở Quận 5', phuongThucThanhToan: 'Chuyển khoản', sdtKhachHang: '0900000000' },
      { maPhieuCoc: 'DC0002', trangThai: 'Chờ xác nhận', soTienCoc: 1400000, thoiHanThanhToan: '2026-11-15T10:00:00.000Z', tenPhong: 'Phòng 201', tenChiNhanh: 'Cơ sở Quận 5' },
      { maPhieuCoc: 'DC0001', trangThai: 'Hoàn tất', soTienCoc: 1400000, thoiHanThanhToan: '2026-11-10T10:00:00.000Z', tenPhong: 'Phòng 301', tenChiNhanh: 'Cơ sở Quận 1' }];
    const requests = [{ maDangKy: 'DK0005', maPhong: 'P105', tenPhong: 'Phòng 105', tenChiNhanh: 'Cơ sở Quận 1', hinhThucThue: 'Ghép giường', guiLuc: '2026-11-15T01:00:00.000Z' }];
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width, height: 1100 }, timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
    await ctx.addInitScript((u) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: u })), user);
    await ctx.route('**/api/**', (route) => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/khach-moi/tong-quan')) return route.fulfill({ json: { trangThai: { soLichXem: 1, soHoSo: 1, soPhieuCoc: 3 }, hoSo: [], lichXem: [], phongGoiY: [] } });
      if (path === '/api/khach-moi/dat-coc') return route.fulfill({ json: deposits });
      if (path === '/api/khach-moi/yeu-cau-giu-cho') return route.fulfill({ json: requests });
      if (!['GET', 'OPTIONS'].includes(req.method())) throw new Error(`Unexpected mutation ${path}`);
      return route.fulfill({ json: [] });
    });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/khach-hang?tab=lich-su-coc`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Lịch sử đặt cọc', level: 2 }).waitFor();
    const cards = page.locator('.cdh-card');
    await cards.first().waitFor();
    assert.equal(await cards.count(), 4, 'một yêu cầu chờ quản lý + ba phiếu cọc');
    const stats = await page.locator('.cdh-stats').innerText();
    assert.match(stats, /04\s*Tổng yêu cầu/i); assert.match(stats, /02\s*Chờ xác nhận/i); assert.match(stats, /01\s*Chờ thanh toán/i); assert.match(stats, /01\s*Đã thanh toán/i);
    assert.match(await page.locator('.cdh-card', { hasText: 'DK0005' }).innerText(), /Chờ quản lý xác nhận/);
    assert.match(await page.locator('.cdh-card', { hasText: 'DC0002' }).innerText(), /Kế toán/, 'chứng từ đã nộp do kế toán xác nhận');
    await page.screenshot({ path: `${folder}/history-${width}.png`, fullPage: true });
    await page.getByLabel('Tìm trong lịch sử đặt cọc').fill('DC0003');
    assert.equal(await cards.count(), 1);
    await page.getByRole('button', { name: /Thanh toán cọc/ }).click();
    await page.getByRole('heading', { name: 'Thanh toán đặt cọc', level: 2 }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS customer deposit history: pending requests + deposits, stats, search, open to pay; fixture APIs only.');
} finally { await browser.close(); }
