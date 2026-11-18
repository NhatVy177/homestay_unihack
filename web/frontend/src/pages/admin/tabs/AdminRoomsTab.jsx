import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { adminApi } from '../admin.api.js';
import { extractArray } from '../admin.utils.js';
import '../admin-nam4.css';

const ROOM_STATUS_META = {
  available: { label: 'Còn trống', cls: 'bg-emerald-50 text-emerald-700' },
  full: { label: 'Đã đầy', cls: 'bg-blue-50 text-blue-700' },
  maintenance: { label: 'Bảo trì', cls: 'bg-gray-100 text-gray-600' }
};

const BED_STATUS_META = {
  available: { label: 'Còn trống', cls: 'bg-emerald-50 text-emerald-700', color: 'var(--color-success)' },
  deposited: { label: 'Đã đặt cọc', cls: 'bg-amber-50 text-amber-700', color: '#e65100' },
  occupied: { label: 'Đã có người', cls: 'bg-blue-50 text-blue-700', color: 'var(--color-primary)' },
  maintenance: { label: 'Bảo trì', cls: 'bg-gray-100 text-gray-600', color: '#6c757d' }
};

const normalizeRoomStatus = (st) => {
  if (!st) return 'available';
  const lower = String(st).toLowerCase();
  if (lower.includes('bao_tri') || lower.includes('bảo trì') || lower.includes('maintenance')) return 'maintenance';
  if (lower.includes('full') || lower.includes('đã đầy') || lower.includes('da_day')) return 'full';
  return 'available';
};

const normalizeBedStatus = (st) => {
  if (!st) return 'available';
  const lower = String(st).toLowerCase();
  if (lower.includes('maintenance') || lower.includes('bao_tri') || lower.includes('bảo trì')) return 'maintenance';
  if (lower.includes('deposit') || lower.includes('coc') || lower.includes('cọc')) return 'deposited';
  if (lower.includes('occup') || lower.includes('người') || lower.includes('thue')) return 'occupied';
  return 'available';
};

export default function AdminRoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isErrorToast, setIsErrorToast] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Edit room form in Drawer
  const [editRoom, setEditRoom] = useState({
    name: '',
    floor: 1,
    capacity: 4,
    price: 1500000,
    roomType: 'dorm',
    status: 'available'
  });

  // Bed management in Drawer
  const [beds, setBeds] = useState([]);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [editingBedId, setEditingBedId] = useState(null); // 'new' | id
  const [bedDraft, setBedDraft] = useState({ name: '', price: 1500000, status: 'available' });

  // Add room modal form
  const [newRoom, setNewRoom] = useState({
    name: '',
    branch_id: '',
    floor: 1,
    capacity: 4,
    roomType: 'dorm',
    price: 1500000,
    status: 'available'
  });

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

      const rawBranches = branchRes.status === 'fulfilled' ? extractArray(branchRes.value) : [];
      setBranches(rawBranches);

      const rawRooms = roomRes.status === 'fulfilled' ? extractArray(roomRes.value) : [];
      const mapped = rawRooms.map((r) => {
        const id = String(r.id || r.maPhong || '');
        const branchObj = rawBranches.find((b) => b.maChiNhanh === (r.branch_id || r.maChiNhanh));
        const branchName = r.branch || r.tenChiNhanh || branchObj?.tenChiNhanh || branchObj?.name || 'Chi nhánh';
        const st = normalizeRoomStatus(r.status || r.trangThai);

        return {
          id,
          name: r.name || r.tenPhong || `Phòng ${id}`,
          branch: branchName,
          branchId: r.branch_id || r.maChiNhanh || branchObj?.maChiNhanh || '',
          floor: r.floor || r.tang || 1,
          capacity: r.capacity || r.max_occupants || r.soNguoiToiDa || 4,
          roomType: r.roomType || r.room_type || r.loaiPhong || 'dorm',
          price: Number(r.price || r.giaCoBan || 1500000),
          status: st
        };
      });

      setRooms(mapped);
      if (rawBranches.length > 0 && !newRoom.branch_id) {
        setNewRoom((prev) => ({ ...prev, branch_id: rawBranches[0].maChiNhanh || rawBranches[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải danh sách phòng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadBeds = async (roomId) => {
    setBedsLoading(true);
    try {
      const res = await adminApi.getRoomBeds(roomId);
      const rawBeds = extractArray(res);
      const mapped = rawBeds.map((b) => ({
        id: String(b.id || b.maGiuong || ''),
        name: b.name || b.tenGiuong || b.maGiuong || 'Giường',
        price: Number(b.price || b.giaTien || 0),
        status: normalizeBedStatus(b.status || b.trangThai)
      }));
      setBeds(mapped);
    } catch (err) {
      console.error('Lỗi tải giường:', err);
      // Giả lập danh sách giường dựa trên sức chứa nếu phòng chưa có data
      setBeds([]);
    } finally {
      setBedsLoading(false);
    }
  };

  useEffect(() => {
    if (selected) {
      setEditRoom({
        name: selected.name,
        floor: selected.floor,
        capacity: selected.capacity,
        price: selected.price,
        roomType: selected.roomType,
        status: selected.status
      });
      setEditingBedId(null);
      loadBeds(selected.id);
    } else {
      setBeds([]);
      setEditingBedId(null);
    }
  }, [selected]);

  const kpis = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((r) => r.status === 'available').length;
    const full = rooms.filter((r) => r.status === 'full').length;
    const maintenance = rooms.filter((r) => r.status === 'maintenance').length;
    return [
      { icon: 'meeting_room', label: 'Tổng phòng', val: total, cls: '' },
      { icon: 'check_circle', label: 'Còn trống', val: available, cls: 'success' },
      { icon: 'bed', label: 'Đã đầy', val: full, cls: 'primary' },
      { icon: 'construction', label: 'Đang bảo trì', val: maintenance, cls: 'warning' }
    ];
  }, [rooms]);

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      const q = search.toLowerCase();
      const matchQ = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      const matchStatus = !filterStatus || r.status === filterStatus;
      const matchBranch = !filterBranch || r.branchId === filterBranch || r.branch === filterBranch;
      return matchQ && matchStatus && matchBranch;
    });
  }, [rooms, search, filterStatus, filterBranch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterBranch]);

  const handleAddRoom = async () => {
    if (!newRoom.name.trim()) {
      notify('Vui lòng nhập tên phòng', true);
      return;
    }
    try {
      await adminApi.createRoomBeds({
        maChiNhanh: newRoom.branch_id,
        tenPhong: newRoom.name.trim(),
        tang: Number(newRoom.floor),
        soNguoiToiDa: Number(newRoom.capacity),
        loaiPhong: newRoom.roomType,
        giaCoBan: Number(newRoom.price),
        trangThai: newRoom.status === 'available' ? 'Còn trống' : newRoom.status === 'maintenance' ? 'Bảo trì' : 'Đã đầy'
      });
      notify('Đã thêm phòng mới thành công!');
      setShowAddModal(false);
      setNewRoom({
        name: '',
        branch_id: branches[0]?.maChiNhanh || branches[0]?.id || '',
        floor: 1,
        capacity: 4,
        roomType: 'dorm',
        price: 1500000,
        status: 'available'
      });
      loadData();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi thêm phòng', true);
    }
  };

  const handleSaveRoomDetails = async () => {
    if (!selected) return;
    try {
      await adminApi.updateRoom(selected.id, {
        tenPhong: editRoom.name.trim(),
        tang: Number(editRoom.floor),
        soNguoiToiDa: Number(editRoom.capacity),
        giaCoBan: Number(editRoom.price),
        loaiPhong: editRoom.roomType,
        trangThai: editRoom.status === 'available' ? 'Còn trống' : editRoom.status === 'maintenance' ? 'Bảo trì' : 'Đã đầy'
      });
      notify('Đã cập nhật thông tin phòng!');
      setSelected(null);
      loadData();
    } catch (err) {
      console.error(err);
      notify(err.response?.data?.message || err.message || 'Lỗi khi cập nhật phòng', true);
    }
  };

  const handleSaveBed = async () => {
    if (!selected || !bedDraft.name.trim()) {
      notify('Vui lòng nhập tên giường', true);
      return;
    }
    try {
      if (editingBedId === 'new') {
        await adminApi.createRoomBed(selected.id, {
          tenGiuong: bedDraft.name.trim(),
          giaTien: Number(bedDraft.price),
          trangThai: bedDraft.status === 'available' ? 'Còn trống' : 'Bảo trì'
        });
        notify('Đã thêm giường mới thành công!');
      } else {
        await adminApi.updateRoomBed(selected.id, editingBedId, {
          tenGiuong: bedDraft.name.trim(),
          giaTien: Number(bedDraft.price),
          trangThai: bedDraft.status === 'available' ? 'Còn trống' : 'Bảo trì'
        });
        notify('Đã cập nhật giường thành công!');
      }
      setEditingBedId(null);
      loadBeds(selected.id);
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu giường', true);
    }
  };

  const formatVND = (num) => {
    if (!num) return '0 đ';
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
            Quản trị phòng & giường
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quản lý danh mục phòng, sức chứa, đơn giá và tình trạng giường theo từng chi nhánh.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="admin-btn-sm primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
        >
          <Icon name="add" size={18} />
          <span>Thêm phòng</span>
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
            placeholder="Tìm theo tên phòng, mã phòng..."
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
          <option value="available">Còn trống</option>
          <option value="full">Đã đầy</option>
          <option value="maintenance">Bảo trì</option>
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
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã phòng</th>
              <th>Tên phòng</th>
              <th>Chi nhánh</th>
              <th>Tầng</th>
              <th>Loại phòng</th>
              <th>Sức chứa</th>
              <th>Đơn giá</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={9} style={{ padding: '16px' }}>
                    <div className="admin-skeleton" style={{ height: '24px', width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="admin-empty-nam4">
                    <span className="icon"><Icon name="meeting_room" size={44} /></span>
                    <p>Không tìm thấy phòng nào</p>
                    <small>Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</small>
                  </div>
                </td>
              </tr>
            ) : (
              displayed.map((room) => {
                const meta = ROOM_STATUS_META[room.status] || ROOM_STATUS_META.available;
                return (
                  <tr
                    key={room.id}
                    className="admin-tr-hover"
                    onClick={() => setSelected(room)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      {room.id}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {room.name}
                    </td>
                    <td style={{ color: 'var(--color-text)' }}>
                      {room.branch}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      Tầng {room.floor}
                    </td>
                    <td>
                      <span className="admin-badge type">
                        {room.roomType === 'dorm' ? 'Dorm (KTX)' : room.roomType === 'twin' ? 'Phòng đôi' : 'Phòng đơn'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      {room.capacity} người
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatVND(room.price)}
                    </td>
                    <td>
                      <span className={`admin-badge-role ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          className="admin-btn-icon"
                          onClick={(e) => { e.stopPropagation(); setSelected(room); }}
                          title="Quản lý phòng & giường"
                        >
                          <Icon name="bed" size={16} />
                        </button>
                        <button
                          className="admin-btn-icon"
                          onClick={(e) => { e.stopPropagation(); setSelected(room); }}
                          title="Sửa thông tin"
                        >
                          <Icon name="edit" size={16} />
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
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} trong số {filtered.length} phòng
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

      {/* Right Drawer: Quản lý phòng & giường */}
      {selected && (
        <div className="admin-drawer-overlay" onClick={() => setSelected(null)}>
          <div className="admin-drawer" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-head">
              <div>
                <h2 className="admin-drawer-title">{selected.name}</h2>
                <small className="admin-drawer-sub">{selected.branch} • Tầng {selected.floor}</small>
              </div>
              <button className="admin-btn-icon" onClick={() => setSelected(null)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Form sửa thông tin phòng */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Thông tin phòng
                </h4>

                <div className="admin-form-group">
                  <label className="admin-form-label">Tên phòng</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editRoom.name}
                    onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })}
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Tầng</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={editRoom.floor}
                      onChange={(e) => setEditRoom({ ...editRoom, floor: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Sức chứa (người)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={editRoom.capacity}
                      onChange={(e) => setEditRoom({ ...editRoom, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Đơn giá (đ/tháng)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={editRoom.price}
                      onChange={(e) => setEditRoom({ ...editRoom, price: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Trạng thái phòng</label>
                    <select
                      className="admin-form-input"
                      value={editRoom.status}
                      onChange={(e) => setEditRoom({ ...editRoom, status: e.target.value })}
                    >
                      <option value="available">Còn trống</option>
                      <option value="full">Đã đầy</option>
                      <option value="maintenance">Bảo trì</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveRoomDetails}
                  className="admin-btn-sm primary"
                  style={{ justifyContent: 'center', padding: '8px' }}
                >
                  Lưu thông tin phòng
                </button>
              </div>

              {/* Danh sách giường */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Danh sách giường ({beds.length}/{selected.capacity})
                  </h4>
                  {beds.length < selected.capacity && !editingBedId && (
                    <button
                      onClick={() => {
                        setEditingBedId('new');
                        setBedDraft({
                          name: `Giường ${beds.length + 1}`,
                          price: selected.price,
                          status: 'available'
                        });
                      }}
                      className="admin-btn-sm secondary"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      <Icon name="add" size={14} />
                      <span>Thêm giường</span>
                    </button>
                  )}
                </div>

                {/* Inline Bed Editor */}
                {editingBedId && (
                  <div style={{ padding: '12px', background: 'var(--color-bg)', border: '1px solid var(--color-primary)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {editingBedId === 'new' ? 'Thêm giường mới' : 'Sửa giường'}
                    </p>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Tên giường</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={bedDraft.name}
                          onChange={(e) => setBedDraft({ ...bedDraft, name: e.target.value })}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">Đơn giá</label>
                        <input
                          type="number"
                          className="admin-form-input"
                          value={bedDraft.price}
                          onChange={(e) => setBedDraft({ ...bedDraft, price: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-form-label">Trạng thái</label>
                      <select
                        className="admin-form-input"
                        value={bedDraft.status}
                        onChange={(e) => setBedDraft({ ...bedDraft, status: e.target.value })}
                      >
                        <option value="available">Còn trống</option>
                        <option value="maintenance">Bảo trì</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="admin-btn-sm secondary"
                        onClick={() => setEditingBedId(null)}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        className="admin-btn-sm primary"
                        onClick={handleSaveBed}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Lưu giường
                      </button>
                    </div>
                  </div>
                )}

                {/* Bed list items */}
                {bedsLoading ? (
                  <div className="admin-skeleton" style={{ height: '60px', width: '100%' }} />
                ) : beds.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '12px 0' }}>
                    Chưa có cấu hình giường riêng cho phòng này.
                  </p>
                ) : (
                  <div className="admin-bed-list">
                    {beds.map((b) => {
                      const meta = BED_STATUS_META[b.status] || BED_STATUS_META.available;
                      return (
                        <div key={b.id} className="admin-bed-item">
                          <div>
                            <span className="admin-bed-name">{b.name}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                              <span className="admin-bed-price">{formatVND(b.price)}</span>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color }}>
                                • {meta.label}
                              </span>
                            </div>
                          </div>
                          <button
                            className="admin-btn-icon"
                            onClick={() => {
                              setEditingBedId(b.id);
                              setBedDraft({ name: b.name, price: b.price, status: b.status });
                            }}
                            title="Sửa giường"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-drawer-footer">
              <button
                onClick={() => setSelected(null)}
                className="admin-btn-sm secondary"
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2 className="admin-modal-title">Thêm phòng mới</h2>
              <button className="admin-modal-close" onClick={() => setShowAddModal(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Tên phòng</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="VD: Phòng 101, Phòng 202..."
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Chi nhánh</label>
              <select
                className="admin-form-input"
                value={newRoom.branch_id}
                onChange={(e) => setNewRoom({ ...newRoom, branch_id: e.target.value })}
              >
                {branches.map((b) => (
                  <option key={b.maChiNhanh || b.id} value={b.maChiNhanh || b.id}>
                    {b.tenChiNhanh || b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Tầng</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={newRoom.floor}
                  onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Sức chứa (người)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Loại phòng</label>
                <select
                  className="admin-form-input"
                  value={newRoom.roomType}
                  onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                >
                  <option value="dorm">Dorm (KTX)</option>
                  <option value="twin">Phòng đôi (Twin)</option>
                  <option value="single">Phòng đơn (Single)</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Đơn giá (đ/tháng)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={newRoom.price}
                  onChange={(e) => setNewRoom({ ...newRoom, price: e.target.value })}
                />
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
                onClick={handleAddRoom}
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
              >
                Thêm phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
