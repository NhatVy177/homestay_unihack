import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { buildHandoverEvidenceHtml } from '../src/lib/avalanche/evidencePrint.js';
// Bản PDF dễ đọc của biên bản bàn giao: dựng từ gói bằng chứng, hiện đủ thông tin chính, thoát ký tự HTML, in được ra PDF thật.
const folder = '.ui-screens/evidence-print';
await mkdir(folder, { recursive: true });
const bundle = JSON.parse(await readFile(process.env.EVIDENCE_JSON || new URL('./fixtures/handover-evidence.json', import.meta.url), 'utf8'));
const html = buildHandoverEvidenceHtml(bundle);
assert.match(html, /Biên bản bàn giao phòng/); assert.match(html, /HD0001/); assert.match(html, /2\.800\.000 VNĐ/);
assert.match(html, /testnet\.snowtrace\.io\/tx\/0x/, 'có link giao dịch trên Snowtrace');
assert.match(html, /nút "Tải bản lưu biên bản"|Tải bản lưu biên bản/, 'nói rõ JSON mới là bản kiểm chứng');
assert.throws(() => buildHandoverEvidenceHtml({ kind: 'settlement' }), /Chỉ in được biên bản bàn giao/);
assert.doesNotMatch(buildHandoverEvidenceHtml({ ...bundle, documents: { ...bundle.documents, handover: { ...bundle.documents.handover, payload: { ...bundle.documents.handover.payload, notes: '<script>alert(1)</script>' } } } }), /<script>alert/, 'thoát ký tự HTML');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: `${folder}/preview.png`, fullPage: true });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  assert.ok(pdf.length > 5000 && pdf.subarray(0, 4).toString() === '%PDF', 'in ra PDF hợp lệ');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'không tràn ngang');
  console.log(`PASS evidence print: readable handover page, Snowtrace links, escaped text, PDF ${pdf.length} bytes.`);
} finally { await browser.close(); }
