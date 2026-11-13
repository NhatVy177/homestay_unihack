import { chromium } from 'playwright-core';

// Quét chữ trùng màu nền (ví dụ thông báo lỗi chữ trắng trên nền trắng vì thiếu biến CSS).
// Mở từng tab của 4 vai trò, hai chế độ: dữ liệu rỗng và mọi API trả lỗi 500 (để hiện các khung báo lỗi).
// Chỉ dùng dữ liệu giả: mọi request /api đều bị chặn, không dùng tài khoản thật.
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const roles = [['khach', '/khach-hang', 'KhachHang'], ['sale', '/nhan-vien-sale', 'Sale'], ['quan-ly', '/nhan-vien-quan-ly', 'Quản lý'], ['ke-toan', '/nhan-vien-ke-toan', 'Kế toán']];
const MIN_RATIO = 2;

function scanPage() {
  const parse = value => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const [r, g, b, a = 1] = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const backgroundOf = element => {
    for (let node = element; node; node = node.parentElement) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color && color.a > 0.5) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const luminance = ({ r, g, b }) => {
    const channel = value => { const v = value / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

  const bad = [];
  for (const element of document.querySelectorAll('body *')) {
    const text = [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent.trim()).join(' ').trim();
    if (!text || ['SCRIPT', 'STYLE'].includes(element.tagName)) continue;
    if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const foreground = parse(getComputedStyle(element).color);
    if (!foreground) continue;
    const contrast = ratio(foreground, backgroundOf(element));
    if (contrast < 2) {
      bad.push({ element: `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? '.' + element.className.trim().split(/\s+/).join('.') : ''}`, text: text.slice(0, 60), contrast: Number(contrast.toFixed(2)) });
    }
  }
  return bad;
}

const findings = [];
try {
  for (const mode of ['rong', 'loi']) {
    for (const [name, path, role] of roles) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      const user = { maNguoiDung: 'UI-DEMO', maNhanVien: 'UI-DEMO', hoTen: 'Tài khoản giao diện', tenDangNhap: 'ui-demo', maChiNhanh: 'CN-DEMO', tenChiNhanh: 'Chi nhánh demo', vaiTro: role === 'KhachHang' ? 'KhachHang' : 'NhanVien', chucVu: role === 'KhachHang' ? undefined : role };
      await context.addInitScript(value => localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user: value })), user);
      await context.route('**/api/**', route => {
        const url = new URL(route.request().url());
        if (!url.pathname.startsWith('/api/')) return route.fallback();
        if (url.pathname.endsWith('/auth/toi')) return route.fulfill({ json: user });
        if (url.pathname.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
        if (mode === 'loi') return route.fulfill({ status: 500, json: { message: 'Lỗi thử nghiệm: không tải được dữ liệu.' } });
        return route.fulfill({ json: url.pathname.includes('tong-quan') ? {} : [] });
      });
      const page = await context.newPage();
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor({ timeout: 20000 });
      const tabs = await page.locator('aside nav button:not(.is-locked):not(:disabled)').allInnerTexts();
      for (const tab of tabs) {
        await page.locator('aside nav button', { hasText: tab.trim() }).first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
        // Hiện thông báo nổi (toast) của cổng khách để kiểm tra màu của nó.
        await page.evaluate(() => {
          const toast = document.querySelector('.kh-toast');
          if (toast) { toast.textContent = 'Thông báo thử nghiệm'; toast.classList.add('show'); }
        });
        const bad = await page.evaluate(scanPage);
        for (const item of bad) findings.push({ mode, role: name, tab: tab.trim(), ...item });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const unique = new Map();
for (const item of findings) unique.set(`${item.role}|${item.element}|${item.text}`, item);
console.log(JSON.stringify([...unique.values()], null, 1));
console.log(unique.size ? `FAIL: ${unique.size} chữ trùng màu nền (độ tương phản < ${MIN_RATIO})` : 'PASS: không có chữ nào trùng màu nền ở 4 vai trò, cả chế độ dữ liệu rỗng và chế độ lỗi API.');
process.exitCode = unique.size ? 1 : 0;
