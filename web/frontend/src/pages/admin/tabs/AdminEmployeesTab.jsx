import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { adminApi } from '../admin.api.js';
import '../admin-nam4.css';

const ROLES = {
  sale: { label: 'Nhân viên Sale', cls: 'bg-blue-50 text-blue-700' },
  manager: { label: 'Quản lý CN', cls: 'bg-purple-50 text-purple-700' },
  accountant: { label: 'Kế toán', cls: 'bg-amber-50 text-amber-700' },
  admin: { label: 'Quản trị viên', cls: 'bg-emerald-50 text-emerald-700' }
};

const normalizeRole = (r) => {
  if (!r) return 'sale';
  const lower = String(r).toLowerCase();
  if (lower.includes('admin') || lower.includes('quantri') || lower.includes('quản trị')) return 'admin';
  if (lower.includes('manager') || lower.includes('quanly') || lower.includes('quản lý')) return 'manager';
  if (lower.includes('ketoan') || lower.includes('kế toán') || lower.includes('accountant')) return 'accountant';
  return 'sale';
};

export default function AdminEmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [newEmp, setNewEmp] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'sale',
    branch: ''
  });
  const [addEmpPassword, setAddEmpPassword] = useState('');
  const [showAddEmpPassword, setShowAddEmpPassword] = useState(false);
  const [confirmLockEmployee, setConfirmLockEmployee] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isErrorToast, setIsErrorToast] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const notify = (msg, isErr = false) => {
    setIsErrorToast(isErr);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [empRes, branchRes] = await Promise.allSettled([
        adminApi.getEmployees(),
        adminApi.getBranches()
      ]);

      const rawBranches = branchRes.status === 'fulfilled' ? (branchRes.value?.data || []) : [];
      setBranches(rawBranches);

      const rawEmployees = empRes.status === 'fulfilled' ? (empRes.value?.data || []) : [];
      const mapped = rawEmployees.map((e) => {
        const id = String(e.id || e.maNhanVien || '');
        const role = normalizeRole(e.role || e.chucVu);
        const branchObj = rawBranches.find((b) => b.maChiNhanh === (e.branch_id || e.maChiNhanh));
        const branchName = e.branch || e.tenChiNhanh || branchObj?.tenChiNhanh || branchObj?.name || 'Tất cả chi nhánh';
        const isLocked = e.status === 'locked' || e.trangThaiTaiKhoan === 'Vô hiệu hóa' || e.trangThaiTaiKhoan === 'Khoa' || e.isLocked;

        return {
          id,
          full_name: e.full_name || e.hoTen || 'Chưa đặt tên',
          email: e.email || '',
          phone: e.phone || e.soDienThoai || '',
          role,
          branch: branchName,
          branch_id: e.branch_id || e.maChiNhanh || '',
          status: isLocked ? 'locked' : 'active',
          joinDate: e.joinDate || (e.ngayTao ? new Date(e.ngayTao).toLocaleDateString('vi-VN') : '01/01/2025')
        };
      });

      setEmployees(mapped);
      if (rawBranches.length > 0 && !newEmp.branch) {
        setNewEmp((prev) => ({ ...prev, branch: rawBranches[0].maChiNhanh || rawBranches[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải danh sách nhân viên');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selected) {
      setEditRole('');
      setEditBranch('');
      return;
    }
    setEditRole(selected.role);
    setEditBranch(selected.branch_id || '');
  }, [selected]);

  const kpis = useMemo(() => {
    const total = employees.length;
    const byRole = (r) => employees.filter((e) => e.role === r).length;
    return [
      { icon: 'groups', label: 'Tổng nhân viên', val: total, cls: '' },
      { icon: 'support_agent', label: 'Nhân viên Sale', val: byRole('sale'), cls: 'primary' },
      { icon: 'manage_accounts', label: 'Quản lý CN', val: byRole('manager'), cls: 'success' },
      { icon: 'calculate', label: 'Kế toán', val: byRole('accountant'), cls: 'warning' }
    ];
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchQ = !q || e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
      const matchRole = !filterRole || e.role === filterRole;
      const matchBranch = !filterBranch || e.branch_id === filterBranch || e.branch === filterBranch;
      return matchQ && matchRole && matchBranch;
    });
  }, [employees, search, filterRole, filterBranch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, filterBranch]);

  const handleAddEmployee = async () => {
    if (!newEmp.full_name.trim() || !newEmp.email.trim()) {
      notify('Họ tên và email là bắt buộc', true);
      return;
    }
    try {
      await adminApi.createEmployee({
        hoTen: newEmp.full_name.trim(),
        email: newEmp.email.trim(),
        soDienThoai: newEmp.phone.trim(),
        chucVu: newEmp.role === 'manager' ? 'QuanLyChiNhanh' : newEmp.role === 'accountant' ? 'KeToan' : newEmp.role === 'admin' ? 'QuanTriVien' : 'NhanVienSale',
        maChiNhanh: newEmp.branch,
        matKhau: addEmpPassword || '123456'
      });
      notify('Đã thêm nhân viên mới thành công!');
      setShowAddModal(false);
      setNewEmp({ full_name: '', email: '', phone: '', role: 'sale', branch: branches[0]?.maChiNhanh || '' });
      setAddEmpPassword('');
      loadData();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi thêm nhân viên', true);
    }
  };

  const handleSaveChanges = async () => {
    if (!selected) return;
    try {
      const chucVuMap = {
        sale: 'NhanVienSale',
        manager: 'QuanLyChiNhanh',
        accountant: 'KeToan',
        admin: 'QuanTriVien'
      };
      await adminApi.assignRole(selected.id, {
        chucVu: chucVuMap[editRole] || editRole,
        maChiNhanh: editBranch
      });
      notify('Đã cập nhật thông tin nhân viên!');
      setSelected(null);
      loadData();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi cập nhật thông tin', true);
    }
  };

  const handleConfirmLock = async () => {
    if (!confirmLockEmployee) return;
    const isCurrentlyActive = confirmLockEmployee.status === 'active';
    try {
      await adminApi.lockUnlockEmployee(confirmLockEmployee.id, isCurrentlyActive);
      notify(isCurrentlyActive ? 'Đã khóa tài khoản nhân viên!' : 'Đã mở khóa tài khoản nhân viên!');
      setConfirmLockEmployee(null);
      if (selected?.id === confirmLockEmployee.id) {
        setSelected(null);
      }
      loadData();
    } catch (err) {
      console.error(err);
      notify('Không thể thay đổi trạng thái tài khoản', true);
    }
  };

  return (
    <div className="admin-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast */}
      {successMsg && (
        <div className={`admin-toast ${isErrorToast ? 'danger' : ''}`} style={isErrorToast ? { background: '#dc3545' } : {}}>
          <Icon name={isErrorToast ? 'error' : 'check_circle'} size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
            Quản trị nhân viên
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quản lý tài khoản nhân viên theo phân quyền: Sale, Kế toán, Quản lý, Quản trị viên.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="admin-btn-sm primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
        >
          <Icon name="person_add" size={18} />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.2)', borderRadius: '10px', color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="error" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="admin-kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="admin-kpi-card">
            <div className={`admin-kpi-icon ${kpi.cls}`}>
              <Icon name={kpi.icon} size={22} />
            </div>
            <div>
              <p className="admin-kpi-label">{kpi.label}</p>
              <p className="admin-kpi-value">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search">
          <span className="search-icon"><Icon name="search" size={18} /></span>
          <input
            type="text"
            placeholder="Tìm theo tên, email, mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Tất cả vai trò</option>
          <option value="sale">Nhân viên Sale</option>
          <option value="manager">Quản lý CN</option>
          <option value="accountant">Kế toán</option>
          <option value="admin">Quản trị viên</option>
        </select>
        <select
          className="admin-filter-select"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
        >
          <option value="">Tất cả chi nhánh</option>
          {branches.map((b) => (
            <option key={b.maChiNhanh || b.id} value={b.maChiNhanh || b.id}>
              {b.tenChiNhanh || b.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => { setSearch(''); setFilterRole(''); setFilterBranch(''); }}
          className="admin-btn-refresh"
          title="Làm mới bộ lọc"
        >
          <Icon name="refresh" size={18} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Nhân viên</th>
              <th>Liên hệ</th>
              <th>Vai trò</th>
              <th>Chi nhánh</th>
              <th>Ngày vào</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} style={{ padding: '16px' }}>
                    <div className="admin-skeleton" style={{ height: '24px', width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty-nam4">
                    <span className="icon"><Icon name="manage_search" size={44} /></span>
                    <p>Không tìm thấy nhân viên nào</p>
                    <small>Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</small>
                  </div>
                </td>
              </tr>
            ) : (
              displayed.map((emp) => {
                const roleInfo = ROLES[emp.role] || ROLES.sale;
                return (
                  <tr
                    key={emp.id}
                    className="admin-tr-hover"
                    onClick={() => setSelected(emp)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      {emp.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="admin-avatar-init">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--color-text)' }}>
                            {emp.full_name}
                          </p>
                          <small style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            Nhân viên
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {emp.phone || '—'}
                      </p>
                      <small style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {emp.email}
                      </small>
                    </td>
                    <td>
                      <span className={`admin-badge-role ${roleInfo.cls}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                      {emp.branch}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {emp.joinDate}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: emp.status === 'active' ? 'var(--color-success)' : '#dc3545'
                      }}>
                        <span className={`admin-status-dot ${emp.status === 'active' ? 'active' : 'locked'}`} />
                        {emp.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          className="admin-btn-icon"
                          onClick={(e) => { e.stopPropagation(); setSelected(emp); }}
                          title="Sửa nhân viên"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          className="admin-btn-icon danger"
                          onClick={(e) => { e.stopPropagation(); setConfirmLockEmployee(emp); }}
                          title={emp.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          <Icon name={emp.status === 'active' ? 'block' : 'lock_open'} size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="admin-pagination">
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Hiển thị {filtered.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} trong số {filtered.length} nhân viên
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="admin-btn-sm secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Trước
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
              Trang {currentPage}/{totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="admin-btn-sm secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Right Drawer (Chi tiết nhân viên) */}
      {selected && (
        <div className="admin-drawer-overlay" onClick={() => setSelected(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-head">
              <h2 className="admin-drawer-title">Chi tiết nhân viên</h2>
              <button className="admin-btn-icon" onClick={() => setSelected(null)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-drawer-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                <div className="admin-drawer-avatar">
                  {selected.full_name.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  {selected.full_name}
                </h3>
                <span className={`admin-badge-role ${(ROLES[selected.role] || ROLES.sale).cls}`}>
                  {(ROLES[selected.role] || ROLES.sale).label}
                </span>
              </div>

              <div className="admin-drawer-grid">
                <div className="admin-drawer-field">
                  <label>Mã nhân viên</label>
                  <span>{selected.id}</span>
                </div>
                <div className="admin-drawer-field">
                  <label>Trạng thái</label>
                  <span style={{ color: selected.status === 'active' ? 'var(--color-success)' : '#dc3545' }}>
                    {selected.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </div>
                <div className="admin-drawer-field">
                  <label>Email</label>
                  <span>{selected.email}</span>
                </div>
                <div className="admin-drawer-field">
                  <label>Số điện thoại</label>
                  <span>{selected.phone || 'Chưa cập nhật'}</span>
                </div>
                <div className="admin-drawer-field" style={{ gridColumn: 'span 2' }}>
                  <label>Ngày vào làm</label>
                  <span>{selected.joinDate}</span>
                </div>
              </div>

              <div className="admin-form-group" style={{ background: 'var(--color-bg)', padding: '14px', borderRadius: '10px' }}>
                <label className="admin-form-label">Đổi vai trò</label>
                <select
                  className="admin-form-input"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="sale">Nhân viên Sale</option>
                  <option value="manager">Quản lý CN</option>
                  <option value="accountant">Kế toán</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>

              <div className="admin-form-group" style={{ background: 'var(--color-bg)', padding: '14px', borderRadius: '10px' }}>
                <label className="admin-form-label">Đổi chi nhánh phụ trách</label>
                <select
                  className="admin-form-input"
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                >
                  <option value="">Tất cả / Không cố định</option>
                  {branches.map((b) => (
                    <option key={b.maChiNhanh || b.id} value={b.maChiNhanh || b.id}>
                      {b.tenChiNhanh || b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-drawer-footer">
              <button
                onClick={handleSaveChanges}
                className="admin-btn-sm primary"
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Lưu thay đổi
              </button>
              <button
                onClick={() => setConfirmLockEmployee(selected)}
                className={`admin-btn-sm ${selected.status === 'active' ? 'danger' : 'success'}`}
                style={{ padding: '10px 14px' }}
              >
                {selected.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2 className="admin-modal-title">Thêm nhân viên mới</h2>
              <button className="admin-modal-close" onClick={() => setShowAddModal(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Họ và tên</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Nhập họ và tên..."
                value={newEmp.full_name}
                onChange={(e) => setNewEmp({ ...newEmp, full_name: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Email</label>
              <input
                type="email"
                className="admin-form-input"
                placeholder="email@homestay.vn"
                value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Mật khẩu ban đầu</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAddEmpPassword ? 'text' : 'password'}
                  className="admin-form-input"
                  placeholder="Nhập mật khẩu (mặc định: 123456)..."
                  value={addEmpPassword}
                  onChange={(e) => setAddEmpPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAddEmpPassword(!showAddEmpPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name={showAddEmpPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Vai trò</label>
                <select
                  className="admin-form-input"
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                >
                  <option value="sale">Nhân viên Sale</option>
                  <option value="manager">Quản lý CN</option>
                  <option value="accountant">Kế toán</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Chi nhánh</label>
                <select
                  className="admin-form-input"
                  value={newEmp.branch}
                  onChange={(e) => setNewEmp({ ...newEmp, branch: e.target.value })}
                >
                  {branches.map((b) => (
                    <option key={b.maChiNhanh || b.id} value={b.maChiNhanh || b.id}>
                      {b.tenChiNhanh || b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn-sm secondary"
                onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn-sm primary"
                onClick={handleAddEmployee}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Thêm nhân viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Lock Modal */}
      {confirmLockEmployee && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmLockEmployee(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: confirmLockEmployee.status === 'active' ? 'rgba(220,53,69,0.1)' : 'rgba(76,122,79,0.1)',
                color: confirmLockEmployee.status === 'active' ? '#dc3545' : 'var(--color-success)',
                borderRadius: '50%',
                padding: '8px',
                display: 'flex'
              }}>
                <Icon name={confirmLockEmployee.status === 'active' ? 'block' : 'lock_open'} size={24} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 700,
                color: confirmLockEmployee.status === 'active' ? '#dc3545' : 'var(--color-success)'
              }}>
                {confirmLockEmployee.status === 'active' ? 'Khóa tài khoản nhân viên' : 'Mở khóa tài khoản nhân viên'}
              </h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn {confirmLockEmployee.status === 'active' ? 'khóa' : 'mở khóa'} tài khoản của{' '}
              <strong>{confirmLockEmployee.full_name}</strong> ({confirmLockEmployee.id}) không?
            </p>

            {confirmLockEmployee.status === 'active' && (
              <div style={{ padding: '10px 14px', background: 'rgba(220,53,69,0.08)', borderRadius: '8px', color: '#dc3545', fontSize: '12px' }}>
                Nhân viên này sẽ không thể đăng nhập vào hệ thống sau khi tài khoản bị khóa.
              </div>
            )}

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn-sm secondary"
                onClick={() => setConfirmLockEmployee(null)}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`admin-btn-sm ${confirmLockEmployee.status === 'active' ? 'danger' : 'success'}`}
                onClick={handleConfirmLock}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                {confirmLockEmployee.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
