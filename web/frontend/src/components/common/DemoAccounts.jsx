import React from 'react';
import './demoAccounts.css';

// Tài khoản mẫu để demo và để giám khảo thử nhanh (mật khẩu chung 123). Bấm để điền sẵn vào form đăng nhập.
// Tắt bằng VITE_SHOW_DEMO_ACCOUNTS=false khi không muốn hiện (ví dụ bản chạy thật).
const DEMO_PASSWORD = '123';
const GROUPS = [
  { title: 'Khách hàng', items: [
    { user: 'demo4', label: 'Khách demo4' },
    { user: 'demo5', label: 'Khách demo5' },
    { user: 'kh0001', label: 'Khách Nguyễn Văn An' },
    { user: 'kh0002', label: 'Khách Trần Thị Bình' },
  ] },
  { title: 'Chi nhánh CN0002', items: [
    { user: 'nv0005', label: 'Sale: Bùi Duy Đăng' },
    { user: 'nv0007', label: 'Quản lý: Đặng Song Toàn' },
    { user: 'nv0008', label: 'Kế toán: Bùi Hà Kim' },
  ] },
  { title: 'Chi nhánh CN0003', items: [
    { user: 'nv0009', label: 'Sale: Huỳnh Khoa Minh' },
    { user: 'nv0011', label: 'Quản lý: Đỗ Long Châu' },
    { user: 'nv0012', label: 'Kế toán: Đinh Lan Ngọc' },
  ] },
  { title: 'Quản trị', items: [{ user: 'nv0013', label: 'Admin: Phạm Tuấn Sơn' }] },
];

export const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false';

export default function DemoAccounts({ onPick }) {
  if (!showDemoAccounts) return null;
  return <details className="dma">
    <summary>Tài khoản dùng thử (bấm để điền sẵn)</summary>
    <div className="dma-body">
      {GROUPS.map((group) => <div key={group.title} className="dma-group">
        <strong>{group.title}</strong>
        {group.items.map((item) => <button type="button" key={item.user} className="dma-item" onClick={() => onPick({ tenDangNhap: item.user, matKhau: DEMO_PASSWORD })}>
          <span>{item.label}</span><small>{item.user}</small>
        </button>)}
      </div>)}
      <p className="dma-note">Mật khẩu chung của tài khoản mẫu: {DEMO_PASSWORD}</p>
    </div>
  </details>;
}
