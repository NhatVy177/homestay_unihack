import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const folder = '.ui-screens/customer-profile-detail';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

await mkdir(folder, { recursive: true });

const customer = {
  maNguoiDung: 'KH-UI-PROFILE',
  maKhachHang: 'KH-UI-PROFILE',
  hoTen: 'Khách kiểm thử',
  vaiTro: 'KhachHang',
};
const profile = {
  maDangKy: 'DK0009',
  trangThai: 'Xác nhận cọc',
  ngayDangKy: '2026-11-18T09:00:00+07:00',
  hinhThucThue: null,
  soNguoiO: 2,
  khuVucMongMuon: 'Quận 1',
  loaiPhongYeuCau: 'Phòng 2 người',
  mucGia: 2200000,
  ngayDuKienVaoO: '2026-11-20T00:00:00+07:00',
  thoiHanThue: 6,
  thoiGianHen: '2026-11-19T09:30:00+07:00',
  ghiChu: 'Phòng quan tâm: Phòng P102. Thời gian xem mong muốn: ngày 28/11/2026, Buổi sáng (7:00–11:30). Nhóm 2 người: 1) Nguyễn Văn A - người đại diện; 2) Nguyễn Thị B. '.repeat(6),
};

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ user }) => {
      localStorage.setItem('happyroom_session', JSON.stringify({ _v: 2, token: 'ui-fixture-only', user }));
    }, { user: customer });
    await context.route('**/api/**', async (route) => {
      const { pathname } = new URL(route.request().url());
      if (!pathname.startsWith('/api/')) return route.fallback();
      if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { message: 'Fixture chỉ đọc.' } });
      if (pathname.endsWith('/auth/toi')) return route.fulfill({ json: customer });
      if (pathname.endsWith('/avalanche/config')) return route.fulfill({ json: { enabled: false } });
      if (pathname.endsWith('/khach-moi/tong-quan')) {
        return route.fulfill({ json: { trangThai: { coQuyTrinhThueDangHoatDong: true }, hoSo: [profile], lichXem: [], phongGoiY: [] } });
      }
      if (pathname.endsWith('/khach-moi/ho-so/DK0009')) return route.fulfill({ json: profile });
      return route.fulfill({ json: [] });
    });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/khach-hang?tab=ho-so`, { waitUntil: 'domcontentloaded' });
    const detailButton = page.getByRole('button', { name: 'Xem chi tiết', exact: true });
    try {
      await detailButton.waitFor({ timeout: 10000 });
    } catch {
      throw new Error(`Không tìm thấy nút chi tiết tại ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 800)}`);
    }
    await detailButton.click();
    const modal = page.locator('.kh-profile-detail-modal:not(.kh-schedule-detail-modal)');
    await modal.getByRole('heading', { name: 'Hồ sơ #DK0009' }).waitFor();

    const metrics = await page.evaluate(() => {
      const dialog = document.querySelector('.kh-profile-detail-modal:not(.kh-schedule-detail-modal)');
      const note = dialog?.querySelector('.kh-profile-detail-note p');
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        modalScrollWidth: dialog?.scrollWidth,
        modalClientWidth: dialog?.clientWidth,
        noteClientHeight: note?.clientHeight,
        noteScrollHeight: note?.scrollHeight,
      };
    });
    assert.ok(metrics.pageWidth <= metrics.viewportWidth, `Trang tràn ngang ở ${width}px.`);
    assert.ok(metrics.modalScrollWidth <= metrics.modalClientWidth + 1, `Modal tràn ngang ở ${width}px.`);
    assert.ok(metrics.noteClientHeight <= 112, `Ghi chú chưa được giới hạn chiều cao ở ${width}px.`);
    assert.ok(metrics.noteScrollHeight > metrics.noteClientHeight, `Fixture ghi chú chưa kiểm được cuộn ở ${width}px.`);
    assert.deepEqual(errors, [], `Lỗi trình duyệt ở ${width}px: ${errors.join('; ')}`);
    await page.screenshot({ path: `${folder}/profile-detail-${width}.png` });
    await context.close();
  }

  console.log('PASS profile detail modal: đồng bộ ResultModal, ghi chú dài cuộn được, không tràn ngang ở 1440/390.');
} finally {
  await browser.close();
}
