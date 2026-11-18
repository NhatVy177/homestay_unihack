import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createShareRouter, roomSharePage } from '../routes/chiaSe.routes.js';

const room = { MaPhong: 'P101' };
const detail = { maPhong: 'P101', tenPhong: 'Phòng P101', loaiPhong: 'Phòng 2 người', giaThueTheoGiuong: 2200000, soChoTrong: 2, diaChi: '12 Nguyễn Trãi, Quận 1', anhDai: '/images/phong/P101/cover.png' };

test('share page carries Open Graph tags with price, address and an absolute image, then redirects to the room page', () => {
  const html = roomSharePage(detail, { webUrl: 'https://homestaydorm.vn', selfUrl: 'https://api.homestaydorm.vn/chia-se/phong/P101' });
  assert.match(html, /<meta property="og:title" content="Phòng P101 · Phòng 2 người">/);
  assert.match(html, /og:description" content="2\.200\.000đ\/giường\/tháng · Còn 2 chỗ · 12 Nguyễn Trãi, Quận 1"/);
  assert.match(html, /og:image" content="https:\/\/homestaydorm\.vn\/images\/phong\/P101\/cover\.png"/);
  assert.match(html, /url=https:\/\/homestaydorm\.vn\/phong\/P101/);
  assert.match(html, /location\.replace\("https:\/\/homestaydorm\.vn\/phong\/P101"\)/);
});

test('text is escaped so room data cannot inject markup', () => {
  const html = roomSharePage({ ...detail, tenPhong: '<script>x</script>"' }, { webUrl: 'http://w', selfUrl: 'http://a' });
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;&quot;/);
});

test('router: valid room renders html, unknown or malformed codes go back to the room list', async () => {
  const app = express();
  app.use('/chia-se', createShareRouter({ getRoom: async (id) => (id === 'P101' ? { ...room, ...detail, TenPhong: 'Phòng P101' } : null), env: { PUBLIC_WEB_URL: 'http://web.test' } }));
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const ok = await fetch(`http://localhost:${port}/chia-se/phong/P101`, { redirect: 'manual' });
    assert.equal(ok.status, 200); assert.match(ok.headers.get('content-type'), /text\/html/);
    assert.match(await ok.text(), /og:image/);
    for (const bad of ['Z999', 'bad!!']) {
      const res = await fetch(`http://localhost:${port}/chia-se/phong/${bad}`, { redirect: 'manual' });
      assert.equal(res.status, 302); assert.equal(res.headers.get('location'), 'http://web.test/phong');
    }
  } finally { server.close(); }
});
