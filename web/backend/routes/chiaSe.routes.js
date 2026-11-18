import express from 'express';
import { getChiTietPhong } from '../services/phongKhamPha.service.js';
import { toPublicRoomDetail } from '../models/publicRoom.dto.js';

// Link phòng để dán lên Facebook/Messenger/Zalo: các trang này chỉ đọc thẻ Open Graph trong HTML từ máy chủ (không chạy JavaScript
// của web một trang), nên đường dẫn này trả HTML có tiêu đề, giá, địa chỉ, ảnh rồi chuyển người dùng sang trang phòng /phong/<mã>.
// PUBLIC_WEB_URL: địa chỉ công khai của web (ảnh phòng và trang phòng nằm ở đó). Facebook chỉ đọc được khi web và API ở địa chỉ công khai.
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`;
const absolute = (base, path) => (/^https?:\/\//i.test(path || '') ? path : `${base.replace(/\/$/, '')}${path?.startsWith('/') ? '' : '/'}${path || ''}`);

export function roomSharePage(room, { webUrl, selfUrl }) {
  const pageUrl = absolute(webUrl, `/phong/${encodeURIComponent(room.maPhong)}`);
  const price = Number(room.giaThueTheoGiuong || room.giaThue) > 0 ? `${money(room.giaThueTheoGiuong || room.giaThue)}/${room.giaThueTheoGiuong ? 'giường' : 'phòng'}/tháng` : 'Giá liên hệ';
  const free = Number(room.soChoTrong) > 0 ? `Còn ${room.soChoTrong} chỗ` : room.trangThaiQuanTam || '';
  const title = `${room.tenPhong} · ${room.loaiPhong || 'HomestayDorm'}`;
  const description = [price, free, room.diaChi || room.chiNhanh].filter(Boolean).join(' · ');
  const image = absolute(webUrl, room.anhDai || room.urlImg || room.hinhAnh?.[0]?.urlAnh || '/images/home/dorm.jpg');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>${escape(title)} | HomestayDorm</title>
<meta name="description" content="${escape(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="HomestayDorm">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="${escape(room.tenPhong)}">
<meta property="og:url" content="${escape(selfUrl)}"><meta property="og:locale" content="vi_VN">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${escape(pageUrl)}">
<link rel="canonical" href="${escape(pageUrl)}"></head>
<body><p>Đang mở <a href="${escape(pageUrl)}">${escape(room.tenPhong)}</a>...</p>
<script>location.replace(${JSON.stringify(pageUrl)})</script></body></html>`;
}

export function createShareRouter({ getRoom = getChiTietPhong, env = process.env } = {}) {
  const router = express.Router();
  router.get('/phong/:maPhong', async (req, res, next) => {
    const webUrl = env.PUBLIC_WEB_URL || 'http://localhost:5173';
    const id = String(req.params.maPhong || '');
    if (!/^[a-zA-Z0-9]{4}$/.test(id)) return res.redirect(302, absolute(webUrl, '/phong'));
    try {
      const raw = await getRoom(id);
      if (!raw) return res.redirect(302, absolute(webUrl, '/phong'));
      const selfUrl = `${env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}${req.originalUrl.split('?')[0]}`;
      res.set('Cache-Control', 'public, max-age=300').type('html').send(roomSharePage(toPublicRoomDetail(raw), { webUrl, selfUrl }));
    } catch (error) { next(error); }
  });
  return router;
}

export default createShareRouter();
