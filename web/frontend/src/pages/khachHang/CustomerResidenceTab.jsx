import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { checkResidentsGender } from '../../utils/genderRules.js';
import './customerResidence.css';

// D-026 mục 4: khách tự khai người ở sau khi cọc xong. Hệ thống tự duyệt khi đạt hết điều kiện,
// có bất thường thì chờ quản lý. CCCD gốc được đối chiếu khi ký hợp đồng tại quầy.
const STATUS = {
  'Chưa cập nhật': ['Chưa khai', 'todo'],
  'Chờ duyệt cư trú': ['Chờ quản lý duyệt', 'pending'],
  'Đã duyệt cư trú': ['Đã duyệt cư trú', 'done'],
  'Từ chối cư trú': ['Cần khai lại', 'danger'],
};
const EMPTY_MEMBER = { hoTen: '', ngaySinh: '', gioiTinh: '', cccd: '', sdt: '', email: '', quocTich: 'Việt Nam' };
const dayOf = (value) => (value ? String(value).slice(0, 10) : '');
const cleanReason = (text) => String(text || '').replace(/[;\s.]+$/, '');
const dateLabel = (value) => (dayOf(value) ? dayOf(value).split('-').reverse().join('/') : '—');

function initialMembers(phieu, nguoiDaiDien) {
  if (phieu.thanhVien?.length) return phieu.thanhVien.map((m) => ({ ...EMPTY_MEMBER, ...m, ngaySinh: dayOf(m.ngaySinh), email: m.email || '' }));
  const count = Math.max(1, Number(phieu.soNguoiDuKienO) || 0);
  const rep = nguoiDaiDien ? {
    ...EMPTY_MEMBER, hoTen: nguoiDaiDien.hoTen || '', ngaySinh: dayOf(nguoiDaiDien.ngaySinh), gioiTinh: ['Nam', 'Nữ'].includes(nguoiDaiDien.gioiTinh) ? nguoiDaiDien.gioiTinh : '',
    cccd: nguoiDaiDien.cccd || '', sdt: nguoiDaiDien.sdt || '', email: nguoiDaiDien.email || '', quocTich: nguoiDaiDien.quocTich || 'Việt Nam',
  } : { ...EMPTY_MEMBER };
  // Thành viên đã nhập ở form đăng ký nhóm thì điền sẵn, khách chỉ bổ sung ngày sinh/quốc tịch (J-C119).
  const registered = (phieu.thanhVienDangKy || []).filter((m) => !m.daiDien)
    .map((m) => ({ ...EMPTY_MEMBER, hoTen: m.hoTen, gioiTinh: m.gioiTinh, cccd: m.cccd, sdt: m.soDienThoai, ngaySinh: m.ngaySinh || '' }));
  const rest = [...registered, ...Array.from({ length: Math.max(0, count - 1 - registered.length) }, () => ({ ...EMPTY_MEMBER }))];
  return [rep, ...rest];
}

function ResidenceForm({ phieu, nguoiDaiDien, onSubmit }) {
  const [members, setMembers] = useState(() => initialMembers(phieu, nguoiDaiDien));
  const [consent, setConsent] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const maxMembers = Math.max(Number(phieu.soDongCoc) || 1, Number(phieu.soNguoiDuKienO) || 1);
  const update = (index, field, value) => setMembers((list) => list.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  const genderIssue = checkResidentsGender(members, phieu);
  const missing = members.some((m) => !m.hoTen.trim() || !m.ngaySinh || !m.gioiTinh || !m.cccd.trim() || !m.sdt.trim() || !m.quocTich.trim());
  // Nút gửi bị mờ khi còn thiếu: liệt kê cụ thể người nào thiếu mục nào để khách biết điền gì.
  const missingText = members.map((m, i) => {
    const gaps = [!m.hoTen.trim() && 'họ tên', !m.ngaySinh && 'ngày sinh', !m.gioiTinh && 'giới tính', !m.cccd.trim() && 'CCCD', !m.sdt.trim() && 'số điện thoại', !m.quocTich.trim() && 'quốc tịch'].filter(Boolean);
    return gaps.length ? `Người ở ${i + 1}: ${gaps.join(', ')}` : '';
  }).filter(Boolean).join('; ');
  async function submit(event) {
    event.preventDefault();
    if (missing || genderIssue || !consent || saving) return;
    setSaving(true); setError('');
    try {
      await onSubmit({ maPhieuDatCoc: phieu.maPhieuDatCoc, dongYCungCapThongTin: true,
        danhSachThanhVien: members.map((m) => ({ ...m, hoTen: m.hoTen.trim(), cccd: m.cccd.trim(), sdt: m.sdt.trim(), email: m.email.trim() })) });
    } catch (e) { setError(e.response?.data?.message || 'Chưa gửi được thông tin cư trú. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  }
  return <form className="cres-form" onSubmit={submit}>
    {members.map((m, index) => <fieldset key={index} className="cres-member">
      <legend>{index === 0 ? 'Người ở 1 (người đại diện)' : `Người ở ${index + 1}`}
        {index > 0 && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setMembers((list) => list.filter((_, i) => i !== index))}>Xóa</button>}</legend>
      <div className="cres-grid">
        <label className="ui-form-field">Họ và tên<input className="ui-input" value={m.hoTen} onChange={(e) => update(index, 'hoTen', e.target.value)} required /></label>
        <label className="ui-form-field">Ngày sinh<input className="ui-input" type="date" value={m.ngaySinh} onChange={(e) => update(index, 'ngaySinh', e.target.value)} required /></label>
        <label className="ui-form-field">Giới tính<select className="ui-input" value={m.gioiTinh} onChange={(e) => update(index, 'gioiTinh', e.target.value)} required><option value="">Chọn</option><option>Nam</option><option>Nữ</option></select></label>
        <label className="ui-form-field">Số CCCD<input className="ui-input" inputMode="numeric" value={m.cccd} onChange={(e) => update(index, 'cccd', e.target.value)} required /></label>
        <label className="ui-form-field">Số điện thoại<input className="ui-input" inputMode="tel" value={m.sdt} onChange={(e) => update(index, 'sdt', e.target.value)} required /></label>
        <label className="ui-form-field">Quốc tịch<input className="ui-input" value={m.quocTich} onChange={(e) => update(index, 'quocTich', e.target.value)} required /></label>
        <label className="ui-form-field cres-wide">Email (không bắt buộc, dùng để mời tạo tài khoản)<input className="ui-input" type="email" value={m.email} onChange={(e) => update(index, 'email', e.target.value)} /></label>
      </div>
    </fieldset>)}
    {members.length < maxMembers && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setMembers((list) => [...list, { ...EMPTY_MEMBER }])}><Icon name="person" /> Thêm người ở</button>}
    <label className="cres-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
      <span>Tôi xác nhận các thành viên đồng ý cung cấp thông tin để làm thủ tục thuê phòng và đăng ký tạm trú.</span></label>
    <p className="cres-note"><Icon name="badge" /> Nhân viên sẽ đối chiếu CCCD gốc của từng người khi ký hợp đồng tại quầy.</p>
    {missing && <p className="customer-viewing-error" role="status">Còn thiếu thông tin: {missingText}.</p>}
    {!missing && !genderIssue && !consent && <p className="cres-note">Tick ô xác nhận phía trên để gửi.</p>}
    {genderIssue && <p className="customer-viewing-error" role="alert">{genderIssue}</p>}
    {error && <p className="customer-viewing-error" role="alert">{error}</p>}
    <div className="cres-actions"><button type="submit" className="ui-btn ui-btn--primary" disabled={missing || Boolean(genderIssue) || !consent || saving}>{saving ? 'Đang gửi...' : 'Gửi thông tin cư trú'}</button></div>
  </form>;
}

export default function CustomerResidenceTab({ data, loading, error, onSubmit }) {
  const phieu = data?.phieu || [];
  return <section className="cres-page" aria-label="Thông tin cư trú">
    <header className="ui-card cres-head"><h2>Thông tin cư trú</h2>
      <p>Khai thông tin những người sẽ ở cho từng phiếu cọc đã thanh toán. Hệ thống kiểm tra ngay; hồ sơ cần xem thêm sẽ chuyển quản lý chi nhánh duyệt.</p></header>
    {error && <p className="customer-viewing-error" role="alert">{error}</p>}
    {loading && <p role="status">Đang tải thông tin cư trú...</p>}
    {!loading && !phieu.length && <div className="ui-card"><EmptyState message="Chưa có phiếu cọc đã thanh toán. Khai người ở sau khi kế toán xác nhận tiền cọc." /></div>}
    {phieu.map((item) => {
      const [label, tone] = STATUS[item.trangThaiHoSo] || [item.trangThaiHoSo, 'todo'];
      return <article key={item.maPhieuDatCoc} className="ui-card cres-card" aria-label={`Cư trú ${item.maPhieuDatCoc}`}>
        <div className="cres-card-top">
          <div><small>PHIẾU CỌC {item.maPhieuDatCoc}</small><h3>{item.viTriThue || 'Phòng đã cọc'}</h3>
            <p>{item.hinhThucThue || '—'}{item.gioiTinhChoPhep && item.gioiTinhChoPhep !== 'Không phân biệt' ? ` · Phòng ${item.gioiTinhChoPhep}` : ''}</p></div>
          <span className={`cres-chip cres-chip--${tone}`}>{label}</span>
        </div>
        {item.trangThaiHoSo === 'Chờ duyệt cư trú' && <p className="cres-reason">Cần quản lý kiểm tra: {cleanReason(item.ghiChuQuanLy) || 'đang xem xét'}.</p>}
        {item.trangThaiHoSo === 'Từ chối cư trú' && <p className="cres-reason cres-reason--danger">Lý do: {cleanReason(item.ghiChuQuanLy) || 'Thông tin chưa hợp lệ'}. Vui lòng sửa và gửi lại.</p>}
        {item.trangThaiHoSo === 'Đã duyệt cư trú' && <p className="cres-reason cres-reason--ok">Hồ sơ đã duyệt. Nhân viên Sale sẽ liên hệ lập hợp đồng; nhớ mang CCCD gốc của mọi người khi ký.</p>}
        {!item.coTheKhai && item.thanhVien.length > 0 && <ul className="cres-list">{item.thanhVien.map((m, i) => <li key={`${m.cccd}-${i}`}>
          <strong>{m.hoTen}</strong><span>{m.gioiTinh} · {dateLabel(m.ngaySinh)} · CCCD {m.cccd}</span>
          {m.trangThai && <em className={m.trangThai === 'Bị từ chối' ? 'is-danger' : ''}>{m.trangThai}{m.lyDoTuChoi ? `: ${m.lyDoTuChoi}` : ''}</em>}
        </li>)}</ul>}
        {item.coTheKhai && <ResidenceForm phieu={item} nguoiDaiDien={data?.nguoiDaiDien} onSubmit={onSubmit} />}
      </article>;
    })}
  </section>;
}
