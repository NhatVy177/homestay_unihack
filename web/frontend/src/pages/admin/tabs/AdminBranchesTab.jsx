import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { adminApi } from '../admin.api.js';
import { extractArray } from '../admin.utils.js';
import '../admin-nam4.css';

export default function AdminBranchesTab() {
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [form, setForm] = useState({
    id: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    status: 'active'
  });
  const [confirmStatusBranch, setConfirmStatusBranch] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isErrorToast, setIsErrorToast] = useState(false);

  const notify = (msg, isErr = false) => {
    setIsErrorToast(isErr);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [branchRes, roomRes] = await Promise.allSettled([
        adminApi.getBranches(),
        adminApi.getRooms()
      ]);

      const rawRooms = roomRes.status === 'fulfilled' ? extractArray(roomRes.value) : [];
      setRooms(rawRooms);

      const rawBranches = branchRes.status === 'fulfilled' ? extractArray(branchRes.value) : [];
      const mapped = rawBranches.map((b) => {
        const id = b.id || b.maChiNhanh || '';
        const branchRooms = rawRooms.filter((r) => (r.branch_id || r.maChiNhanh) === id);
        const activeRooms = branchRooms.filter((r) => {
          const st = String(r.status || r.trangThai || '').toLowerCase();
          return st.includes('occup') || st.includes('full') || st.includes('hoạt động') || st.includes('dang_thue');
        }).length;

        const isInactive = b.status === 'inactive' || b.trangThai === 'Tạm dừng' || b.trangThai === 'Ngưng hoạt động';

        return {
          id,
          code: id,
          name: b.name || b.tenChiNhanh || 'Chi nhánh chưa đặt tên',
          address: b.address || b.diaChi || 'Chưa có địa chỉ',
          phone: b.phone || b.soDienThoai || '',
          email: b.email || '',
          totalRooms: branchRooms.length,
          activeRooms,
          status: isInactive ? 'inactive' : 'active'
        };
      });

      setBranches(mapped);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải danh sách chi nhánh');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const total = branches.length;
    const totalRooms = branches.reduce((s, b) => s + b.totalRooms, 0);
    const activeRooms = branches.reduce((s, b) => s + b.activeRooms, 0);
    const occupancy = totalRooms ? Math.round((activeRooms / totalRooms) * 100) : 0;
    return [
      { icon: 'apartment', label: 'Tổng chi nhánh', val: total, cls: '' },
      { icon: 'meeting_room', label: 'Tổng số phòng', val: totalRooms, cls: 'primary' },
      { icon: 'bed', label: 'Phòng đang hoạt động', val: activeRooms, cls: 'success' },
      { icon: 'percent', label: 'Tỷ lệ lấp đầy', val: `${occupancy}%`, cls: 'warning' }
    ];
  }, [branches]);

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      const q = search.toLowerCase();
      const matchQ = !q || b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
      const matchStatus = !filterStatus || b.status === filterStatus;
      return matchQ && matchStatus;
    });
  }, [branches, search, filterStatus]);

  const openAdd = () => {
    setModalMode('add');
    setForm({
      id: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setModalMode('edit');
    setForm({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      email: b.email,
      status: b.status
    });
    setShowModal(true);
  };

  const handleSaveForm = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      notify('Tên chi nhánh và địa chỉ không được để trống', true);
      return;
    }
    try {
      if (modalMode === 'add') {
        await adminApi.createBranch({
          tenChiNhanh: form.name.trim(),
          diaChi: form.address.trim(),
          soDienThoai: form.phone.trim(),
          email: form.email.trim(),
          trangThai: form.status === 'active' ? 'Hoạt động' : 'Tạm dừng'
        });
        notify('Đã tạo chi nhánh mới thành công!');
      } else {
        await adminApi.updateBranch(form.id, {
          tenChiNhanh: form.name.trim(),
          diaChi: form.address.trim(),
          soDienThoai: form.phone.trim(),
          email: form.email.trim(),
          trangThai: form.status === 'active' ? 'Hoạt động' : 'Tạm dừng'
        });
        notify('Đã cập nhật thông tin chi nhánh!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi lưu chi nhánh', true);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmStatusBranch) return;
    const nextStatus = confirmStatusBranch.status === 'active' ? 'inactive' : 'active';
    try {
      await adminApi.updateBranch(confirmStatusBranch.id, {
        trangThai: nextStatus === 'active' ? 'Hoạt động' : 'Tạm dừng'
      });
      notify(nextStatus === 'active' ? 'Đã kích hoạt lại chi nhánh!' : 'Đã ngưng hoạt động chi nhánh!');
      setConfirmStatusBranch(null);
      loadData();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi thay đổi trạng thái chi nhánh', true);
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
            Quản trị chi nhánh
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quản lý thông tin liên hệ, địa chỉ và tình trạng hoạt động của các chi nhánh HomeStay Dorm.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="admin-btn-sm primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
        >
          <Icon name="add_business" size={18} />
          <span>Thêm chi nhánh</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.2)', borderRadius: '10px', color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="error" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI */}
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

      {/* Filter */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search">
          <span className="search-icon"><Icon name="search" size={18} /></span>
          <input
            type="text"
            placeholder="Tìm theo tên chi nhánh hoặc địa chỉ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm dừng</option>
        </select>
        <button
          onClick={() => { setSearch(''); setFilterStatus(''); }}
          className="admin-btn-refresh"
          title="Làm mới bộ lọc"
        >
          <Icon name="refresh" size={18} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Branch Card Grid */}
      {isLoading ? (
        <div className="admin-branch-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="admin-branch-card" style={{ gap: '16px' }}>
              <div className="admin-skeleton" style={{ height: '20px', width: '35%' }} />
              <div className="admin-skeleton" style={{ height: '24px', width: '70%' }} />
              <div className="admin-skeleton" style={{ height: '16px', width: '90%' }} />
              <div className="admin-skeleton" style={{ height: '8px', width: '100%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty-nam4">
          <span className="icon"><Icon name="manage_search" size={44} /></span>
          <p>Không tìm thấy chi nhánh nào</p>
          <small>Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</small>
        </div>
      ) : (
        <div className="admin-branch-grid">
          {filtered.map((b) => {
            const occupancy = b.totalRooms ? Math.round((b.activeRooms / b.totalRooms) * 100) : 0;
            return (
              <div key={b.id} className="admin-branch-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="admin-branch-code">{b.code}</span>
                    <h3 className="admin-branch-name" style={{ marginTop: '6px' }}>{b.name}</h3>
                    <p className="admin-branch-addr" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Icon name="location_on" size={14} />
                      <span>{b.address}</span>
                    </p>
                  </div>
                  <span className={`admin-badge ${b.status === 'active' ? 'low' : 'off'}`} style={{ whiteSpace: 'nowrap' }}>
                    {b.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>

                {/* Occupancy bar */}
                <div className="admin-occupancy" style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Phòng đang thuê</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {b.activeRooms}/{b.totalRooms} phòng ({occupancy}%)
                    </span>
                  </div>
                  <div className="admin-occupancy-bar">
                    <div className="admin-occupancy-fill" style={{ width: `${occupancy}%` }} />
                  </div>
                </div>

                {/* Contact and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {b.phone ? <span><Icon name="phone" size={12} /> {b.phone}</span> : 'Chưa có SĐT'}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="admin-btn-icon"
                      onClick={() => openEdit(b)}
                      title="Sửa chi nhánh"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      className={`admin-btn-icon ${b.status === 'active' ? 'danger' : 'success'}`}
                      onClick={() => setConfirmStatusBranch(b)}
                      title={b.status === 'active' ? 'Ngưng hoạt động' : 'Kích hoạt lại'}
                    >
                      <Icon name={b.status === 'active' ? 'toggle_off' : 'toggle_on'} size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2 className="admin-modal-title">
                {modalMode === 'add' ? 'Thêm chi nhánh mới' : 'Sửa thông tin chi nhánh'}
              </h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Tên chi nhánh</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="VD: Chi nhánh Quận 1..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Địa chỉ</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="VD: 123 Nguyễn Thị Minh Khai, P. Bến Nghé, Q.1..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Số điện thoại</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: 0901234567..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Email</label>
                <input
                  type="email"
                  className="admin-form-input"
                  placeholder="chinhanh@homestay.vn"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn-sm secondary"
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn-sm primary"
                onClick={handleSaveForm}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                {modalMode === 'add' ? 'Thêm chi nhánh' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Toggle Status Modal */}
      {confirmStatusBranch && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmStatusBranch(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: confirmStatusBranch.status === 'active' ? 'rgba(220,53,69,0.1)' : 'rgba(76,122,79,0.1)',
                color: confirmStatusBranch.status === 'active' ? '#dc3545' : 'var(--color-success)',
                borderRadius: '50%',
                padding: '8px',
                display: 'flex'
              }}>
                <Icon name={confirmStatusBranch.status === 'active' ? 'warning' : 'check_circle'} size={24} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 700,
                color: confirmStatusBranch.status === 'active' ? '#dc3545' : 'var(--color-success)'
              }}>
                {confirmStatusBranch.status === 'active' ? 'Ngưng hoạt động chi nhánh' : 'Kích hoạt lại chi nhánh'}
              </h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn {confirmStatusBranch.status === 'active' ? 'ngưng hoạt động' : 'kích hoạt lại'}{' '}
              <strong>{confirmStatusBranch.name}</strong> ({confirmStatusBranch.code}) không?
            </p>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-btn-sm secondary"
                onClick={() => setConfirmStatusBranch(null)}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`admin-btn-sm ${confirmStatusBranch.status === 'active' ? 'danger' : 'success'}`}
                onClick={handleConfirmToggleStatus}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                {confirmStatusBranch.status === 'active' ? 'Ngưng hoạt động' : 'Kích hoạt lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
