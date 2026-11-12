import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5202';
const before = process.argv.includes('--before');
const directory = resolve(`.ui-screens/customer-form-feedback/${before ? 'before' : 'after'}`);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const user = { maNguoiDung: 'KH-UI', hoTen: 'Khách kiểm thử', vaiTro: 'KhachHang', ngaySinh: '1998-01-01', gioiTinh: 'Nữ', soDienThoai: '0900000000', email: 'fixture@example.test', cccd: '000000000000' };
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(user => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'fixture-only', user })), user);
    let writes = 0;
    const payloads = [], errors = [];
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.fallback();
      if (path.endsWith('/auth/toi')) return route.fulfill({ json: user });
      if (path.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (path.endsWith('/khach-moi/ho-so') && route.request().method() === 'POST') {
        writes++; payloads.push(route.request().postDataJSON());
        if (before || writes === 1) return route.fulfill({ status: 409, json: { message: before ? 'Vui lòng nhập đầy đủ thông tin nhu cầu thuê.' : 'Hồ sơ vừa thay đổi. Vui lòng kiểm tra lại và gửi lại.' } });
        return route.fulfill({ json: { maDangKy: 'DK-UI' } });
      }
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/khach-hang`);
    await page.getByRole('button', { name: /Đăng ký nhu cầu thuê|Tạo nhu cầu thuê/ }).first().click();
    const form = page.locator('.kh-register-modal').first();
    await form.getByLabel('Khu vực mong muốn').fill('Quận 9');
    await form.getByLabel('Loại phòng mong muốn').selectOption('Phòng 2 người');
    await form.getByLabel('Mức giá tối đa').fill('4000000');
    await form.getByLabel('Thời hạn thuê').fill('6');
    const date = form.getByLabel('Thời gian dự kiến dọn vào');
    await date.fill('2005-07-17');
    const submit = form.getByRole('button', { name: 'Gửi yêu cầu đăng ký', exact: true });
    const shot = async name => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: resolve(directory, `${name}-${width}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal page overflow');
      assert.deepEqual(errors, []);
    };
    await submit.click();
    if (before) {
      await page.locator('.kh-toast.show').waitFor();
      await shot('past-date-toast');
      const toast = await page.locator('.kh-toast').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
      results.push({ width, writes, fixture: true, toast, errors });
      await context.close(); continue;
    }
    const dialog = page.getByRole('alertdialog', { name: 'Chưa gửi được đăng ký thuê' });
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /từ ngày mai trở đi/);
    assert.equal(writes, 0, 'past date never reaches the API');
    assert.equal(await date.getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('.kh-toast.show').count(), 0, 'form errors use dialog, not toast');
    const toastColors = await page.locator('.kh-toast').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
    assert.notEqual(toastColors.background, 'rgba(0, 0, 0, 0)', 'other portal notifications have a solid background');
    assert.notEqual(toastColors.background, toastColors.color);
    await page.waitForFunction(() => document.activeElement?.classList.contains('rm-btn'));
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true, 'keyboard focus stays in dialog');
    await shot('past-date-dialog');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'ngayDuKienVaoO');
    assert.equal(await date.inputValue(), '2005-07-17', 'validation preserves entered values');
    await shot('inline-date-error');
    const tomorrow = await date.getAttribute('min');
    assert.ok(tomorrow);
    await date.fill(tomorrow);
    assert.equal(await date.getAttribute('aria-invalid'), null);
    await submit.click(); await dialog.waitFor();
    assert.equal(writes, 1);
    assert.match(await dialog.innerText(), /Hồ sơ vừa thay đổi/);
    assert.equal(await form.getByLabel('Mức giá tối đa').inputValue(), '4000000');
    assert.equal(await date.inputValue(), tomorrow);
    await shot('server-error-dialog');
    await dialog.getByRole('button', { name: 'Kiểm tra lại thông tin' }).click();
    await submit.click();
    await page.getByRole('alertdialog', { name: 'Gửi thông tin đăng ký thuê thành công' }).waitFor();
    assert.equal(writes, 2, 'retry submits once and completes existing success flow');
    assert.equal(await form.count(), 0);
    assert.deepEqual(payloads[0], payloads[1], 'retry keeps the same business payload');
    assert.equal(payloads[1].ngayDuKienVaoO, tomorrow);
    assert.equal(payloads[1].thoiHanThue, '6');
    assert.equal(payloads[1].khuVucMongMuon, 'Quận 9');
    await shot('success-dialog');
    results.push({ width, writes, invalidDateBlocked: true, keyboard: true, retainedValues: true, retry: true, fixture: true, errors });
    await context.close();
  }
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  console.log(before ? 'Captured original unreadable error toast.' : 'PASS: readable errors, inline date guidance, focus, preserved input and retry at 1440/390. API fixtures only.');
} finally { await browser.close(); }
