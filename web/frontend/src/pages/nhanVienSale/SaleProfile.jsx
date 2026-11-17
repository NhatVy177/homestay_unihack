import React from 'react';
import AccountSecurity from '../../components/common/AccountSecurity.jsx';
import { Icon } from '../../components/common/Icon.jsx';
export default function SaleProfile({ user, roleLabel = 'Nhân viên Sale' }) {
  return <section className="ui-card sale-profile sale-panel"><div className="sale-profile-heading"><span className="sale-person-icon sale-person-icon--large"><Icon name="person" /></span><div><h2>{user?.hoTen || roleLabel}</h2><p>{roleLabel} · {user?.tenChiNhanh || user?.maChiNhanh || 'Chưa có chi nhánh'}</p></div></div>
    <dl className="sale-definition">{[['Mã nhân viên', user?.maNguoiDung || user?.id], ['Email', user?.email], ['Số điện thoại', user?.soDienThoai], ['Ngày sinh', user?.ngaySinh ? new Date(user.ngaySinh).toLocaleDateString('vi-VN') : ''], ['Giới tính', user?.gioiTinh]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>
    <AccountSecurity />
  </section>;
}
