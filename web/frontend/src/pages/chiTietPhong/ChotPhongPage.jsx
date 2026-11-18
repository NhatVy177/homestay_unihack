import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { httpClient } from '../../api/httpClient.js';
import { Icon } from '../../components/common/Icon.jsx';
import PublicLayout from '../../components/publicSite/PublicLayout.jsx';
import ChiTietPhongPage from './ChiTietPhongPage.jsx';

const dateVi = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// /chot/<mã>: link Sale gửi qua Messenger/Zalo. Hiện đúng phòng Sale chọn, kèm lời nhắn và giờ hẹn xem; bấm đăng ký thì
// đăng nhập (nếu chưa) rồi form đăng ký điền sẵn phòng, ngày giờ hẹn và ghi nguồn khách là "Sale gửi link".
export default function ChotPhongPage() {
  const { token } = useParams();
  const [offer, setOffer] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    httpClient.get(`/link-chot/${encodeURIComponent(token)}`).then(({ data }) => { if (alive) setOffer(data); })
      .catch((e) => { if (alive) setError(e.response?.data?.message || 'Không mở được link này.'); });
    return () => { alive = false; };
  }, [token]);
  if (error) return <PublicLayout><div className="pl-wrap ctp"><div className="kp-detail-error" role="alert"><h1>Link không còn dùng được</h1><p>{error}</p>
    <Link className="kp-btn kp-btn-primary" to="/phong">Xem các phòng đang có</Link></div></div></PublicLayout>;
  if (!offer) return <PublicLayout><div className="pl-wrap ctp"><div className="kp-loading" role="status"><span /><p>Đang mở phòng...</p></div></div></PublicLayout>;
  const when = [offer.gioXem, dateVi(offer.ngayXem)].filter(Boolean).join(' ngày ');
  const query = new URLSearchParams({ nguon: 'Sale gửi link', ...(offer.ngayXem ? { ngayXem: offer.ngayXem } : {}), ...(offer.gioXem ? { gioXem: offer.gioXem } : {}), ...(offer.maSale ? { tuSale: offer.maSale } : {}) }).toString();
  const banner = <div className="ui-card ctp-offer" role="note">
    <span className="ctp-offer-icon" aria-hidden="true"><Icon name="person" /></span>
    <div>
      <strong>{offer.tenSale || 'Nhân viên HomestayDorm'} gửi bạn phòng này</strong>
      {when && <p>Hẹn xem phòng lúc {when}. Bấm "Đăng ký thuê ngay" để giữ lịch, thông tin đã được điền sẵn.</p>}
      {!when && <p>Bấm "Đăng ký thuê ngay" để gửi yêu cầu, thông tin phòng đã được điền sẵn.</p>}
      {offer.ghiChu && <p className="ctp-offer-note">Lời nhắn: {offer.ghiChu}</p>}
      {offer.sdtSale && <p className="ctp-offer-note">Liên hệ: <a href={`tel:${offer.sdtSale}`}>{offer.sdtSale}</a></p>}
    </div>
  </div>;
  return <ChiTietPhongPage roomCode={offer.maPhong} banner={banner} registerQuery={query} />;
}
