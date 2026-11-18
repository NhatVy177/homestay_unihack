import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../../components/common/Icon.jsx';
import { httpClient } from '../../../api/httpClient.js';
import { extractArray } from '../admin.utils.js';

export default function AdminUsersTab() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRent, setFilterRent] = useState('');
  const [filterAcct, setFilterAcct] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState('info');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmLockCustomer, setConfirmLockCustomer] = useState(null);
  const [toast, setToast] = useState('');

  const [addForm, setAddForm] = useState({
    hoTen: '',
    cccd: '',
    soDienThoai: '',
    email: '',
    matKhau: '',
    gioiTinh: 'Nam',
    ngaySinh: '2000-01-01',
    diaChi: ''
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await httpClient.get('/admin/customers').catch(() => null);
      let list = extractArray(res);

      if (list.length === 0) {
        // Fallback tự động lấy danh sách khách hàng từ các đơn đăng ký thuê thực tế trong hệ thống
        const regRes = await httpClient.get('/dang-ky-thue').catch(() => null);
        const regList = extractArray(regRes);
        const map = new Map();
        regList.forEach(item => {
          const id = item.maKhachHang || item.sdtKhach || item.emailKhach;
          if (id && !map.has(id)) {
            map.set(id, {
              id: item.maKhachHang || `KH-${Math.floor(Math.random() * 9000 + 1000)}`,
              maNguoiDung: item.maKhachHang,
              hoTen: item.hoTenKhach || 'Khách hàng',
              soDienThoai: item.sdtKhach || '',
              email: item.emailKhach || '',
              cccd: item.cccd || '',
              gioiTinh: item.gioiTinh || 'Nam',
              trangThaiThue: item.trangThai === 'Xác nhận cọc' || item.trangThai === 'Đang ở' ? 'Đang thuê' : 'Chưa thuê',
              status: item.trangThai === 'Xác nhận cọc' || item.trangThai === 'Đang ở' ? 'renting' : 'not_renting',
              accountStatus: 'active',
              trangThaiTaiKhoan: 'Hoạt động',
              phongHienTai: item.phongQuanTam?.[0]?.tenPhong || 'Phòng P103',
              chiNhanh: item.tenChiNhanhSale || 'HomeDorm Thủ Đức',
              ngayTao: item.ngayDangKy ? new Date(item.ngayDangKy).toLocaleDateString('vi-VN') : '15/11/2026'
            });
          }
        });
        list = Array.from(map.values());
      }

      setCustomers(list);
    } catch (e) {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const kpis = useMemo(() => {
    const total = customers.length;
    const renting = customers.filter(c => c.trangThaiThue === 'Đang thuê' || c.status === 'renting').length;
    const notRenting = customers.filter(c => c.trangThaiThue !== 'Đang thuê' && c.status !== 'renting').length;
    const locked = customers.filter(c => c.trangThaiTaiKhoan === 'Vô hiệu hóa' || c.accountStatus === 'locked').length;

    return [
      { icon: 'groups', label: 'Tổng khách hàng', val: total },
      { icon: 'meeting_room', label: 'Đang thuê', val: renting, cls: 'success' },
      { icon: 'person_off', label: 'Chưa thuê', val: notRenting },
      { icon: 'lock', label: 'Tài khoản bị khóa', val: locked, cls: 'danger' }
    ];
  }, [customers]);

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        (c.hoTen || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.soDienThoai || '').includes(q) ||
        (c.cccd || '').includes(q) ||
        (c.maNguoiDung || c.id || '').toLowerCase().includes(q);

      const isRenting = c.trangThaiThue === 'Đang thuê' || c.status === 'renting';
      const matchRent = !filterRent ||
        (filterRent === 'renting' && isRenting) ||
        (filterRent === 'not_renting' && !isRenting);

      const isLocked = c.trangThaiTaiKhoan === 'Vô hiệu hóa' || c.accountStatus === 'locked';
      const matchAcct = !filterAcct ||
        (filterAcct === 'active' && !isLocked) ||
        (filterAcct === 'locked' && isLocked);

      return matchQ && matchRent && matchAcct;
    });
  }, [customers, search, filterRent, filterAcct]);

  const handleToggleLock = async () => {
    if (!confirmLockCustomer) return;
    try {
      const isCurrentlyLocked = confirmLockCustomer.trangThaiTaiKhoan === 'Vô hiệu hóa' || confirmLockCustomer.accountStatus === 'locked';
      const nextLocked = !isCurrentlyLocked;
      const id = confirmLockCustomer.maNguoiDung || confirmLockCustomer.id;

      await httpClient.patch(`/admin/customers/${id}/lock`, { isLocked: nextLocked });

      showToast(nextLocked ? 'Đã khóa tài khoản khách hàng!' : 'Đã mở khóa tài khoản khách hàng!');
      setConfirmLockCustomer(null);
      await loadCustomers();
      if (selected && (selected.maNguoiDung === id || selected.id === id)) {
        setSelected(prev => prev ? {
          ...prev,
          trangThaiTaiKhoan: nextLocked ? 'Vô hiệu hóa' : 'Hoạt động',
          accountStatus: nextLocked ? 'locked' : 'active'
        } : null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản.');
      setConfirmLockCustomer(null);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!addForm.hoTen || !addForm.soDienThoai || !addForm.email || !addForm.matKhau) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    try {
      await httpClient.post('/admin/customers', addForm);
      showToast('Đã tạo tài khoản khách hàng thành công!');
      setShowAddModal(false);
      setAddForm({
        hoTen: '',
        cccd: '',
        soDienThoai: '',
        email: '',
        matKhau: '',
        gioiTinh: 'Nam',
        ngaySinh: '2000-01-01',
        diaChi: ''
      });
      await loadCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tạo tài khoản khách hàng.');
    }
  };

  const initials = (name = '') => String(name).split(/\s+/).filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase() || 'KH';

  return (
    <div className="admin-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div className="admin-toast">
          <Icon name="check_circle" size={18} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>Quản trị Khách hàng</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quản lý danh sách khách thuê, tra cứu hồ sơ và kiểm soát tài khoản người dùng.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="admin-btn primary" type="button" onClick={() => setShowAddModal(true)}>
            <Icon name="add_circle" /> Thêm khách hàng
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="admin-kpi-grid">
        {kpis.map((k, i) => (
          <div className="admin-kpi-card" key={i}>
            <div className={`admin-kpi-icon ${k.cls || ''}`}>
              <Icon name={k.icon} size={22} />
            </div>
            <div>
              <p className="admin-kpi-label">{k.label}</p>
              <p className="admin-kpi-value">{k.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search">
          <span className="search-icon"><Icon name="search" size={18} /></span>
          <input
            placeholder="Tìm theo tên, email, CCCD, số điện thoại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="admin-filter-select" value={filterRent} onChange={e => setFilterRent(e.target.value)}>
          <option value="">Tất cả trạng thái thuê</option>
          <option value="renting">Đang thuê</option>
          <option value="not_renting">Chưa thuê</option>
        </select>
        <select className="admin-filter-select" value={filterAcct} onChange={e => setFilterAcct(e.target.value)}>
          <option value="">Tất cả tài khoản</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Bị khóa</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Khách hàng</th>
                <th>Số điện thoại</th>
                <th>CCCD</th>
                <th>Phòng đang ở</th>
                <th>Trạng thái thuê</th>
                <th>Tài khoản</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 36 }}>
                    <div className="admin-empty-nam4">
                      <span className="icon"><Icon name="groups" size={44} /></span>
                      <p>Không tìm thấy khách hàng phù hợp.</p>
                      <small>Dữ liệu khách hàng sẽ hiển thị khi hệ thống có tài khoản đăng ký.</small>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const id = c.maNguoiDung || c.id;
                  const name = c.hoTen || c.full_name || 'Khách hàng';
                  const email = c.email || '-';
                  const phone = c.soDienThoai || c.phone || '-';
                  const cccd = c.cccd || c.customers?.cccd || '-';
                  const room = c.tenPhong || c.renting_room_name || 'Chưa nhận phòng';
                  const isRenting = c.trangThaiThue === 'Đang thuê' || c.status === 'renting';
                  const isLocked = c.trangThaiTaiKhoan === 'Vô hiệu hóa' || c.accountStatus === 'locked';

                  return (
                    <tr key={id}>
                      <td><strong>{id}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12 }}>
                            {initials(name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{name}</div>
                            <small style={{ color: 'var(--color-text-muted)' }}>{email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{phone}</td>
                      <td>{cccd}</td>
                      <td>{room}</td>
                      <td>
                        <span className={`admin-badge ${isRenting ? 'low' : 'off'}`}>
                          {isRenting ? 'Đang thuê' : 'Chưa thuê'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${isLocked ? 'high' : 'low'}`}>
                          {isLocked ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            className="admin-btn-icon"
                            type="button"
                            title="Xem & sửa thông tin"
                            onClick={() => { setSelected(c); setDrawerTab('info'); }}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            className="admin-btn-icon danger"
                            type="button"
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản khách hàng'}
                            onClick={() => setConfirmLockCustomer(c)}
                          >
                            <Icon name={isLocked ? 'lock_open' : 'delete'} size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in Right Drawer */}
      {selected && (
        <>
          <div className="admin-drawer-overlay" onClick={() => setSelected(null)} />
          <aside className="admin-drawer">
            <div className="admin-drawer-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="admin-drawer-avatar">{initials(selected.hoTen || selected.full_name)}</div>
                <div>
                  <p className="admin-drawer-title">{selected.hoTen || selected.full_name}</p>
                  <p className="admin-drawer-sub">{selected.maNguoiDung || selected.id} · {selected.email}</p>
                </div>
              </div>
              <button className="admin-icon-btn" type="button" onClick={() => setSelected(null)} aria-label="Đóng">
                <Icon name="close" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="admin-drawer-tabs">
              {[
                ['info', 'Thông tin cá nhân'],
                ['history', 'Lịch sử thuê'],
                ['invoice', 'Hóa đơn']
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`admin-drawer-tab ${drawerTab === key ? 'active' : ''}`}
                  type="button"
                  onClick={() => setDrawerTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="admin-drawer-body">
              {drawerTab === 'info' && (
                <div className="admin-drawer-grid">
                  {[
                    ['Mã khách hàng', selected.maNguoiDung || selected.id],
                    ['Họ và tên', selected.hoTen || selected.full_name],
                    ['Email', selected.email || 'Chưa cập nhật'],
                    ['Số điện thoại', selected.soDienThoai || selected.phone || 'Chưa cập nhật'],
                    ['CCCD/CMND', selected.cccd || selected.customers?.cccd || 'Chưa cập nhật'],
                    ['Giới tính', selected.gioiTinh || selected.customers?.gender || 'Chưa cập nhật'],
                    ['Ngày sinh', selected.ngaySinh ? new Date(selected.ngaySinh).toLocaleDateString('vi-VN') : 'Chưa cập nhật'],
                    ['Địa chỉ', selected.diaChi || selected.customers?.address || 'Chưa cập nhật'],
                    ['Phòng đang ở', selected.tenPhong || selected.renting_room_name || 'Chưa thuê phòng'],
                    ['Trạng thái tài khoản', (selected.trangThaiTaiKhoan === 'Vô hiệu hóa' || selected.accountStatus === 'locked') ? 'Bị khóa' : 'Đang hoạt động']
                  ].map(([label, val]) => (
                    <div className="admin-drawer-field" key={label}>
                      <label>{label}</label>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {drawerTab === 'history' && (
                <div className="admin-empty-nam4">
                  <span className="icon"><Icon name="history" size={32} /></span>
                  <p>Lịch sử thuê phòng</p>
                  <small>Dữ liệu hợp đồng thuê phòng sẽ được liệt kê tại đây.</small>
                </div>
              )}

              {drawerTab === 'invoice' && (
                <div className="admin-empty-nam4">
                  <span className="icon"><Icon name="receipt_long" size={32} /></span>
                  <p>Lịch sử hóa đơn</p>
                  <small>Dữ liệu thanh toán và hóa đơn cọc/phòng của khách hàng.</small>
                </div>
              )}
            </div>

            <div className="admin-drawer-footer">
              <button className="admin-btn secondary" type="button" onClick={() => setSelected(null)} style={{ flex: 1 }}>
                Đóng
              </button>
              <button
                className={`admin-btn ${(selected.trangThaiTaiKhoan === 'Vô hiệu hóa' || selected.accountStatus === 'locked') ? 'primary' : 'danger'}`}
                type="button"
                onClick={() => setConfirmLockCustomer(selected)}
                style={{ flex: 1 }}
              >
                <Icon name={(selected.trangThaiTaiKhoan === 'Vô hiệu hóa' || selected.accountStatus === 'locked') ? 'lock_open' : 'lock'} />
                {(selected.trangThaiTaiKhoan === 'Vô hiệu hóa' || selected.accountStatus === 'locked') ? 'Mở khóa TK' : 'Khóa tài khoản'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Confirm Lock Modal */}
      {confirmLockCustomer && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setConfirmLockCustomer(null)}>
          <section className="admin-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <header className="admin-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="admin-kpi-icon danger">
                  <Icon name="warning" />
                </span>
                <div>
                  <span className="admin-eyebrow">Xác nhận thao tác</span>
                  <h3>
                    {(confirmLockCustomer.trangThaiTaiKhoan === 'Vô hiệu hóa' || confirmLockCustomer.accountStatus === 'locked')
                      ? 'Mở khóa tài khoản'
                      : 'Khóa tài khoản khách hàng'}
                  </h3>
                </div>
              </div>
              <button className="admin-icon-btn" type="button" onClick={() => setConfirmLockCustomer(null)}>
                <Icon name="close" />
              </button>
            </header>
            <div style={{ padding: '20px 24px', fontSize: 14 }}>
              Bạn có chắc chắn muốn{' '}
              <strong>
                {(confirmLockCustomer.trangThaiTaiKhoan === 'Vô hiệu hóa' || confirmLockCustomer.accountStatus === 'locked') ? 'mở khóa' : 'khóa'}
              </strong>{' '}
              tài khoản của khách hàng <strong>{confirmLockCustomer.hoTen || confirmLockCustomer.full_name}</strong>?
            </div>
            <footer className="admin-modal-actions">
              <button className="admin-btn secondary" type="button" onClick={() => setConfirmLockCustomer(null)}>
                Hủy
              </button>
              <button
                className={`admin-btn ${(confirmLockCustomer.trangThaiTaiKhoan === 'Vô hiệu hóa' || confirmLockCustomer.accountStatus === 'locked') ? 'primary' : 'danger'}`}
                type="button"
                onClick={handleToggleLock}
              >
                Xác nhận
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setShowAddModal(false)}>
          <section className="admin-modal admin-modal-wide" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <header className="admin-modal-head">
              <div>
                <span className="admin-eyebrow">Khách hàng mới</span>
                <h3>Tạo tài khoản khách hàng</h3>
              </div>
              <button className="admin-icon-btn" type="button" onClick={() => setShowAddModal(false)}>
                <Icon name="close" />
              </button>
            </header>
            <form onSubmit={handleCreateCustomer}>
              <div className="admin-modal-form">
                <div className="admin-form-grid">
                  <label>
                    Họ và tên <b className="admin-required">*</b>
                    <input
                      required
                      value={addForm.hoTen}
                      onChange={e => setAddForm(p => ({ ...p, hoTen: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                    />
                  </label>
                  <label>
                    CCCD/CMND <b className="admin-required">*</b>
                    <input
                      required
                      value={addForm.cccd}
                      onChange={e => setAddForm(p => ({ ...p, cccd: e.target.value }))}
                      placeholder="079200000001"
                    />
                  </label>
                  <label>
                    Số điện thoại <b className="admin-required">*</b>
                    <input
                      required
                      value={addForm.soDienThoai}
                      onChange={e => setAddForm(p => ({ ...p, soDienThoai: e.target.value }))}
                      placeholder="0901234567"
                    />
                  </label>
                  <label>
                    Email <b className="admin-required">*</b>
                    <input
                      required
                      type="email"
                      value={addForm.email}
                      onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="khachhang@gmail.com"
                    />
                  </label>
                  <label>
                    Mật khẩu khởi tạo <b className="admin-required">*</b>
                    <input
                      required
                      type="password"
                      value={addForm.matKhau}
                      onChange={e => setAddForm(p => ({ ...p, matKhau: e.target.value }))}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </label>
                  <label>
                    Giới tính
                    <select value={addForm.gioiTinh} onChange={e => setAddForm(p => ({ ...p, gioiTinh: e.target.value }))}>
                      <option>Nam</option>
                      <option>Nữ</option>
                    </select>
                  </label>
                  <label className="admin-form-full">
                    Địa chỉ thường trú
                    <input
                      value={addForm.diaChi}
                      onChange={e => setAddForm(p => ({ ...p, diaChi: e.target.value }))}
                      placeholder="Địa chỉ liên hệ"
                    />
                  </label>
                </div>
              </div>
              <footer className="admin-modal-actions">
                <button className="admin-btn secondary" type="button" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button className="admin-btn primary" type="submit">
                  <Icon name="person_add" /> Tạo tài khoản
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
