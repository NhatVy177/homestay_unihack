import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { emailNotice, receiptTime } from '../src/components/xacNhan/receiptDisplay.js';
import { safeNextPath } from '../src/auth/returnPath.js';
assert.equal(safeNextPath('/khach-hang?tab=dat-coc&phieu=DC0001'), '/khach-hang?tab=dat-coc&phieu=DC0001');
for (const outside of ['//example.invalid', 'https://example.invalid', 'http:example.invalid', '/\\example.invalid'])
  assert.equal(safeNextPath(outside), null);
assert.equal(receiptTime('2026-11-06T02:30:00.000Z'), '09:30, 06/11/2026');
assert.equal(receiptTime(undefined), '');
assert.equal(emailNotice({ notifications: [{ kind: 'handover-confirmed', status: 'sent' }] }, 'handover-confirmed', 'sent', 'fallback'), 'sent');
assert.equal(emailNotice({ notifications: [{ kind: 'handover-confirmed', status: 'sent' }, { kind: 'handover-confirmed', status: 'logged' }] }, 'handover-confirmed', 'sent', 'fallback'), 'fallback');
assert.equal(emailNotice({ notifications: [{ kind: 'settlement-disputed', status: 'sent' }] }, 'settlement-confirmed', 'sent', 'fallback'), 'fallback');
const port = 5189, base = 'http://127.0.0.1:' + port;
// Build an unconfigured copy (process env overrides .env in Vite) so the test never depends on local .env.
const unconfigured = { ...process.env, VITE_PRIVY_APP_ID: '', VITE_AVALANCHE_CONTRACT_ADDRESS: '', VITE_AVALANCHE_CHAIN_ID: '31337', VITE_LOYALTY_ENABLED: 'true' };
const outDir = await mkdtemp(join(tmpdir(), 'homedorm-smoke-dist-'));
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit', env: unconfigured });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', outDir, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { stdio: 'ignore', windowsHide: true, env: unconfigured });
let browser, temp;
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (i > 90) throw new Error('Vite did not start');
    await new Promise(r => setTimeout(r, 500));
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const capture = async name => {
    if (!process.env.HOMEDORM_CAPTURE_DIR) return;
    await mkdir(process.env.HOMEDORM_CAPTURE_DIR, { recursive: true });
    await page.screenshot({ path: join(process.env.HOMEDORM_CAPTURE_DIR, name), fullPage: true });
  };
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(base + '/kiem-chung-avalanche', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Kiểm chứng hồ sơ trên Avalanche' }).waitFor();
  temp = await mkdtemp(join(tmpdir(), 'homedorm-evidence-'));
  const evidence = join(temp, 'invalid.json');
  await writeFile(evidence, '{}');
  await page.locator('#evidence-file').setInputFiles(evidence);
  await page.getByRole('alert').getByText('Ứng dụng chưa cấu hình contract Avalanche để kiểm chứng.').waitFor();
  await page.goto(base + '/ho-so-xac-nhan', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(base + '/?next=%2Fho-so-xac-nhan');
  await page.route('**/api/auth/toi', route => route.fulfill({ json: { maNguoiDung: 'KHDEMO', vaiTro: 'KhachHang', hoTen: 'Khách thử' } }));
  await page.route('**/api/avalanche/config', route => route.fulfill({ json: { enabled: false } }));
  // Auth UI test only: simulated session, not an authentication bypass in the app.
  await page.evaluate(() => localStorage.setItem('happyroom_session', JSON.stringify({
    _v: 2, token: 'ui-test-only', user: { maNguoiDung: 'KHDEMO', vaiTro: 'KhachHang' },
  })));
  await page.goto(base + '/ho-so-xac-nhan', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Biên bản bàn giao & đối soát' }).waitFor();
  await page.getByText('Chưa có biên bản hay bảng đối soát nào cần bạn xem.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Xác nhận biên bản/ }).count(), 0);
  // D-013: simulated e-wallet page is clearly labelled and drives the order API only.
  await page.route('**/api/thanh-toan-mo-phong/SIMTEST', route => route.fulfill({ json: { id: 'SIMTEST', refId: 'PC0001', amountVnd: 3000000, status: 'Pending' } }));
  await page.goto(base + '/thanh-toan-mo-phong/SIMTEST', { waitUntil: 'domcontentloaded' });
  await page.getByText('Giao dịch mô phỏng không trừ tiền thật.').waitFor();
  await page.getByRole('button', { name: 'Tạo mã QR MoMo' }).waitFor();
  assert.ok((await page.textContent('body')).includes('3.000.000'));
  await capture('01-cong-tien-coc.png');
  await page.route('**/api/thanh-toan-mo-phong/SIMFIRST', route => route.fulfill({ json: {
    id: 'SIMFIRST', purpose: 'thu-nhan-phong', refId: 'HDTEST', amountVnd: 2500000, status: 'Pending',
  } }));
  await page.goto(base + '/thanh-toan-mo-phong/SIMFIRST', { waitUntil: 'domcontentloaded' });
  await page.getByText('Khoản thu kỳ đầu', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Quay lại hợp đồng' }).waitFor();
  await capture('02-cong-khoan-thu-ky-dau.png');
  // D-017: one mocked case checks the rendered customer and both staff views without SQL or secrets.
  const hash = '0x' + 'a'.repeat(64);
  const at = '2026-11-06T02:30:00.000Z';
  const draft = {
    revision: 1, publishedAt: at,
    policy: { payload: { text: 'Chính sách thử' } },
    handover: { payload: { depositHeldVnd: '3000000', inventory: [{ item: 'Nệm', quantity: 1, condition: 'Tốt' }] } },
  };
  const caseData = {
    id: 'CASE-DEMO', contractId: 'HD-DEMO', sourceId: 'BG-DEMO', customerId: 'KHDEMO', revision: 3,
    state: 'accepted', depositHeldVnd: '3000000', drafts: [draft],
    handover: { revision: 1, documents: { policy: draft.policy, handover: draft.handover }, confirmationReceipt: { hash, at } },
    versions: [{ accepted: true, bundle: { version: 1, confirmationReceipt: { hash, at }, documents: {
      statement: { payload: { items: [], depositHeldVnd: '3000000', deductionsVnd: '0', refundDueVnd: '3000000', topUpDueVnd: '0' } },
    } } }],
    receipts: [{ hash, at, event: 'HandoverAccepted' }, { hash: '0x' + 'b'.repeat(64), event: 'SettlementAccepted' }],
    notifications: [{ kind: 'handover-confirmed', at, status: 'logged' }],
  };
  let shownCases = [caseData];
  let uiUser = { maNguoiDung: 'KHDEMO', vaiTro: 'KhachHang' };
  await page.unroute('**/api/auth/toi');
  await page.route('**/api/auth/toi', route => route.fulfill({ json: uiUser }));
  await page.unroute('**/api/avalanche/config');
  await page.route('**/api/avalanche/config', route => route.fulfill({ json: { enabled: true } }));
  await page.route('**/api/avalanche/cases', route => route.fulfill({ json: shownCases }));
  await page.route('**/api/avalanche/handovers/unpublished', route => route.fulfill({ json: [] }));
  const openAs = async user => {
    uiUser = user;
    await page.evaluate(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-test-only', user: value })), user);
    await page.goto(base + '/ho-so-xac-nhan', { waitUntil: 'domcontentloaded' });
  };
  await openAs(uiUser);
  await page.getByText('Bạn đã xác nhận biên bản lúc 09:30, 06/11/2026', { exact: false }).waitFor();
  // Both handover and settlement now offer evidence downloads; check the saved handover specifically.
  await page.locator('.xn-saved').filter({ hasText: 'Bạn đã xác nhận biên bản' }).getByRole('button', { name: 'File kiểm chứng (.json)' }).waitFor();
  await page.locator('.xn-card .ui-badge--success').filter({ hasText: /^Đã xác nhận$/ }).waitFor();
  await page.setViewportSize({ width: 390, height: 900 });
  assert.ok(await page.locator('.xn-card').first().evaluate(card => card.scrollWidth <= card.clientWidth + 1));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await page.locator('.xn-tech').count(), 0);
  assert.equal((await page.locator('.xn-card').textContent()).includes('0x'), false);
  await capture('03-khach-da-xac-nhan.png');
  shownCases = [structuredClone(caseData)];
  delete shownCases[0].handover.confirmationReceipt.at;
  delete shownCases[0].versions[0].bundle.confirmationReceipt.at;
  await openAs(uiUser);
  await page.getByText('Bạn đã xác nhận biên bản. Biên bản đã được lưu', { exact: false }).waitFor();
  assert.equal((await page.locator('.xn-saved strong').first().textContent()).includes('lúc'), false);
  await openAs({ maNguoiDung: 'NV-DEMO', vaiTro: 'NhanVien', chucVu: 'Quản lý' });
  await page.locator('.xn-list .ui-badge--success').filter({ hasText: /^Đã thống nhất đối soát$/ }).waitFor();
  await page.getByRole('button', { name: 'Xem', exact: true }).click();
  await page.getByText('email gần nhất:', { exact: false }).waitFor();
  assert.ok((await page.locator('.xn-list').textContent()).includes('chỉ ghi log, chưa gửi'));
  await page.getByText('Thông tin xác thực trên Avalanche').click();
  await page.getByText('Chain thử nghiệm trên máy (local)').waitFor();
  await page.getByText('0xaaaa…aaaa').waitFor();
  assert.equal(await page.getByText('Xem trên Snowtrace ↗').count(), 0);
  await capture('04-quan-ly-thong-tin-xac-thuc.png');
  await openAs({ maNguoiDung: 'NV-DEMO', vaiTro: 'NhanVien', chucVu: 'Kế toán' });
  await page.locator('.xn-list .ui-badge--success').filter({ hasText: /^Đã thống nhất đối soát$/ }).waitFor();
  await page.getByRole('button', { name: 'Xem', exact: true }).click();
  await page.getByText('Thông tin xác thực trên Avalanche').click();
  await page.getByText('Chain thử nghiệm trên máy (local)').waitFor();
  await page.getByText('0xaaaa…aaaa').waitFor();
  await capture('05-ke-toan-thong-tin-xac-thuc.png');
  await page.route('**/api/khach-moi/tong-quan', route => route.fulfill({ json: { trangThai: { soHopDong: 1, soPhieuDatCoc: 1 } } }));
  await page.route('**/api/khach-moi/phong-kha-dung**', route => route.fulfill({ json: [] }));
  await page.route('**/api/khach-moi/hop-dong-dashboard**', route => route.fulfill({ json: { MaHopDong: 'HDTEST',
    danhSachHopDong: [{ MaHopDong: 'HDTEST', TrangThai: 'Hiệu lực' }], TrangThai: 'Hiệu lực',
    TenPhong: 'Phòng demo', TenLoaiPhong: 'Studio', TenChiNhanh: 'Chi nhánh demo',
    MaPhieuCoc: 'PCTEST', KyThanhToan: 'Hàng tháng', SoTienCoc: 3000000, GiaThue: 2500000 } }));
  await page.route('**/api/thanh-toan-mo-phong/thu-nhan-phong/HDTEST', route => route.fulfill({ json: route.request().method() === 'POST'
    ? { id: 'SIMFIRST', purpose: 'thu-nhan-phong', refId: 'HDTEST', amountVnd: 2500000, status: 'Pending' }
    : { purpose: 'thu-nhan-phong', refId: 'HDTEST', amountVnd: 2500000, status: 'Pending' } }));
  await openAs({ maNguoiDung: 'KHDEMO', vaiTro: 'KhachHang' });
  await page.route('**/api/diem-thuong', route => route.fulfill({ json: {
    enabled: true, linked: true, balance: 100, awardPoints: 100, voucherPoints: 100, voucherVnd: 20000,
    contracts: [{ id: 'HDTEST' }],
    history: [
      { id: 'award', type: 'Award', invoiceId: 'HO0001', status: 'Confirmed', createdAt: at },
      { id: 'redeem', type: 'Redeem', contractId: 'HDTEST', discountVnd: 20000, appliedInvoiceId: 'HO0002', status: 'Confirmed' },
    ],
  } }));
  await page.goto(base + '/khach-hang?tab=tai-khoan', { waitUntil: 'domcontentloaded' });
  const rewardToggle = page.getByRole('button', { name: 'Điểm thưởng 100 điểm' });
  const rewardHistory = page.getByRole('heading', { name: 'Lịch sử điểm thưởng' });
  await rewardToggle.waitFor();
  assert.equal(await page.getByRole('navigation').getByText('Điểm thưởng', { exact: true }).count(), 0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await rewardToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await rewardHistory.isVisible(), false);
    await rewardToggle.press('Enter');
    await rewardHistory.waitFor();
    await page.getByText('Đã cộng điểm').waitFor();
    await page.getByText('+100 điểm', { exact: true }).waitFor();
    await page.getByText('−100 điểm', { exact: true }).waitFor();
    await page.getByText('Đã áp dụng · HO0002', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đổi ưu đãi' }).isDisabled(), true);
    assert.ok(await page.locator('.reward-profile').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await capture(`diem-thuong-ho-so-${width}.png`);
    await rewardToggle.click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/khach-hang?tab=diem-thuong', { waitUntil: 'domcontentloaded' });
  await rewardHistory.waitFor();
  await page.goto(base + '/khach-hang?tab=hop-dong', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Thanh toán khi nhận phòng' }).waitFor();
  await capture('06-hop-dong-khoan-thu-ky-dau.png');
  await page.getByRole('button', { name: 'MoMo (mô phỏng)' }).click();
  await page.waitForURL(base + '/thanh-toan-mo-phong/SIMFIRST');
  await page.getByText('Khoản thu kỳ đầu', { exact: true }).waitFor();
  // D-023: manager queue marks FIFO and requires an explanation for later requests.
  await page.route('**/api/dat-coc/cho-xac-nhan', route => route.fulfill({ json: [
    { maDangKy: 'DKD001', hoTen: 'Khách mẫu 1', maPhong: 'P102', tenPhong: 'Phòng P102',
      trangThai: 'Chờ xác nhận cọc', guiLuc: '2026-11-07T01:00:00Z', phutDaCho: 120,
      ngayDangKy: '2026-11-07', soDienThoai: '0900000000', tenNhanVienSale: 'Sale mẫu',
      hinhThucThue: 'Ghép giường', danhSachGiuong: 'G01', sucChuaToiDa: 2, soChoTrong: 2,
      yeuCauCungPhong: 2, laYeuCauDau: true, coTheNhanCoc: true, soNam: 1, soNu: 0 },
    { maDangKy: 'DKD002', hoTen: 'Khách mẫu 2', maPhong: 'P102', tenPhong: 'Phòng P102',
      trangThai: 'Chờ xác nhận cọc', guiLuc: '2026-11-07T01:01:00Z', phutDaCho: 119,
      ngayDangKy: '2026-11-07', soDienThoai: '0900000001', tenNhanVienSale: 'Sale mẫu',
      hinhThucThue: 'Ghép giường', danhSachGiuong: 'G01', sucChuaToiDa: 2, soChoTrong: 2,
      yeuCauCungPhong: 2, laYeuCauDau: false, coTheNhanCoc: true, soNam: 1, soNu: 0 },
  ] }));
  uiUser = { maNguoiDung: 'NV-DEMO', vaiTro: 'NhanVien', chucVu: 'Quản lý' };
  await page.evaluate(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-test-only', user: value })), uiUser);
  await page.goto(base + '/nhan-vien-quan-ly?tab=xac-nhan-nhan-phong', { waitUntil: 'domcontentloaded' });
  await page.getByText('Yêu cầu gửi trước').waitFor();
  await page.getByText('Đã chờ 2 giờ 0 phút').waitFor();
  await capture('07-hang-doi-coc.png');
  await page.locator('tr').filter({ hasText: 'DKD002' }).getByRole('button', { name: 'Xử lý' }).click();
  await page.getByText('Lý do duyệt yêu cầu gửi sau').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Xác nhận', exact: true }).isDisabled(), true);
  await capture('08-duyet-coc-vuot-luot.png');
  // D-024: the manager email deep link opens the exception queue and allows a partial approval.
  await page.route('**/api/nhan-phong/cu-tru/cho-duyet**', route => route.fulfill({ json: [{
    maHoSoCuTru: 'CTDEMO', maPhieuDatCoc: 'DCDEMO', hoTenKhachHang: 'Khách mẫu',
    viTriThue: 'Phòng mẫu', hinhThucThue: 'Ghép giường', gioiTinhChoPhep: 'Nam',
    soGiuongDaCoc: 2, sucChuaToiDa: 2, trangThaiHoSo: 'Chờ duyệt cư trú',
    ghiChuQuanLy: 'Quốc tịch cần quản lý kiểm tra',
  }] }));
  await page.route('**/api/nhan-phong/cu-tru/ho-so/CTDEMO', route => route.fulfill({ json: {
    hoSo: { maHoSoCuTru: 'CTDEMO', maPhieuDatCoc: 'DCDEMO', hoTenKhachHang: 'Khách mẫu',
      viTriThue: 'Phòng mẫu', hinhThucThue: 'Ghép giường', gioiTinhChoPhep: 'Nam',
      soGiuongDaCoc: 2, sucChuaToiDa: 2, trangThaiHoSo: 'Chờ duyệt cư trú',
      ghiChuQuanLy: 'Quốc tịch cần quản lý kiểm tra' },
    thanhVien: [
      { maThanhVien: 'TVDE01', hoTen: 'Người đủ điều kiện', ngaySinh: '2000-01-01',
        gioiTinh: 'Nam', cccd: '099999999991', sdt: '0900000001', quocTich: 'Việt Nam', trangThai: 'Chờ duyệt' },
      { maThanhVien: 'TVDE02', hoTen: 'Người cần xét', ngaySinh: '2000-01-01',
        gioiTinh: 'Nam', cccd: '099999999992', sdt: '0900000002', quocTich: 'Khác', trangThai: 'Chờ duyệt' },
    ],
  } }));
  await page.goto(base + '/nhan-vien-quan-ly?tab=duyet-cu-tru', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Hồ sơ cư trú cần duyệt' }).waitFor();
  await page.locator('tr').filter({ hasText: 'CTDEMO' }).getByRole('button', { name: 'Duyệt' }).click();
  await page.getByText('Lý do cần quản lý kiểm tra').waitFor();
  const reviewer = page.locator('.residence-review-card').last();
  await reviewer.locator('select').selectOption({ label: 'Bị từ chối' });
  await reviewer.locator('input').fill('Quốc tịch cần kiểm tra');
  assert.equal(await page.locator('.residence-decision-grid').getByRole('button', { name: 'Duyệt cư trú' }).isDisabled(), false);
  await capture('09-duyet-cu-tru-theo-ngoai-le.png');
  assert.deepEqual(failures, []);
  console.log('PASS: Verify, D-017 views, D-018 gateway, D-023 FIFO, D-024 residence exception; no browser exceptions.');
} finally {
  if (browser) await browser.close();
  server.kill();
  if (dirname(resolve(outDir)) === resolve(tmpdir()) && basename(outDir).startsWith('homedorm-smoke-dist-')) await rm(outDir, { recursive: true, force: true });
  if (temp) {
    if (dirname(resolve(temp)) !== resolve(tmpdir()) || !basename(temp).startsWith('homedorm-evidence-')) throw new Error('Unexpected temporary test directory');
    await rm(temp, { recursive: true });
  }
}
