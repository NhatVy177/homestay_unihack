import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { adminApi } from '../admin.api.js';
import '../admin-nam4.css';

const PRIORITY_MAP = {
  high: { label: 'Bắt buộc', cls: 'admin-badge high' },
  medium: { label: 'Quan trọng', cls: 'admin-badge medium' },
  low: { label: 'Khuyến nghị', cls: 'admin-badge low' }
};

const classifyCondition = (title = '', desc = '') => {
  const text = (title + ' ' + desc).toLowerCase();
  let category = 'Nội quy';
  if (text.includes('tạm trú') || text.includes('pháp lý') || text.includes('giấy tờ') || text.includes('cccd') || text.includes('hợp đồng')) {
    category = 'Pháp lý';
  } else if (text.includes('hút thuốc') || text.includes('vệ sinh') || text.includes('rác') || text.includes('sân') || text.includes('bếp')) {
    category = 'Vệ sinh';
  } else if (text.includes('bảo vệ') || text.includes('an ninh') || text.includes('thẻ từ') || text.includes('trộm') || text.includes('cổng') || text.includes('khóa')) {
    category = 'An ninh';
  } else if (text.includes('lưu trú') || text.includes('nhận phòng') || text.includes('trả phòng') || text.includes('giới nghiêm') || text.includes('đăng ký')) {
    category = 'Lưu trú';
  }

  let priority = 'medium';
  if (text.includes('bắt buộc') || text.includes('nghiêm cấm') || text.includes('tạm trú') || text.includes('giờ giấc') || text.includes('hút thuốc') || text.includes('khóa')) {
    priority = 'high';
  } else if (text.includes('khuyến nghị') || text.includes('nên') || text.includes('nhắc nhở')) {
    priority = 'low';
  }

  return { category, priority };
};

export default function AdminConditionsTab() {
  const [conditions, setConditions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    category: 'Nội quy',
    priority: 'medium',
    isActive: true
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [isErrorToast, setIsErrorToast] = useState(false);

  const notify = (msg, isErr = false) => {
    setIsErrorToast(isErr);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const loadConditions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRules();
      const raw = res?.data || [];
      const mapped = raw.map((c) => {
        const id = String(c.id || c.maQuyDinh || '');
        const title = c.title || c.tieuDe || 'Điều kiện lưu trú';
        const description = c.description || c.noiDung || '';
        const auto = classifyCondition(title, description);

        return {
          id,
          title,
          description,
          category: c.category || c.danhMuc || auto.category,
          priority: c.priority || c.mucDo || auto.priority,
          isActive: c.is_active !== undefined ? c.is_active : (c.trangThai !== 'Tắt' && c.trangThai !== 'VoHieu'),
          effectiveDate: c.effectiveDate || (c.ngayTao ? new Date(c.ngayTao).toLocaleDateString('vi-VN') : '01/01/2025')
        };
      });

      setConditions(mapped);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải danh sách điều kiện lưu trú');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConditions();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(conditions.map((c) => c.category).filter(Boolean)));
  }, [conditions]);

  const kpis = useMemo(() => {
    const total = conditions.length;
    const active = conditions.filter((c) => c.isActive).length;
    const high = conditions.filter((c) => c.priority === 'high').length;
    return [
      { icon: 'gavel', label: 'Tổng điều kiện', val: total, cls: '' },
      { icon: 'check_circle', label: 'Đang áp dụng', val: active, cls: 'success' },
      { icon: 'priority_high', label: 'Quy định bắt buộc', val: high, cls: 'danger' },
      { icon: 'category', label: 'Danh mục', val: categories.length, cls: 'warning' }
    ];
  }, [conditions, categories]);

  const filtered = useMemo(() => {
    return conditions.filter((c) => {
      const q = search.toLowerCase();
      const matchQ = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchCat = !filterCategory || c.category === filterCategory;
      const matchPrio = !filterPriority || c.priority === filterPriority;
      return matchQ && matchCat && matchPrio;
    });
  }, [conditions, search, filterCategory, filterPriority]);

  const openAdd = () => {
    setModalMode('add');
    setForm({
      id: '',
      title: '',
      description: '',
      category: 'Nội quy',
      priority: 'medium',
      isActive: true
    });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setModalMode('edit');
    setForm({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      isActive: c.isActive
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = !item.isActive;
    try {
      await adminApi.updateRule(item.id, {
        tieuDe: item.title,
        noiDung: item.description,
        trangThai: nextStatus ? 'Hoạt động' : 'Tắt'
      });
      notify(nextStatus ? 'Đã kích hoạt điều kiện lưu trú!' : 'Đã tạm tắt điều kiện lưu trú!');
      loadConditions();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi đổi trạng thái', true);
    }
  };

  const handleSaveForm = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      notify('Tiêu đề và nội dung quy định là bắt buộc', true);
      return;
    }
    try {
      const payload = {
        tieuDe: form.title.trim(),
        noiDung: form.description.trim(),
        danhMuc: form.category,
        mucDo: form.priority,
        trangThai: form.isActive ? 'Hoạt động' : 'Tắt'
      };

      if (modalMode === 'add') {
        await adminApi.createRule(payload);
        notify('Đã thêm điều kiện lưu trú mới thành công!');
      } else {
        await adminApi.updateRule(form.id, payload);
        notify('Đã cập nhật điều kiện lưu trú!');
      }
      setShowModal(false);
      loadConditions();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi lưu điều kiện', true);
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
            Điều kiện & nội quy lưu trú
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quy định chung, chính sách an ninh, vệ sinh và thủ tục áp dụng cho khách thuê tại các cơ sở.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="admin-btn-sm primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
        >
          <Icon name="add" size={18} />
          <span>Thêm điều kiện</span>
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
            placeholder="Tìm theo tiêu đề hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          className="admin-filter-select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">Tất cả mức độ</option>
          <option value="high">Bắt buộc</option>
          <option value="medium">Quan trọng</option>
          <option value="low">Khuyến nghị</option>
        </select>
        <button
          onClick={() => { setSearch(''); setFilterCategory(''); setFilterPriority(''); }}
          className="admin-btn-refresh"
          title="Làm mới bộ lọc"
        >
          <Icon name="refresh" size={18} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Condition Card List */}
      {isLoading ? (
        <div className="admin-condition-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="admin-condition-card" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
              <div className="admin-skeleton" style={{ height: '24px', width: '50%' }} />
              <div className="admin-skeleton" style={{ height: '16px', width: '90%' }} />
              <div className="admin-skeleton" style={{ height: '16px', width: '70%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty-nam4">
          <span className="icon"><Icon name="gavel" size={44} /></span>
          <p>Không tìm thấy điều kiện lưu trú nào</p>
          <small>Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</small>
        </div>
      ) : (
        <div className="admin-condition-list">
          {filtered.map((item) => {
            const prioMeta = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;
            return (
              <div
                key={item.id}
                className={`admin-condition-card ${!item.isActive ? 'inactive' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {item.title}
                    </h3>
                    <span className={prioMeta.cls}>
                      {prioMeta.label}
                    </span>
                    <span className="admin-badge type">
                      {item.category}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`admin-badge ${item.isActive ? 'low' : 'off'}`}>
                      {item.isActive ? 'Đang áp dụng' : 'Tạm tắt'}
                    </span>
                    <button
                      className="admin-btn-icon"
                      onClick={() => openEdit(item)}
                      title="Sửa điều kiện"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      className={`admin-btn-icon ${item.isActive ? 'danger' : 'success'}`}
                      onClick={() => handleToggleStatus(item)}
                      title={item.isActive ? 'Tắt quy định này' : 'Bật áp dụng'}
                    >
                      <Icon name={item.isActive ? 'toggle_off' : 'toggle_on'} size={18} />
                    </button>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                  {item.description}
                </p>

                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Ngày hiệu lực: {item.effectiveDate}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2 className="admin-modal-title">
                {modalMode === 'add' ? 'Thêm điều kiện lưu trú mới' : 'Sửa điều kiện lưu trú'}
              </h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Tiêu đề quy định</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="VD: Quy định về đăng ký tạm trú, Giờ giấc ra vào..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Danh mục</label>
                <select
                  className="admin-form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Pháp lý">Pháp lý</option>
                  <option value="Vệ sinh">Vệ sinh</option>
                  <option value="An ninh">An ninh</option>
                  <option value="Lưu trú">Lưu trú</option>
                  <option value="Nội quy">Nội quy</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Mức độ ưu tiên</label>
                <select
                  className="admin-form-input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="high">Bắt buộc</option>
                  <option value="medium">Quan trọng</option>
                  <option value="low">Khuyến nghị</option>
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Nội dung quy định chi tiết</label>
              <textarea
                className="admin-form-input"
                rows={4}
                placeholder="Ghi rõ yêu cầu, điều kiện áp dụng, mức xử lý vi phạm nếu có..."
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
                {modalMode === 'add' ? 'Thêm điều kiện' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
