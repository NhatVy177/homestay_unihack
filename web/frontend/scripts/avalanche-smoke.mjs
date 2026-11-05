import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
const port = 5189, base = 'http://127.0.0.1:' + port;
const privyConfigured = process.argv.includes('--privy');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { stdio: 'ignore', windowsHide: true, env: { ...process.env, VITE_PRIVY_APP_ID: '' } });
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
  assert.deepEqual(failures, []);
  console.log('PASS: public Verify, missing-config feedback, protected route, disabled confirmation state, simulated payment page; no browser exceptions.');
} finally {
  if (browser) await browser.close();
  server.kill();
  if (temp) {
    if (dirname(resolve(temp)) !== resolve(tmpdir()) || !basename(temp).startsWith('homedorm-evidence-')) throw new Error('Unexpected temporary test directory');
    await rm(temp, { recursive: true });
  }
}
