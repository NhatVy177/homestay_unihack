import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const phase = process.argv[2] || 'after', base = process.env.UI_BASE_URL || 'http://127.0.0.1:5196';
const output = resolve('.ui-screens', `sale-${phase}`);
await mkdir(output, { recursive: true });
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = dateKey(new Date()), tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
const tomorrow = dateKey(tomorrowDate);
const user = { maNguoiDung: 'NVUI01', hoTen: 'Nhân viên giao diện', vaiTro: 'NhanVien', chucVu: 'Sale', maChiNhanh: 'CNUI01', tenChiNhanh: 'Chi nhánh thử', email: 'ui@example.invalid' };
const registrations = [
  { maDangKy: 'DK0001', maKhachHang: 'KH0001', hoTenKhach: 'Khách thử An', sdtKhach: '0900000001', email: 'an@example.invalid', trangThai: 'Đã tiếp nhận', soNguoiO: 1, soNam: 1, soNu: 0, khuVucMongMuon: 'Quận 7', loaiPhongYeuCau: 'Phòng 2 người', mucGiaToiDa: 2500000, ngayDangKy: `${today}T08:00:00` },
  { maDangKy: 'DK0002', maKhachHang: 'KH0002', hoTenKhach: 'Khách thử Bình', sdtKhach: '0900000002', trangThai: 'Chờ tiếp nhận', ngayDangKy: `${today}T08:10:00` },
];
const schedules = [
  { id: 'LX0001', maDangKy: 'DK0003', hoTenKhach: 'Khách lịch hôm nay', sdtKhach: '0900000003', danhSachPhong: 'Phòng 101, Phòng 103', thoiGianHen: `${today}T09:00:00`, trangThai: 'Chờ xem', coTheHuy: true },
  { id: 'LX0002', maDangKy: 'DK0004', hoTenKhach: 'Khách lịch ngày mai', danhSachPhong: 'Phòng 201', thoiGianHen: `${tomorrow}T10:00:00`, trangThai: 'Đã hủy', coTheHuy: false },
];
const rooms = [{ maPhong: 'P101', tenPhong: 'Phòng 101', gioiTinhChoPhep: 'Nam', soGiuongTrong: 2, sucChua: 2, giaThue: 1500000, tenChiNhanh: 'Chi nhánh thử' },
  { maPhong: 'P102', tenPhong: 'Phòng 102', gioiTinhChoPhep: 'Nữ', soGiuongTrong: 2, sucChua: 2, giaThue: 1500000 },
  { maPhong: 'P103', tenPhong: 'Phòng 103', gioiTinhChoPhep: 'Nam', soGiuongTrong: 2, sucChua: 2, giaThue: 1600000 }];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: value })), user);
    const writes = [], errors = [];
    let failOverview = false, emptyOverview = false;
    await context.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (req.method() === 'GET' && ['/api/dang-ky-thue', '/api/lich-xem-phong'].includes(path)) {
        if (failOverview) return route.fulfill({ status: 503, json: { message: 'Máy chủ thử đang bận. Vui lòng thử lại.' } });
        if (emptyOverview) return route.fulfill({ json: [] });
      }
      let json = [];
      if (path.endsWith('/auth/toi')) json = user;
      if (path.endsWith('/avalanche/config')) json = { enabled: false };
      if (path === '/api/dang-ky-thue') json = registrations;
      if (path === '/api/lich-xem-phong') json = schedules;
      if (path.endsWith('/phong-phu-hop')) json = { rooms, isRegionValid: true };
      if (req.method() !== 'GET') {
        writes.push({ path, body: req.postDataJSON() });
        json = { id: 'LXNEW1' };
      }
      return route.fulfill({ json });
    });
    const page = await context.newPage(); page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', e => errors.push(e.message));
    const open = async () => { await page.goto(base + '/nhan-vien-sale', { waitUntil: 'domcontentloaded' }); await page.locator('h1').first().waitFor(); };
    const nav = async label => {
      if (width === 390) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await page.locator('aside nav').getByRole('button', { name: label, exact: true }).click();
    };
    const shot = async name => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.equal(errors.length, 0, name + ' JavaScript errors');
      if (phase === 'after') assert.equal(metrics.scrollWidth, width, name + ' page overflow');
      await page.screenshot({ path: resolve(output, `${name}-${width}.png`), fullPage: true });
      report.push({ name, ...metrics, errors: [...errors] });
    };
    await open(); await shot('overview');
    if (phase === 'refine-before') { await nav('Tra cứu khách hàng'); await shot('customers'); }
    if (phase === 'after') {
      const color = await page.locator('aside nav .is-active').evaluate(e => getComputedStyle(e).backgroundColor);
      assert.equal(color, 'rgb(74, 101, 73)', 'active navigation uses primary green token');
      const backgrounds = await page.evaluate(() => [getComputedStyle(document.querySelector('.kp-sidebar')).backgroundColor, getComputedStyle(document.querySelector('.kp-app')).backgroundColor]);
      assert.equal(backgrounds[0], backgrounds[1], 'sidebar and content share the green background');
      assert.deepEqual(await page.locator('.sale-stat strong').allTextContents(), ['1', '1', String(schedules.filter(s => new Date(s.thoiGianHen) > new Date() && !['Đã hủy', 'Đã xem'].includes(s.trangThai)).length), '2']);
    }
    await nav(phase === 'before' ? 'Lịch xem phòng' : 'Lịch hẹn xem phòng');
    await page.getByText('LX0001', { exact: true }).first().waitFor();
    await shot('schedules');
    if (phase === 'after') {
      const layout = await page.locator('.sale-appointments-layout').evaluate(el => {
        const rect = selector => { const r = el.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        return { calendar: rect('.sale-calendar'), list: rect('.sale-appointments-list'), rail: rect('.sale-appointments-rail') };
      });
      assert.ok(layout.list.y >= layout.calendar.bottom, 'appointment list sits below the calendar');
      assert.equal(layout.list.x, layout.calendar.x, 'calendar and list share the left edge');
      if (width === 1440) assert.ok(layout.rail.x >= layout.calendar.right, 'summary stays in the right column');
      else assert.ok(layout.rail.y >= layout.list.bottom, 'mobile summaries follow the calendar and list');
      assert.equal(await page.getByRole('region', { name: 'Lịch hẹn 24 giờ tới', exact: true }).count(), 1);
    }
    if (phase === 'after') {
      assert.equal(await page.locator('aside nav button').count(), 5);
      assert.equal(await page.locator('aside nav').getByText('Ghi nhận cư trú').count(), 0);
      const title = await page.locator('.sale-calendar-heading h2').textContent();
      await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
      assert.notEqual(await page.locator('.sale-calendar-heading h2').textContent(), title);
      await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
      await page.locator('#schedule-status').selectOption('Đã hủy');
      assert.equal(await page.locator('.sale-schedule-item').count(), 1);
      await page.locator('#schedule-search').fill('không có khách này');
      await page.getByText('Không có lịch hẹn phù hợp.', { exact: false }).waitFor();
      await shot('schedule-empty-filter');
      await page.getByRole('button', { name: 'Xóa lọc', exact: true }).click();
      await page.getByRole('button', { name: /LX0001.*Khách lịch hôm nay/ }).click();
      await page.getByRole('button', { name: 'Đổi lịch', exact: true }).click();
      await page.getByRole('button', { name: 'Xác nhận đổi lịch' }).click();
      assert.equal(writes.at(-1).body.thaoTac, 'doi-lich');
      assert.equal(writes.at(-1).path, '/api/lich-xem-phong/LX0001/cap-nhat');
      await page.getByRole('button', { name: 'Hủy lịch', exact: true }).click();
      await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
      assert.equal(writes.at(-1).body.thaoTac, 'huy');
      await page.getByRole('button', { name: /LX0002.*Khách lịch ngày mai/ }).click();
      assert.equal(await page.getByRole('button', { name: 'Đổi lịch', exact: true }).isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Hủy lịch', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Lập lịch hẹn', exact: true }).click();
      await page.getByRole('button', { name: /Khách thử An/ }).waitFor();
      await shot('create-profile-picker');
      await page.getByRole('button', { name: /Khách thử An/ }).click();
      await page.getByRole('checkbox', { name: 'Chọn Phòng 101' }).waitFor();
      assert.equal(await page.locator('aside nav button:disabled').count(), 4, 'other tabs stay locked while scheduling');
      await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
      await nav('Tra cứu khách hàng'); await page.getByText('Khách thử An', { exact: true }).first().waitFor(); await shot('customers');
      assert.equal(await page.locator('.sale-work-tabs').count(), 0);
      for (const label of ['Trả phòng', 'Đặt cọc', 'Nhập hộ cư trú', 'Hồ sơ đăng ký']) assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 0, 'lookup has no operation tabs');
      await page.getByRole('textbox', { name: 'Họ và tên' }).fill('An');
      assert.equal(await page.locator('.sale-customer-item').count(), 1);
      await page.locator('.sale-customer-item').first().click();
      await page.getByRole('heading', { name: 'Khách thử An', exact: true }).waitFor(); await shot('customer-detail');
      await nav('Hồ sơ cá nhân'); await shot('profile');
    }
    await nav(phase === 'before' ? 'Hợp đồng thuê' : 'Lập hợp đồng thuê'); await shot('contracts');
    if (phase === 'after') {
      assert.equal(await page.locator('.lhd-stepper').count(), 0, 'contract entry is a list without the editor stepper');
      await page.getByRole('button', { name: 'Hợp đồng đã lập', exact: true }).click();
      await page.getByRole('heading', { name: 'Chưa có hợp đồng đã lập', exact: true }).waitFor(); await shot('contracts-issued-empty');
      await page.getByRole('button', { name: /Hỗ trợ khai thông tin người ở/ }).click(); await shot('residence-context');
      await nav('Tổng quan'); await page.getByRole('button', { name: /Xử lý đặt cọc \/ thu tiền tại quầy/ }).click(); await shot('deposit-context');
      await nav('Tổng quan'); failOverview = true;
      await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
      await page.getByRole('alert').waitFor(); await shot('overview-error');
      failOverview = false; emptyOverview = true;
      await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
      await page.getByText('Hôm nay chưa có lịch hẹn xem phòng.').waitFor(); await shot('overview-empty');
      emptyOverview = false;
    }
    // Same actual scheduling component, rendered in isolation to compare its two steps before/after.
    await open();
    await page.evaluate(async profile => {
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const dom = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { default: Form } = await import('/src/pages/nhanVienSale/LapLichChoHoSo.jsx');
      document.getElementById('root').style.display = 'none';
      const host = document.createElement('main'); host.className = 'sale-form-preview'; document.body.append(host);
      const root = (dom.createRoot || dom.default.createRoot)(host);
      root.render(React.createElement(Form, { profile, onBack: () => {}, onCreated: () => {} }));
    }, registrations[0]);
    await page.getByText('Phòng 101', { exact: true }).waitFor();
    await shot('create-rooms');
    if (phase === 'after') {
      await page.getByRole('checkbox', { name: 'Chọn Phòng 102' }).check();
      assert.equal(await page.getByRole('button', { name: 'Tiếp tục', exact: true }).isDisabled(), true, 'wrong-gender room still blocks continuation');
      await page.getByRole('checkbox', { name: 'Chọn Phòng 102' }).uncheck();
    }
    await page.locator('article input[type=checkbox]').first().check();
    if (phase === 'after') await page.getByRole('checkbox', { name: 'Chọn Phòng 103' }).check();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await shot('create-time');
    if (phase === 'after') {
      await page.locator('input[type=date]').fill(tomorrow);
      const previousWrites = writes.length;
      let validation = '';
      page.once('dialog', async dialog => { validation = dialog.message(); await dialog.dismiss(); });
      await page.locator('input[type=time]').fill('19:00');
      await page.getByRole('button', { name: 'Lưu lịch hẹn' }).click();
      assert.ok(validation.includes('07:00') && validation.includes('17:00'));
      assert.equal(writes.length, previousWrites, 'outside-hours booking must not call API');
      await page.locator('input[type=time]').fill('08:30');
      await page.getByRole('button', { name: 'Lưu lịch hẹn' }).click();
      await page.getByText('Đã lập lịch xem phòng', { exact: true }).waitFor();
      assert.deepEqual(writes.at(-1).body.rooms, [{ maPhong: 'P101' }, { maPhong: 'P103' }]);
      assert.equal(writes.at(-1).body.maDangKy, 'DK0001');
      await shot('create-success');
    }
    await context.close();
  }
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`PASS ${phase}: ${report.length} screenshots; intercepted APIs only, no real mutations.`);
} finally { await browser.close(); }
