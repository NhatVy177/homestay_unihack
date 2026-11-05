import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { emailNotice, receiptTime } from '../src/components/xacNhan/receiptDisplay.js';
assert.equal(receiptTime('2026-11-06T02:30:00.000Z'), '09:30, 06/11/2026');
assert.equal(receiptTime(undefined), '');
assert.equal(emailNotice({ notifications: [{ kind: 'handover-confirmed', status: 'sent' }] }, 'handover-confirmed', 'sent', 'fallback'), 'sent');
assert.equal(emailNotice({ notifications: [{ kind: 'handover-confirmed', status: 'sent' }, { kind: 'handover-confirmed', status: 'logged' }] }, 'handover-confirmed', 'sent', 'fallback'), 'fallback');
assert.equal(emailNotice({ notifications: [{ kind: 'settlement-disputed', status: 'sent' }] }, 'settlement-confirmed', 'sent', 'fallback'), 'fallback');
const port = 5189, base = 'http://127.0.0.1:' + port;
// Build an unconfigured copy (process env overrides .env in Vite) so the test never depends on local .env.
const unconfigured = { ...process.env, VITE_PRIVY_APP_ID: '', VITE_AVALANCHE_CONTRACT_ADDRESS: '', VITE_AVALANCHE_CHAIN_ID: '31337' };
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
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(base + '/kiem-chung-avalanche', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Kiểm chứng hồ sơ trên Avalanche' }).waitFor();
  temp = await mkdtemp(join(tmpdir(), 'homedorm-evidence-'));
  const evidence = join(temp, 'invalid.json');
  await writeFile(evidence, '{}');
  await page.locator('#evidence-file').setInputFiles(evidence);
  await page.getByText('Ứng dụng chưa cấu hình contract Avalanche để kiểm chứng.').waitFor();
  await page.goto(base + '/ho-so-xac-nhan', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(base + '/');
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
  await page.getByText('MÔI TRƯỜNG MÔ PHỎNG', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).waitFor();
  assert.ok((await page.textContent('body')).includes('3.000.000'));
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
  await page.getByRole('button', { name: 'Tải bản lưu biên bản' }).waitFor();
  assert.equal(await page.locator('.xn-tech').count(), 0);
  assert.equal((await page.locator('.xn-card').textContent()).includes('0x'), false);
  shownCases = [structuredClone(caseData)];
  delete shownCases[0].handover.confirmationReceipt.at;
  delete shownCases[0].versions[0].bundle.confirmationReceipt.at;
  await openAs(uiUser);
  await page.getByText('Bạn đã xác nhận biên bản. Biên bản đã được lưu', { exact: false }).waitFor();
  assert.equal((await page.locator('.xn-saved strong').first().textContent()).includes('lúc'), false);
  await openAs({ maNguoiDung: 'NV-DEMO', vaiTro: 'NhanVien', chucVu: 'Quản lý' });
  await page.getByRole('button', { name: 'Xem', exact: true }).click();
  await page.getByText('email gần nhất:', { exact: false }).waitFor();
  assert.ok((await page.locator('.xn-list').textContent()).includes('chỉ ghi log, chưa gửi'));
  await page.getByText('Thông tin xác thực trên Avalanche').click();
  await page.getByText('Chain thử nghiệm trên máy (local)').waitFor();
  await page.getByText('0xaaaa…aaaa').waitFor();
  assert.equal(await page.getByText('Xem trên Snowtrace ↗').count(), 0);
  await openAs({ maNguoiDung: 'NV-DEMO', vaiTro: 'NhanVien', chucVu: 'Kế toán' });
  await page.getByRole('button', { name: 'Xem', exact: true }).click();
  await page.getByText('Thông tin xác thực trên Avalanche').click();
  await page.getByText('Chain thử nghiệm trên máy (local)').waitFor();
  await page.getByText('0xaaaa…aaaa').waitFor();
  assert.deepEqual(failures, []);
  console.log('PASS: Verify, protected route, simulated payment, D-017 customer/staff views and old receipts; no browser exceptions.');
} finally {
  if (browser) await browser.close();
  server.kill();
  if (dirname(resolve(outDir)) === resolve(tmpdir()) && basename(outDir).startsWith('homedorm-smoke-dist-')) await rm(outDir, { recursive: true, force: true });
  if (temp) {
    if (dirname(resolve(temp)) !== resolve(tmpdir()) || !basename(temp).startsWith('homedorm-evidence-')) throw new Error('Unexpected temporary test directory');
    await rm(temp, { recursive: true });
  }
}
