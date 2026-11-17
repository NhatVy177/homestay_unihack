import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
// Dải "Thuê minh bạch" ở trang chủ: hiện khi có hồ sơ được khách xác nhận, ẩn khi chưa có/không đọc được chuỗi,
// không nói thuật ngữ ở phần đầu, khối thu gọn có liên kết Snowtrace. API là fixture.
const base = process.env.UI_BASE_URL || 'http://localhost:5199', folder = '.ui-screens/trust-strip';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const hash = (n) => `0x${String(n).padStart(64, 'a')}`;
const ready = { ready: true, updatedAt: '2026-11-17T04:00:00Z', transactions: 6, handoversPublished: 12, handoversConfirmed: 12, settlementsSent: 10, settlementsAccepted: 9, acceptedWithoutDispute: 7, disputes: 2,
  refundVnd: '48000000', topUpVnd: '5000000', explorer: 'https://testnet.snowtrace.io', network: 'Avalanche Fuji (mạng thử nghiệm)',
  recent: [
    { type: 'SettlementAccepted', room: 'Phòng P101', hash: hash(1), blockNumber: '9', at: '2026-11-17T03:00:00Z' },
    { type: 'SettlementProposed', room: 'Phòng P101', hash: hash(2), blockNumber: '8', at: '2026-11-16T03:00:00Z' },
    { type: 'HandoverProposed', room: 'Phòng P202', hash: hash(3), blockNumber: '7', at: '2026-11-15T03:00:00Z' },
    { type: 'HandoverAccepted', room: 'Phòng P303', hash: hash(4), blockNumber: '6', at: '2026-11-14T03:00:00Z' },
    { type: 'HandoverProposed', room: 'Phòng P404', hash: hash(5), blockNumber: '5', at: '2026-11-13T03:00:00Z' }] };
try {
  for (const width of [1440, 390]) {
    for (const mode of ['ready', 'not-ready', 'empty', 'error']) {
      const errors = [];
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await ctx.route('**/api/**', (route) => {
        const path = new URL(route.request().url()).pathname;
        if (!path.startsWith('/api/')) return route.fallback();
        if (path === '/api/trang-chu/minh-bach') {
          if (mode === 'error') return route.fulfill({ status: 500, json: { message: 'x' } });
          return route.fulfill({ json: mode === 'ready' ? ready : mode === 'not-ready' ? { ready: false } : { ...ready, handoversConfirmed: 0, settlementsAccepted: 0 } });
        }
        return route.fulfill({ json: [] });
      });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      const strip = page.locator('#minh-bach');
      if (mode !== 'ready') {
        await page.waitForTimeout(1200);
        assert.equal(await strip.count(), 0, `chế độ ${mode}: không hiện dải`);
        assert.deepEqual(errors, []);
        await ctx.close(); continue;
      }
      await strip.waitFor({ state: 'attached' });
      await strip.scrollIntoViewIfNeeded();
      const text = await strip.innerText();
      assert.match(text, /Thuê minh bạch, cọc rõ ràng/);
      assert.match(text, /12\s*biên bản bàn giao đã được khách xác nhận|biên bản bàn giao đã được khách xác nhận/);
      assert.doesNotMatch(text, /Avalanche|Fuji|blockchain|mã băm/i, 'phần đầu không nói thuật ngữ');
      assert.equal(await page.locator('#ts-activity').count(), 0, 'khối hoạt động đóng sẵn');
      await page.screenshot({ path: `${folder}/strip-${width}.png` });
      await strip.getByRole('button', { name: 'Xem hoạt động gần đây' }).click();
      const proof = page.locator('#ts-activity');
      await proof.waitFor();
      const activity = await proof.innerText();
      assert.match(activity, /Hoạt động gần đây/);
      assert.equal(await proof.locator('.ts-list li').count(), 3, 'tối đa 3 phòng, mỗi phòng một dòng');
      assert.match(activity, /Phòng P101\s*Đã bàn giao và đối soát tiền cọc xong/);
      assert.match(activity, /Phòng P202\s*Đã lập biên bản bàn giao, chờ khách xác nhận/);
      assert.match(activity, /Phòng P303\s*Khách đã xác nhận biên bản bàn giao/);
      assert.doesNotMatch(activity, /P404/, 'phòng thứ 4 không hiện');
      assert.equal((activity.match(/Phòng P101/g) || []).length, 1, 'mỗi phòng chỉ một dòng');
      assert.doesNotMatch(activity, /bằng chứng|Avalanche|Fuji|chuỗi/i, 'không nhắc công nghệ ở trang chủ');
      const links = await proof.getByRole('link', { name: /Mở bản gốc/ }).evaluateAll((els) => els.map((el) => el.href));
      assert.deepEqual(links, [`https://testnet.snowtrace.io/tx/${hash(1)}`, `https://testnet.snowtrace.io/tx/${hash(3)}`, `https://testnet.snowtrace.io/tx/${hash(4)}`]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.screenshot({ path: `${folder}/proof-${width}.png` });
      assert.deepEqual(errors, []);
      await ctx.close();
    }
  }
  console.log('PASS trust strip: shown with chain-derived numbers in plain language, hidden when not ready/empty/error, proof list links to Snowtrace; fixture APIs only.');
} finally { await browser.close(); }
