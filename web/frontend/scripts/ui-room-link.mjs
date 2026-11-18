import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Link chốt phòng: Sale tạo link có giờ hẹn; khách mở /chot/<mã> thấy đúng phòng + lời nhắn; đăng ký mang theo giờ hẹn và nguồn;
// trong cổng khách, form đăng ký điền sẵn ngày xem. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/room-link';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const room = { maPhong: 'P101', MaPhong: 'P101', tenPhong: 'Phòng P101', TenPhong: 'Phòng P101', chiNhanh: 'HomeDorm Quận 1', loaiPhong: 'Phòng 2 người', giaThueTheoGiuong: 2200000, giaThue: 2200000, sucChua: 2, soChoTrong: 2, hinhAnh: [], tienNghi: [], dichVuUocTinh: [] };
const sale = { maNguoiDung: 'NV0005', hoTen: 'Sale Thử', vaiTro: 'NhanVien', chucVu: 'Sale', maChiNhanh: 'CN0002' };
const customer = { maNguoiDung: 'KH0001', hoTen: 'Khách thử', vaiTro: 'KhachHang', gioiTinh: 'Nam', soDienThoai: '0900000000', email: 'k@example.com' };
function routes(ctx, user, posts) {
  if (user) ctx.addInitScript((value) => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
  return ctx.route('**/api/**', (route) => {
    const req = route.request(), p = new URL(req.url()).pathname;
    if (!p.startsWith('/api/')) return route.fallback();
    if (p.endsWith('/auth/toi')) return route.fulfill({ json: user });
    if (p.endsWith('/link-chot') && req.method() === 'POST') { posts.push(req.postDataJSON()); return route.fulfill({ status: 201, json: { token: 'TOKEN123.sig', maPhong: 'P101', tenPhong: 'Phòng P101', hetHan: '2026-11-25T00:00:00Z' } }); }
    if (p.endsWith('/link-chot/TOKEN123.sig')) return route.fulfill({ json: { maPhong: 'P101', ngayXem: '2026-11-20', gioXem: '15:00', ghiChu: 'Nhớ mang CCCD', maSale: 'NV0005', tenSale: 'Sale Thử', sdtSale: '0901000000' } });
    if (p.endsWith('/link-chot/hong')) return route.fulfill({ status: 404, json: { message: 'Link đã hết hạn hoặc không đúng.' } });
    if (p.endsWith('/bao-cao/nguon-khach')) return route.fulfill({ json: { ready: true, rows: [{ nguon: 'Sale gửi link', soHoSo: 4, soDatCoc: 3, soHopDong: 2, tyLeChot: 50 }, { nguon: 'Chưa ghi nguồn', soHoSo: 8, soDatCoc: 4, soHopDong: 2, tyLeChot: 25 }] } });
    if (p.endsWith('/trang-chu/kham-pha-phong')) return route.fulfill({ json: { data: [room] } });
    if (p.endsWith('/trang-chu/phong/P101') || p.endsWith('/khach-moi/phong/P101')) return route.fulfill({ json: { data: room } });
    if (p.includes('tong-quan')) return route.fulfill({ json: {} });
    if (p.includes('bo-loc')) return route.fulfill({ json: { data: { khuVuc: [], loaiPhong: [{ tenLoaiPhong: 'Phòng 2 người', sucChuaToiDa: 2 }] } } });
    return route.fulfill({ json: [] });
  });
}
try {
  for (const width of [1440, 390]) {
    const errors = [], posts = [];
    let ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await routes(ctx, sale, posts);
    let page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/nhan-vien-sale`, { waitUntil: 'domcontentloaded' });
    const report = page.locator('.src-report');
    await report.locator('table').waitFor();
    assert.match(await report.innerText(), /Sale gửi link\s*4\s*3\s*2\s*50%/);
    if (width === 390) await page.locator('.ui-navigation-toggle').click();
    await page.locator('aside nav button', { hasText: 'Gửi phòng cho khách' }).click();
    await page.getByLabel(/^Phòng/).selectOption('P101');
    await page.getByLabel('Ngày hẹn xem').fill('2026-11-20');
    await page.getByLabel('Giờ hẹn').fill('15:00');
    await page.getByRole('button', { name: 'Tạo link' }).click();
    const message = page.getByLabel('Tin nhắn gửi khách');
    await message.waitFor();
    assert.deepEqual(posts[0], { maPhong: 'P101', ngayXem: '2026-11-20', gioXem: '15:00', ghiChu: '' });
    assert.match(await message.inputValue(), /Phòng P101, hẹn xem lúc 15:00 ngày 20\/11\/2026.*\/chot\/TOKEN123\.sig/);
    await page.screenshot({ path: `${folder}/sale-${width}.png`, fullPage: true });
    await ctx.close();

    ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await routes(ctx, null, posts);
    page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/chot/TOKEN123.sig`, { waitUntil: 'domcontentloaded' });
    const offer = page.locator('.ctp-offer');
    await offer.waitFor();
    assert.match(await offer.innerText(), /Sale Thử gửi bạn phòng này[\s\S]*15:00 ngày 20\/11\/2026[\s\S]*Nhớ mang CCCD/);
    await page.locator('.kh-detail-title').waitFor();
    await page.screenshot({ path: `${folder}/customer-${width}.png` });
    await page.getByRole('button', { name: 'Tôi quan tâm phòng này', exact: true }).click();
    const next = new URL(page.url()).searchParams.get('next');
    assert.match(next, /^\/khach-hang\?tab=kham-pha&phong=P101&dangKy=1&nguon=Sale/);
    assert.match(next, /ngayXem=2026-11-20&gioXem=15%3A00&tuSale=NV0005/);
    await page.goto(`${base}/chot/hong`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Link không còn dùng được' }).waitFor();
    await ctx.close();

    ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await routes(ctx, customer, posts);
    page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}${next}`, { waitUntil: 'domcontentloaded' });
    const modal = page.locator('.kh-register-modal').first();
    await modal.waitFor();
    assert.equal(await modal.locator('input[type=date]').evaluateAll((els) => els.map((el) => el.value).includes('2026-11-20')), true, 'ngày xem điền sẵn');
    assert.ok(await modal.locator('input').evaluateAll((els) => els.some((el) => /lúc 15:00, đã hẹn với Sale NV0005/.test(el.value))), 'giờ hẹn điền sẵn');
    assert.ok(await modal.locator('select').evaluateAll((els) => els.some((el) => el.value === 'Sale gửi link')), 'nguồn khách chọn sẵn');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('PASS room link: sale creates a link with a viewing time; customer sees the room and note; registration is prefilled; fixture APIs only.');
} finally { await browser.close(); }
