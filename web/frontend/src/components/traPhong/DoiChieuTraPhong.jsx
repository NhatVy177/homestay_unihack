import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../common/Icon.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { httpClient } from '../../api/httpClient.js';
import '../../pages/nhanVienQuanLy/kiemTraTraPhong.css';

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '');

/** Move-in record card (C2): which version the tenant confirmed, notes and move-in photos. */
export function MoveInCard({ moveIn, loading, error }) {
  let status;
  if (loading) status = <span>Đang tải biên bản lúc nhận phòng...</span>;
  else if (error) status = <span>{error}</span>;
  else if (!moveIn || moveIn.nguon === 'khong-co') status = <span>Không tìm thấy biên bản lúc nhận phòng của hợp đồng này.</span>;
  else if (moveIn.nguon === 'web2') status = <><StatusBadge status="Chỉ có biên bản Web2" tone="neutral" /><span>Khách chưa xác nhận điện tử biên bản này.</span></>;
  else if (moveIn.khachDaXacNhan) status = <><StatusBadge status="Khách đã xác nhận" tone="success" /><span>Bản {moveIn.phienBan}{moveIn.xacNhanLuc ? `, xác nhận lúc ${fmtDateTime(moveIn.xacNhanLuc)}` : ''}</span></>;
  else status = <><StatusBadge status="Khách chưa xác nhận" tone="warning" /><span>Đang dùng bản {moveIn.phienBan} mới nhất đã phát hành.</span></>;

  return (
    <section className="kttp-card" aria-label="Biên bản lúc nhận phòng">
      <h4 className="kttp-card-title"><Icon name="verified_user" /> Biên bản lúc nhận phòng</h4>
      <div className="kttp-movein-status">{status}</div>
      {moveIn?.ghiChu && <p className="kttp-movein-note">Ghi chú lúc nhận phòng: {moveIn.ghiChu}</p>}
      {moveIn?.anh?.length > 0 && (
        <div className="kttp-photos">
          {moveIn.anh.map((a, i) => (
            <figure className="kttp-photo" key={`${a.ten}-${i}`}>
              <img src={`data:${a.mediaType};base64,${a.dataBase64}`} alt={`Ảnh lúc nhận phòng: ${a.ten}`} />
              <figcaption>{a.ten}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * C3: read-only comparison for the accountant while settling: move-in record of the contract,
 * condition of each item at move-in, and the manager's move-out photos.
 */
export default function DoiChieuTraPhong({ maPhieuTra }) {
  const [moveIn, setMoveIn] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const urlsRef = useRef({});

  useEffect(() => {
    let current = true;
    const base = '/kiem-tra-tra-phong/doi-chieu';
    (async () => {
      setLoading(true); setError('');
      try {
        const [m, p] = await Promise.all([
          httpClient.get(`${base}/ban-giao-vao/${maPhieuTra}`),
          httpClient.get(`${base}/anh/${maPhieuTra}`),
        ]);
        if (!current) return;
        setMoveIn(m.data);
        setPhotos(p.data || []);
        const next = {};
        for (const photo of p.data || []) {
          try {
            const res = await httpClient.get(`${base}/anh/${maPhieuTra}/${photo.maAnh}/file`, { responseType: 'blob' });
            next[photo.maAnh] = URL.createObjectURL(res.data);
          } catch { /* the caption still shows */ }
        }
        if (!current) { Object.values(next).forEach(url => URL.revokeObjectURL(url)); return; }
        urlsRef.current = next;
        setUrls(next);
      } catch (err) {
        if (current) setError(err?.response?.data?.message || 'Không tải được dữ liệu đối chiếu.');
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; Object.values(urlsRef.current).forEach(url => URL.revokeObjectURL(url)); urlsRef.current = {}; };
  }, [maPhieuTra]);

  return (
    <div className="kttp-compare" aria-label="Đối chiếu lúc nhận phòng và lúc trả phòng">
      <MoveInCard moveIn={moveIn} loading={loading} error={error} />
      {moveIn?.taiSan?.length > 0 && (
        <section className="kttp-card">
          <h4 className="kttp-card-title"><Icon name="list" /> Tình trạng tài sản lúc nhận phòng</h4>
          <table className="kttp-mini-table">
            <thead><tr><th>Tài sản</th><th className="ui-num">SL</th><th>Tình trạng ghi lúc nhận phòng</th></tr></thead>
            <tbody>
              {moveIn.taiSan.map((t, i) => (
                <tr key={`${t.ten}-${i}`}>
                  <td>{t.ten}</td><td className="ui-num">{t.soLuong}</td>
                  <td className={t.coHuHongLucVao ? 'kttp-movein-cell is-defect' : ''}>{t.tinhTrang}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="kttp-footer-note"><Icon name="info" /><span>Hư hỏng đã ghi lúc nhận phòng không được tính cho khách (chính sách hoàn cọc).</span></p>
        </section>
      )}
      <section className="kttp-card" aria-label="Ảnh lúc trả phòng">
        <h4 className="kttp-card-title"><Icon name="image" /> Ảnh lúc trả phòng <span className="kttp-card-aside">{photos.length}</span></h4>
        {photos.length > 0 ? (
          <div className="kttp-photos">
            {photos.map(p => (
              <figure className="kttp-photo" key={p.maAnh}>
                {urls[p.maAnh] ? <img src={urls[p.maAnh]} alt={`Ảnh lúc trả phòng: ${p.tenGoc}`} /> : <span className="kttp-photo-placeholder" aria-hidden="true" />}
                <figcaption>{p.keyTaiSan || 'Cả phòng'}</figcaption>
              </figure>
            ))}
          </div>
        ) : <p className="kttp-empty-note">{loading ? 'Đang tải...' : 'Quản lý không đính ảnh lúc trả phòng.'}</p>}
      </section>
    </div>
  );
}
