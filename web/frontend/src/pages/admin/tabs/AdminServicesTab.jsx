import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { adminApi } from '../admin.api.js';
import { extractArray } from '../admin.utils.js';
import '../admin-nam4.css';

const TYPE_LABEL = {
  essential: { label: 'Thiết yếu', cls: 'bg-emerald-50 text-emerald-700' },
  utility: { label: 'Tiện ích', cls: 'bg-blue-50 text-blue-700' },
  convenience: { label: 'Tiện nghi', cls: 'bg-amber-50 text-amber-700' },
  premium: { label: 'Cao cấp', cls: 'bg-purple-50 text-purple-700' }
};

const CYCLE_LABEL = {
  monthly: 'Hàng tháng',
  per_use: 'Theo lần',
  per_kwh: 'Theo kWh',
  per_m3: 'Theo m³'
};

const getServiceIcon = (name = '', type = '') => {
  const n = name.toLowerCase();
  if (n.includes('điện')) return 'bolt';
  if (n.includes('nước')) return 'water_drop';
  if (n.includes('wifi') || n.includes('mạng') || n.includes('internet')) return 'wifi';
  if (n.includes('giặt')) return 'local_laundry_service';
  if (n.includes('xe')) return 'directions_bike';
  if (n.includes('vệ sinh') || n.includes('dọn') || n.includes('rác')) return 'cleaning_services';
  if (type === 'essential') return 'verified';
  if (type === 'premium') return 'workspace_premium';
  if (type === 'utility') return 'build_circle';
  return 'category';
};

export default function AdminServicesTab() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [form, setForm] = useState({
    id: '',
    name: '',
    type: 'essential',
    description: '',
    unit: 'tháng',
    price: 100000,
    billingCycle: 'monthly',
    status: 'available'
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [isErrorToast, setIsErrorToast] = useState(false);

  const notify = (msg, isErr = false) => {
    setIsErrorToast(isErr);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const loadServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getServices();
      const raw = extractArray(res);
      const mapped = raw.map((s) => {
        const id = String(s.id || s.maDichVu || '');
        const name = s.name || s.tenDichVu || 'Dịch vụ';
        const st = s.status || (s.trangThai === 'Hoạt động' || s.trangThai === 'Kích hoạt' ? 'available' : 'inactive');
        const tp = s.service_type || s.loaiDichVu || (name.includes('điện') || name.includes('nước') ? 'essential' : 'utility');
        const cycle = s.billing_cycle || s.chuKy || (name.includes('điện') ? 'per_kwh' : name.includes('nước') ? 'per_m3' : 'monthly');
        const unit = s.unit || s.donViTinh || (cycle === 'per_kwh' ? 'kWh' : cycle === 'per_m3' ? 'm³' : 'tháng');

        return {
          id,
          name,
          type: tp,
          description: s.description || s.moTa || 'Dịch vụ tiện ích tại hệ thống HomeStay Dorm',
          unit,
          price: Number(s.price || s.donGia || 0),
          billingCycle: cycle,
          status: st,
          isActive: st === 'available'
        };
      });

      setServices(mapped);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải danh sách dịch vụ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const kpis = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    const essential = services.filter((s) => s.type === 'essential').length;
    const utility = services.filter((s) => s.type === 'utility').length;
    return [
      { icon: 'category', label: 'Tổng dịch vụ', val: total, cls: '' },
      { icon: 'check_circle', label: 'Đang kích hoạt', val: active, cls: 'success' },
      { icon: 'verified', label: 'Thiết yếu', val: essential, cls: 'primary' },
      { icon: 'build_circle', label: 'Tiện ích', val: utility, cls: 'warning' }
    ];
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const q = search.toLowerCase();
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      const matchType = !filterType || s.type === filterType;
      const matchStatus = !filterStatus || s.status === filterStatus;
      return matchQ && matchType && matchStatus;
    });
  }, [services, search, filterType, filterStatus]);

  const openAdd = () => {
    setModalMode('add');
    setForm({
      id: '',
      name: '',
      type: 'essential',
      description: '',
      unit: 'tháng',
      price: 100000,
      billingCycle: 'monthly',
      status: 'available'
    });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setModalMode('edit');
    setForm({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
      unit: s.unit,
      price: s.price,
      billingCycle: s.billingCycle,
      status: s.status
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (service) => {
    const nextStatus = service.status === 'available' ? 'inactive' : 'available';
    try {
      await adminApi.updateService(service.id, {
        tenDichVu: service.name,
        donGia: service.price,
        donViTinh: service.unit,
        moTa: service.description,
        trangThai: nextStatus === 'available' ? 'Hoạt động' : 'Tạm dừng'
      });
      notify(nextStatus === 'available' ? 'Đã kích hoạt dịch vụ!' : 'Đã tắt dịch vụ!');
      loadServices();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi đổi trạng thái dịch vụ', true);
    }
  };

  const handleSaveForm = async () => {
    if (!form.name.trim() || !form.unit.trim()) {
      notify('Tên dịch vụ và đơn vị tính là bắt buộc', true);
      return;
    }
    try {
      const payload = {
        tenDichVu: form.name.trim(),
        donGia: Number(form.price),
        donViTinh: form.unit.trim(),
        moTa: form.description.trim(),
        loaiDichVu: form.type,
        chuKy: form.billingCycle,
        trangThai: form.status === 'available' ? 'Hoạt động' : 'Tạm dừng'
      };

      if (modalMode === 'add') {
        await adminApi.createService(payload);
        notify('Đã thêm dịch vụ mới thành công!');
      } else {
        await adminApi.updateService(form.id, payload);
        notify('Đã cập nhật dịch vụ!');
      }
      setShowModal(false);
      loadServices();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi lưu dịch vụ', true);
    }
  };

  const formatVND = (num) => {
    if (num === undefined || num === null) return '0 đ';
    return Number(num).toLocaleString('vi-VN') + ' đ';
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
            Danh mục dịch vụ
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quản lý bảng giá các dịch vụ thiết yếu, tiện ích, chu kỳ thu phí và trạng thái kích hoạt.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="admin-btn-sm primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
        >
          <Icon name="add" size={18} />
          <span>Thêm dịch vụ</span>
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
            placeholder="Tìm theo tên dịch vụ hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tất cả loại dịch vụ</option>
          <option value="essential">Thiết yếu</option>
          <option value="utility">Tiện ích</option>
          <option value="convenience">Tiện nghi</option>
          <option value="premium">Cao cấp</option>
        </select>
        <select
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="available">Đang kích hoạt</option>
          <option value="inactive">Đã tắt</option>
        </select>
      </div>

      {/* Service 2-Column Grid */}
      {isLoading ? (
        <div className="admin-service-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-service-card" style={{ gap: '14px' }}>
              <div className="admin-skeleton" style={{ height: '32px', width: '40%' }} />
              <div className="admin-skeleton" style={{ height: '20px', width: '80%' }} />
              <div className="admin-skeleton" style={{ height: '24px', width: '60%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty-nam4">
          <span className="icon"><Icon name="category" size={44} /></span>
          <p>Không tìm thấy dịch vụ nào</p>
          <small>Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</small>
        </div>
      ) : (
        <div className="admin-service-grid">
          {filtered.map((s) => {
            const typeInfo = TYPE_LABEL[s.type] || TYPE_LABEL.utility;
            const cycleText = CYCLE_LABEL[s.billingCycle] || s.billingCycle;
            const iconName = getServiceIcon(s.name, s.type);

            return (
              <div
                key={s.id}
                className="admin-service-card"
                style={{ opacity: s.isActive ? 1 : 0.65 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      background: 'var(--color-primary-soft)',
                      color: 'var(--color-primary)',
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex'
                    }}>
                      <Icon name={iconName} size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
                        {s.name}
                      </h3>
                      <span className={`admin-badge-role ${typeInfo.cls}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="admin-btn-icon"
                      onClick={() => openEdit(s)}
                      title="Sửa dịch vụ"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(s)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: s.isActive ? 'var(--color-success)' : '#6c757d',
                        display: 'flex'
                      }}
                      title={s.isActive ? 'Tắt dịch vụ' : 'Kích hoạt dịch vụ'}
                    >
                      <Icon name={s.isActive ? 'toggle_on' : 'toggle_off'} size={26} />
                    </button>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {s.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    <span>Chu kỳ: </span>
                    <strong style={{ color: 'var(--color-text)' }}>{cycleText}</strong>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatVND(s.price)}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                      {' '}/ {s.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2 className="admin-modal-title">
                {modalMode === 'add' ? 'Thêm dịch vụ mới' : 'Sửa dịch vụ'}
              </h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Tên dịch vụ</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="VD: Điện sinh hoạt, Nước, Dọn phòng..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Loại dịch vụ</label>
                <select
                  className="admin-form-input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="essential">Thiết yếu</option>
                  <option value="utility">Tiện ích</option>
                  <option value="convenience">Tiện nghi</option>
                  <option value="premium">Cao cấp</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Chu kỳ tính phí</label>
                <select
                  className="admin-form-input"
                  value={form.billingCycle}
                  onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                >
                  <option value="monthly">Hàng tháng</option>
                  <option value="per_use">Theo lần</option>
                  <option value="per_kwh">Theo kWh</option>
                  <option value="per_m3">Theo m³</option>
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Đơn giá (VNĐ)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Đơn vị tính</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: kWh, m³, tháng, lần..."
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Mô tả dịch vụ</label>
              <textarea
                className="admin-form-input"
                rows={3}
                placeholder="Mô tả chi tiết cách tính phí, quy định áp dụng..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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
                {modalMode === 'add' ? 'Thêm dịch vụ' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
