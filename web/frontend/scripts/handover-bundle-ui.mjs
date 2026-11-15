import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const output = join(frontend, '.ui-screens', 'c1');
await mkdir(output, { recursive: true });
// In-memory Hardhat only. No backend, SQL, SMTP, wallet secrets or external chain.
process.chdir(fileURLToPath(new URL('../../../blockchain/', import.meta.url)));
const { localChain } = await import('../../../blockchain/scripts/local-chain.mjs');
const { createEvidence, documentHash, policyVersion, writeConfirmed } = await import('../../../blockchain/src/evidence.js');
const chain = await localChain();
let server, browser, rpc;
try {
  const rpcServer = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    try {
      const input = JSON.parse(body);
      const run = async item => ({ jsonrpc: '2.0', id: item.id, result: await chain.provider.request({ method: item.method, params: item.params || [] }) });
      res.end(JSON.stringify(Array.isArray(input) ? await Promise.all(input.map(run)) : await run(input)));
    } catch { res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Test RPC failure' } })); }
  });
  rpc = await new Promise(resolve => rpcServer.listen(0, '127.0.0.1', () => resolve(rpcServer)));
  const text = 'Chính sách thử: hoàn 80% trước ký giấy.\nKhông tính hư hỏng đã ghi lúc vào.';
  const policy = { text, version: policyVersion(text), requiresConfirmation: true, ready: false };
  const salt = '0x' + 'a'.repeat(64);
  const bundles = [];
  for (const version of [1, 2]) {
    const agreementId = '0x' + String(version).repeat(64);
    const p = { schema: `homestaydorm.handover.v${version}`, agreementId, tenant: chain.addresses[2], depositHeldVnd: '3000000',
      inventory: [{ item: 'Nệm', quantity: 1, condition: 'Có vết sẵn' }], attachments: [], notes: '' };
    const policyPayload = { schema: 'homestaydorm.policy.v1', text };
    if (version === 2) {
      policyPayload.version = policy.version;
      Object.assign(p, { policyVersion: policy.version,
        contractTerms: { contractId: 'HD0001', rentVnd: '1500000', startDate: '2026-01-01', endDate: '2027-01-01', paymentCycle: 'Hàng tháng', depositVnd: '3000000' },
        signedContract: { name: 'hop-dong-HD0001-test.pdf', sha256: 'b'.repeat(64) } });
    }
    const docs = { policy: { payload: policyPayload, salt }, handover: { payload: p, salt } };
    const bundle = createEvidence(chain.deployment, 'handover', agreementId, docs);
    await writeConfirmed(chain.client, chain.wallets[0], chain.deployment, 'proposeHandover', [agreementId, chain.addresses[2], 3000000n,
      documentHash(policyPayload, salt), documentHash(p, salt)]);
    bundles.push(bundle);
  }
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5194', '--strictPort'], {
    cwd: frontend, windowsHide: true, stdio: 'ignore', env: { ...process.env, VITE_PRIVY_APP_ID: '',
      VITE_AVALANCHE_CHAIN_ID: '31337', VITE_AVALANCHE_CONTRACT_ADDRESS: chain.deployment.address,
      VITE_AVALANCHE_RPC_URL: `http://127.0.0.1:${rpc.address().port}` },
  });
  const base = 'http://127.0.0.1:5194';
  for (let i = 0; ; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (i > 100) throw new Error('C1 preview failed to start');
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const report = [];
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage(), errors = [];
    page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', e => errors.push(e.message));
    let confirmCount = 0, uploadCount = 0;
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.fallback();
      if (url.pathname.endsWith('/chinh-sach/xac-nhan')) {
        confirmCount++; assert.equal(route.request().postDataJSON().version, policy.version);
        return route.fulfill({ json: { ...policy, ready: true, confirmedAt: '2026-11-11T00:00:00Z' } });
      }
      if (url.pathname.endsWith('/chinh-sach')) return route.fulfill({ json: policy });
      if (url.pathname.endsWith('/ban-ky')) {
        if (route.request().method() === 'POST') { uploadCount++; return route.fulfill({ json: { name: 'hop-dong-HD0001-test.pdf', sha256: 'b'.repeat(64) } }); }
        return route.fulfill({ json: null });
      }
      return route.fulfill({ json: url.pathname.endsWith('/config') ? { enabled: false } : [] });
    });
    const capture = async name => {
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth }));
      assert.equal(metrics.pageWidth, width, `${name} overflow`); assert.deepEqual(errors, []);
      await page.screenshot({ path: join(output, `${name}-${width}.png`), fullPage: true });
      report.push({ name, width, ...metrics, errors: [...errors] });
    };
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const dom = await import('/node_modules/.vite/deps/react-dom_client.js');
      const createRoot = dom.createRoot || dom.default.createRoot;
      const { default: Policy } = await import('/src/components/common/DepositPolicyPanel.jsx');
      const { default: Upload } = await import('/src/components/common/SignedContractUpload.jsx');
      document.getElementById('root').style.display = 'none';
      const host = document.createElement('main'); host.style.padding = '16px'; document.body.append(host);
      const root = createRoot(host);
      window.renderC1 = kind => root.render(React.createElement(kind === 'policy' ? Policy : Upload,
        kind === 'policy' ? { depositId: 'DC0001' } : { contractId: 'HD0001' }));
      window.renderC1('policy');
    });
    await page.getByText('Chính sách hoàn cọc', { exact: false }).first().waitFor();
    assert.equal(await page.getByRole('button', { name: 'Xác nhận chính sách' }).isDisabled(), true);
    await capture('legacy-policy');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Xác nhận chính sách' }).click();
    await page.getByText('Bạn đã xác nhận chính sách bổ sung.').waitFor();
    assert.equal(confirmCount, 1);
    await capture('confirmed-policy');
    await page.evaluate(() => window.renderC1('upload'));
    await page.getByText('Chưa có bản hợp đồng đã ký.').waitFor();
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nSynthetic test document') });
    await page.getByRole('button', { name: 'Lưu bản hợp đồng đã ký' }).click();
    await page.getByText('Đã lưu:', { exact: false }).waitFor();
    assert.equal(uploadCount, 1);
    await capture('signed-upload');
    for (const [index, bundle] of bundles.entries()) {
      await page.goto(base + '/kiem-chung-avalanche', { waitUntil: 'domcontentloaded' });
      await page.locator('#evidence-file').setInputFiles({ name: 'synthetic-evidence.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bundle)) });
      await page.getByRole('heading', { name: 'Nội dung khớp bản ghi trên chain' }).waitFor();
      if (index === 1) { await page.getByRole('heading', { name: 'Điều khoản hợp đồng' }).waitFor(); await page.getByText('Thông tin bản hợp đồng đã ký').click(); }
      else assert.equal(await page.getByRole('heading', { name: 'Điều khoản hợp đồng' }).count(), 0);
      await capture(`verify-v${index + 1}`);
    }
    const altered = structuredClone(bundles[1]); altered.documents.handover.payload.contractTerms.rentVnd = '1600000';
    await page.locator('#evidence-file').setInputFiles({ name: 'altered.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(altered)) });
    await page.getByRole('heading', { name: 'Chưa xác minh được' }).waitFor();
    await capture('verify-altered');
    await context.close();
  }
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log('PASS C1: legacy policy acknowledgment, signed upload, v1/v2 verification and altered terms, 1440/390px; no SQL/external chain or browser errors.');
} finally {
  await browser?.close(); server?.kill();
  if (rpc) await new Promise(resolve => rpc.close(resolve));
  await chain.close();
}
