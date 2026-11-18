import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Synthetic data only: every API request is intercepted, including contract creation.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5196';
const output = resolve('.ui-screens/sale-contracts');
await mkdir(output, { recursive: true });
const user = { maNguoiDung: 'NVUI01', hoTen: 'Nhân viên thử', vaiTro: 'NhanVien', chucVu: 'Sale', maChiNhanh: 'CNUI01', tenChiNhanh: 'Chi nhánh thử' };
const member = { hoTen: 'Khách thử hợp đồng', ngaySinh: '2000-01-01', gioiTinh: 'Nam', cccd: '000000000001', sdt: '0900000001', email: 'contract@example.invalid', quocTich: 'Việt Nam', trangThaiDuyet: 'Đủ điều kiện' };
const deposit = { maPhieuDatCoc: 'DCUI01', hoTenKhachHang: member.hoTen, sdt: member.sdt, cccd: member.cccd, viTriThue: 'Phòng thử 101', hinhThucThue: 'Nguyên phòng', tongGiaThue: 3000000, giaThue: 3000000, soTienCoc: 3000000, thoiDiemDatCoc: '2026-11-11T08:00:00', thoiGianNhanPhong: '2026-11-18T08:00:00', coTheLapHopDong: true, trangThaiHoSoCuTru: 'Đã duyệt cư trú', trangThaiThanhToan: 'Đã TT', trangThaiCoc: 'Hiệu lực', sucChuaToiDa: 2 };
const contract = { maHopDong: 'HDUI01', benThue: member.hoTen, cccdBenThue: member.cccd, maKhachHang: 'KHUI01', tenPhongDayDu: deposit.viTriThue, hinhThucThue: deposit.hinhThucThue, trangThaiKy: 'Đã ký', ngayKyHD: '2026-11-18', ngayBatDau: '2026-11-18', ngayKetThuc: '2027-11-18', thoiHanThue: 12, giaThueThang: 3000000, soTienCoc: 3000000, thanhVien: [member], dichVu: [], dieuKhoan: ['Điều khoản thử giao diện.'] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user: value })), user);
    const writes = [], errors = [];
    await context.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      let json = [];
      if (path.endsWith('/auth/toi')) json = user;
      if (path.endsWith('/avalanche/config')) json = { enabled: false };
      if (path === '/api/hop-dong/phieu-coc') json = [deposit, { ...deposit, maPhieuDatCoc: 'DCUI02', coTheLapHopDong: false, trangThaiCoc: 'Đã lập HĐ' }];
      if (path === '/api/hop-dong/phieu-coc/DCUI01') json = deposit;
      if (path.endsWith('/cu-tru-duyet')) json = { thanhVien: [member], summary: { tongThanhVien: 1, soDuDieuKien: 1, soBiTuChoi: 0, coTheTiepTucLapHopDong: true } };
      if (path.endsWith('/kiem-tra')) json = { hopLe: true, thongBao: 'Phiếu thử đủ điều kiện lập hợp đồng.' };
      if (path.endsWith('/hop-dong')) json = contract;
      if (req.method() !== 'GET') {
        writes.push({ path, body: req.postDataJSON() });
        json = contract;
      }
      return route.fulfill({ json });
    });
    const page = await context.newPage(); page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', error => errors.push(error.message));
    const shot = async name => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(100);
      assert.deepEqual(errors, [], name + ' browser errors');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth !== width) console.error(await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })).slice(0, 12)));
      assert.equal(scrollWidth, width, name + ' page overflow');
      await page.screenshot({ path: resolve(output, `${name}-${width}.png`), fullPage: true });
      report.push({ name, width, scrollWidth, errors: [...errors] });
    };
    await page.goto(base + '/nhan-vien-sale', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor();
    if (width === 390) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.locator('aside nav').getByRole('button', { name: 'Lập hợp đồng thuê', exact: true }).click();
    await page.getByText('DCUI01', { exact: true }).waitFor(); await shot('eligible-list');
    await page.getByRole('button', { name: /^Hợp đồng đã lập/ }).click();
    await page.getByRole('button', { name: 'Xem hợp đồng', exact: true }).click();
    await page.locator('#print-area-wrapper').waitFor(); await shot('issued-contract');
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: /^Phiếu chờ lập hợp đồng/ }).click();
    await page.getByRole('button', { name: 'Lập hợp đồng', exact: true }).click();
    await page.getByRole('button', { name: 'Tiếp tục lập hợp đồng', exact: true }).waitFor();
    await shot('conditions');
    await page.getByRole('button', { name: 'Tiếp tục lập hợp đồng', exact: true }).click(); await shot('members');
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click(); await shot('services');
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click(); await shot('confirm');
    const save = page.locator('main').getByRole('button', { name: 'Lập hợp đồng thuê', exact: true });
    assert.equal(await save.isDisabled(), true);
    await page.getByRole('checkbox', { name: 'Khách hàng đã kiểm tra thông tin và đồng ý ký hợp đồng' }).check();
    await page.getByRole('checkbox', { name: 'Nhân viên Sale xác nhận thông tin hợp đồng là chính xác' }).check();
    await save.click();
    await page.getByRole('heading', { name: 'Lập hợp đồng thuê thành công' }).waitFor(); await shot('success');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, '/api/hop-dong');
    assert.equal(writes[0].body.maPhieuDatCoc, deposit.maPhieuDatCoc);
    assert.equal(writes[0].body.khachHangDaXacNhan, true);
    assert.equal(writes[0].body.nhanVienDaXacNhan, true);
    assert.equal(writes[0].body.danhSachThanhVien[0].cccd, member.cccd);
    await page.getByRole('button', { name: 'Xem hợp đồng', exact: true }).click(); await shot('created-contract');
    await context.close();
  }
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`PASS: ${report.length} contract screenshots; confirmation gate and payload unchanged; no real writes.`);
} finally { await browser.close(); }
