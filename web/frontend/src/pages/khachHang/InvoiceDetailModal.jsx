import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import { khachMoiApi } from '../khachMoi/khachMoi.api.js';

// Bấm "xem" một khoản trong "Hóa đơn của tôi": hộp thoại cho biết thanh toán cho việc gì, số tiền,
// hạn, trạng thái, cách trả và minh chứng (nếu có), thay vì nhảy sang trang Hợp đồng.
const FILE_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VNĐ`;
const dateLabel = (value) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—');
const periodLabel = (ky) => (ky ? `${ky.slice(5, 7)}/${ky.slice(0, 4)}` : '');
const isFile = (path) => /^(\/uploads\/|https?:\/\/)/.test(String(path || ''));
const fileUrl = (path) => (String(path).startsWith('http') ? path : `${FILE_BASE}${path}`);

function describe(row) {
  const src = row.source || {};
  if (row.kind === 'deposit') return { title: 'Tiền đặt cọc giữ chỗ', ref: `Phiếu cọc ${row.id}`, contract: null, room: src.tenPhong || src.maPhong };
  if (row.kind === 'firstCharge') return { title: 'Khoản thu kỳ đầu khi nhận phòng', ref: `Hợp đồng ${src.refId}`, contract: src.refId };
  if (row.loai === 'Nhận phòng') return { title: 'Khoản thu kỳ đầu khi nhận phòng', ref: `Hợp đồng ${src.maHopDong}`, contract: src.maHopDong };
  return { title: `Tiền phòng và dịch vụ tháng ${periodLabel(row.period)}`, ref: `Hợp đồng ${src.maHopDong}`, contract: src.maHopDong };
}

export default function InvoiceDetailModal({ row, statusLabel, onClose, onOpenContract, onPay }) {
  const src = row.source || {};
  const info = describe(row);
  const method = row.kind === 'deposit' ? src.phuongThucThanhToan : src.phuongThuc;
  const [proof, setProof] = useState(row.kind === 'deposit' && isFile(src.minhChungThanhToan)
    ? { duongDan: src.minhChungThanhToan, tenTep: String(src.minhChungThanhToan).split('/').pop() } : null);
  const [loadingProof, setLoadingProof] = useState(row.kind !== 'deposit');

  useEffect(() => {
    if (row.kind === 'deposit') return undefined;
    let alive = true;
    const load = row.kind === 'invoice'
      ? khachMoiApi.getChungTuHoaDon(row.id).then(({ data }) => data || (row.loai === 'Nhận phòng' ? khachMoiApi.getChungTuKyDau(src.maHopDong).then((r) => r.data) : null))
      : khachMoiApi.getChungTuKyDau(src.refId).then(({ data }) => data);
    load.then((data) => { if (alive) setProof(data && isFile(data.duongDan) ? data : null); })
      .catch(() => { if (alive) setProof(null); })
      .finally(() => { if (alive) setLoadingProof(false); });
    return () => { alive = false; };
  }, [row, src.maHopDong, src.refId]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const proofText = loadingProof ? 'Đang tải…'
    : proof ? null
      : method === 'Ví điện tử' ? 'Trả qua ví MoMo, hệ thống tự ghi nhận nên không cần minh chứng.'
        : method === 'Tiền mặt' ? 'Trả tiền mặt tại quầy, kế toán đã ghi nhận.'
          : row.group === 'paid' ? 'Không có minh chứng đính kèm.' : 'Chưa có minh chứng.';

  return <div className="ktp-modal-overlay" onClick={onClose}>
    <div className="ktp-modal cinv-modal" role="dialog" aria-modal="true" aria-labelledby="cinv-modal-title" onClick={(event) => event.stopPropagation()}>
      <div className="ktp-modal-header">
        <div><h3 id="cinv-modal-title">Chi tiết thanh toán</h3><p className="ktp-modal-header-sub">{row.id} · {row.loai}</p></div>
        <button type="button" className="ktp-modal-close" aria-label="Đóng" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="ktp-modal-body">
        <div className="cinv-modal-amount">
          <span>{info.title}</span>
          <strong>{money(row.amount)}</strong>
          {src.giamDiemThuong > 0 && <small>Đã trừ ưu đãi điểm thưởng −{money(src.giamDiemThuong)}</small>}
        </div>
        <dl className="cinv-modal-info">
          <div><dt>Thanh toán cho</dt><dd>{info.ref}</dd></div>
          {info.room && <div><dt>Phòng</dt><dd>{info.room}</dd></div>}
          {row.period && <div><dt>Kỳ</dt><dd>Tháng {periodLabel(row.period)}</dd></div>}
          <div><dt>Hạn thanh toán</dt><dd>{dateLabel(row.due)}</dd></div>
          <div><dt>Trạng thái</dt><dd><span className={`cinv-status cinv-status--${row.group}`}>{statusLabel}</span></dd></div>
          {src.ngayThanhToan && <div><dt>Ngày thanh toán</dt><dd>{dateLabel(src.ngayThanhToan)}</dd></div>}
          {method && <div><dt>Cách trả</dt><dd>{method === 'Ví điện tử' ? 'Ví MoMo' : method}</dd></div>}
          <div className="cinv-modal-proof"><dt>Minh chứng</dt><dd>{proof
            ? <a href={fileUrl(proof.duongDan)} target="_blank" rel="noreferrer"><Icon name="description" /> {proof.tenTep || 'Xem minh chứng'}</a>
            : proofText}</dd></div>
        </dl>
      </div>
      <div className="ktp-modal-footer">
        {info.contract && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { onClose(); onOpenContract(info.contract); }}>Xem hợp đồng</button>}
        {row.canPay && <button type="button" className="ui-btn ui-btn--primary" onClick={() => { onClose(); onPay(row); }}><Icon name="payments" /> Thanh toán</button>}
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose}>Đóng</button>
      </div>
    </div>
  </div>;
}
