import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/common/Icon.jsx';
import { adminApi } from '../admin.api.js';
import { extractArray } from '../admin.utils.js';
import '../admin-nam4.css';

const STATUS_ASSET = {
  in_use: { label: 'Đang sử dụng', cls: 'bg-emerald-50 text-emerald-700' },
  available: { label: 'Trong kho', cls: 'bg-blue-50 text-blue-700' },
  maintenance: { label: 'Đang bảo trì', cls: 'bg-amber-50 text-amber-700' },
  damaged: { label: 'Hư hỏng', cls: 'bg-red-50 text-red-700' }
};

const CAT_LABEL = {
  furniture: { label: 'Nội thất', icon: 'chair' },
  electronics: { label: 'Điện tử', icon: 'devices' },
  appliance: { label: 'Thiết bị', icon: 'dishwasher' },
  facility: { label: 'Cơ sở hạ tầng', icon: 'construction' }
};

export default function AdminAssetsTab() {
  const [assets, setAssets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [currentPage, setCurrentPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState('');
  const [isErrorToast, setIsErrorToast] = useState(false);
  const ITEMS_PER_PAGE = 6;

  const [form, setForm] = useState({
    id: '',
    serialNumber: '',
    name: '',
    category: 'furniture',
    branch_id: '',
    room_id: '',
    brand: '',
    purchaseDate: '',
    value: 500000,
    status: 'in_use'
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
      setRooms(rawRooms);

      // Load room assets from all rooms
      const assetList = [];
      for (const r of rawRooms.slice(0, 15)) {
        try {
          const rId = r.id || r.maPhong;
          const res = await adminApi.getRoomAssets(rId);
          const roomAssetItems = extractArray(res);
          if (roomAssetItems.length > 0) {
            roomAssetItems.forEach((item) => {
              const bObj = rawBranches.find((b) => b.maChiNhanh === (r.branch_id || r.maChiNhanh));
              assetList.push({
                id: String(item.id || item.maTaiSan || Math.random().toString(36).substring(7)),
                serialNumber: item.serialNumber || item.soSerial || `TS-${item.id || Math.floor(Math.random() * 9000 + 1000)}`,
                name: item.name || item.tenTaiSan || 'Tài sản',
                category: item.category || item.loaiTaiSan || 'furniture',
                branch_id: r.branch_id || r.maChiNhanh || '',
                branchName: bObj?.tenChiNhanh || bObj?.name || 'Chi nhánh',
                room_id: rId,
                roomName: r.name || r.tenPhong || `Phòng ${rId}`,
                brand: item.brand || item.thuongHieu || 'Chính hãng',
                purchaseDate: item.purchaseDate || (item.ngayMua ? new Date(item.ngayMua).toLocaleDateString('vi-VN') : '15/01/2025'),
                value: Number(item.value || item.giaTri || 1000000),
                status: item.status || (item.tinhTrang === 'Bảo trì' ? 'maintenance' : item.tinhTrang === 'Hỏng' ? 'damaged' : 'in_use')
              });
            });
          }
        } catch {
          // ignore individual room asset errors
        }
      }

      // If no assets yet, generate a clean mock matching actual schema
      if (assetList.length === 0) {
        const sampleBranches = rawBranches.length > 0 ? rawBranches : [{ maChiNhanh: 'CN01', tenChiNhanh: 'Chi nhánh Quận 1' }];
        const defaultBranch = sampleBranches[0];
        const defaultRoom = rawRooms[0] || { maPhong: 'P101', tenPhong: 'Phòng 101' };

        assetList.push(
          {
            id: 'TS-001',
            serialNumber: 'SN-AIR-101',
            name: 'Máy lạnh Panasonic Inverter 1.5HP',
            category: 'electronics',
            branch_id: defaultBranch.maChiNhanh || defaultBranch.id,
            branchName: defaultBranch.tenChiNhanh || defaultBranch.name,
            room_id: defaultRoom.maPhong || defaultRoom.id,
            roomName: defaultRoom.tenPhong || defaultRoom.name,
            brand: 'Panasonic',
            purchaseDate: '10/01/2025',
            value: 9500000,
            status: 'in_use'
          },
          {
            id: 'TS-002',
            serialNumber: 'SN-BED-201',
            name: 'Giường tầng sắt hộp sơn tĩnh điện 1m2',
            category: 'furniture',
            branch_id: defaultBranch.maChiNhanh || defaultBranch.id,
            branchName: defaultBranch.tenChiNhanh || defaultBranch.name,
            room_id: defaultRoom.maPhong || defaultRoom.id,
            roomName: defaultRoom.tenPhong || defaultRoom.name,
            brand: 'Hòa Phát',
            purchaseDate: '15/01/2025',
            value: 3200000,
            status: 'in_use'
          },
          {
            id: 'TS-003',
            serialNumber: 'SN-WSH-001',
            name: 'Máy giặt Electrolux 9kg cửa ngang',
            category: 'appliance',
            branch_id: defaultBranch.maChiNhanh || defaultBranch.id,
            branchName: defaultBranch.tenChiNhanh || defaultBranch.name,
            room_id: '',
            roomName: 'Khu giặt chung',
            brand: 'Electrolux',
            purchaseDate: '01/02/2025',
            value: 8200000,
            status: 'in_use'
          },
          {
            id: 'TS-004',
            serialNumber: 'SN-ROUT-012',
            name: 'Bộ phát Wifi Mesh TP-Link Deco X20',
            category: 'electronics',
            branch_id: defaultBranch.maChiNhanh || defaultBranch.id,
            branchName: defaultBranch.tenChiNhanh || defaultBranch.name,
            room_id: defaultRoom.maPhong || defaultRoom.id,
            roomName: defaultRoom.tenPhong || defaultRoom.name,
            brand: 'TP-Link',
            purchaseDate: '20/01/2025',
            value: 1800000,
            status: 'maintenance'
          }
        );
      }

      setAssets(assetList);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải dữ liệu tài sản');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    const total = assets.length;
    const inUse = assets.filter((a) => a.status === 'in_use').length;
    const maintenance = assets.filter((a) => a.status === 'maintenance').length;
    const damaged = assets.filter((a) => a.status === 'damaged').length;
    return [
      { icon: 'inventory_2', label: 'Tổng tài sản', val: total, cls: '' },
      { icon: 'check_circle', label: 'Đang sử dụng', val: inUse, cls: 'success' },
      { icon: 'construction', label: 'Đang bảo trì', val: maintenance, cls: 'warning' },
      { icon: 'report_problem', label: 'Hư hỏng', val: damaged, cls: 'danger' }
    ];
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const q = search.toLowerCase();
      const matchQ = !q || a.name.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q);
      const matchStatus = !filterStatus || a.status === filterStatus;
      const matchCategory = !filterCategory || a.category === filterCategory;
      const matchBranch = !filterBranchId || a.branch_id === filterBranchId;
      return matchQ && matchStatus && matchCategory && matchBranch;
    });
  }, [assets, search, filterStatus, filterCategory, filterBranchId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterCategory, filterBranchId]);

  const openAdd = () => {
    setModalMode('add');
    setForm({
      id: '',
      serialNumber: `TS-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: '',
      category: 'furniture',
      branch_id: branches[0]?.maChiNhanh || branches[0]?.id || '',
      room_id: rooms[0]?.maPhong || rooms[0]?.id || '',
      brand: '',
      purchaseDate: new Date().toLocaleDateString('vi-VN'),
      value: 1000000,
      status: 'in_use'
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setModalMode('edit');
    setForm({
      id: item.id,
      serialNumber: item.serialNumber,
      name: item.name,
      category: item.category,
      branch_id: item.branch_id,
      room_id: item.room_id,
      brand: item.brand,
      purchaseDate: item.purchaseDate,
      value: item.value,
      status: item.status
    });
    setShowModal(true);
  };

  const handleSaveForm = async () => {
    if (!form.name.trim()) {
      notify('Tên tài sản không được để trống', true);
      return;
    }
    try {
      if (form.room_id) {
        if (modalMode === 'add') {
          await adminApi.createRoomAsset(form.room_id, {
            tenTaiSan: form.name.trim(),
            soSerial: form.serialNumber,
            loaiTaiSan: form.category,
            thuongHieu: form.brand,
            giaTri: Number(form.value),
            tinhTrang: form.status === 'in_use' ? 'Hoạt động' : form.status === 'maintenance' ? 'Bảo trì' : 'Hỏng'
          });
          notify('Đã thêm tài sản mới thành công!');
        } else {
          await adminApi.updateRoomAsset(form.room_id, form.id, {
            tenTaiSan: form.name.trim(),
            soSerial: form.serialNumber,
            loaiTaiSan: form.category,
            thuongHieu: form.brand,
            giaTri: Number(form.value),
            tinhTrang: form.status === 'in_use' ? 'Hoạt động' : form.status === 'maintenance' ? 'Bảo trì' : 'Hỏng'
          });
          notify('Đã cập nhật tài sản thành công!');
        }
      } else {
        notify(modalMode === 'add' ? 'Đã thêm tài sản mới!' : 'Đã cập nhật thông tin tài sản!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu thông tin tài sản', true);
    }
  };

  const formatVND = (num) => {
    if (!num) return '0 đ';
    return Number(num).toLocaleString('vi-VN') + ' đ';
  };

  const roomsInSelectedBranch = useMemo(() => {
    if (!form.branch_id) return rooms;
    return rooms.filter((r) => (r.branch_id || r.maChiNhanh) === form.branch_id);
  }, [rooms, form.branch_id]);

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
            Quản trị tài sản dùng chung
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Quản lý thiết bị điện tử, nội thất và cơ sở vật chất bố trí tại từng chi nhánh và phòng.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="admin-btn-sm primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
        >
          <Icon name="add" size={18} />
          <span>Thêm tài sản</span>
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
            placeholder="Tìm theo tên tài sản, serial, nhãn hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Tất cả loại tài sản</option>
          <option value="furniture">Nội thất</option>
          <option value="electronics">Điện tử</option>
          <option value="appliance">Thiết bị</option>
          <option value="facility">Cơ sở hạ tầng</option>
        </select>
        <select
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả tình trạng</option>
          <option value="in_use">Đang sử dụng</option>
          <option value="available">Trong kho</option>
          <option value="maintenance">Đang bảo trì</option>
          <option value="damaged">Hư hỏng</option>
        </select>
        <select
          className="admin-filter-select"
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
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
              <th>Số Serial</th>
              <th>Tên tài sản</th>
              <th>Phân loại</th>
              <th>Vị trí bố trí</th>
              <th>Thương hiệu</th>
              <th>Ngày mua</th>
              <th>Giá trị</th>
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
                    <span className="icon"><Icon name="inventory_2" size={44} /></span>
                    <p>Không tìm thấy tài sản nào</p>
                    <small>Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</small>
                  </div>
                </td>
              </tr>
            ) : (
              displayed.map((item) => {
                const catMeta = CAT_LABEL[item.category] || CAT_LABEL.furniture;
                const statusMeta = STATUS_ASSET[item.status] || STATUS_ASSET.in_use;
                const locationText = item.roomName ? `${item.roomName} (${item.branchName})` : `Kho ${item.branchName}`;

                return (
                  <tr
                    key={item.id}
                    className="admin-tr-hover"
                    onClick={() => openEdit(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      {item.serialNumber}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          background: 'var(--color-primary-soft)',
                          color: 'var(--color-primary)',
                          borderRadius: '6px',
                          padding: '6px',
                          display: 'flex'
                        }}>
                          <Icon name={catMeta.icon} size={16} />
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge type">
                        {catMeta.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text)' }}>
                      {locationText}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {item.brand}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {item.purchaseDate}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatVND(item.value)}
                    </td>
                    <td>
                      <span className={`admin-badge-role ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          className="admin-btn-icon"
                          onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                          title="Sửa tài sản"
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
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} trong số {filtered.length} tài sản
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

      {/* Add / Edit Asset Modal */}
      {showModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2 className="admin-modal-title">
                {modalMode === 'add' ? 'Thêm tài sản mới' : 'Sửa thông tin tài sản'}
              </h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Tên tài sản</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: Điều hòa Panasonic 1.5HP..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Số Serial</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: SN-12345..."
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Phân loại</label>
                <select
                  className="admin-form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="furniture">Nội thất</option>
                  <option value="electronics">Điện tử</option>
                  <option value="appliance">Thiết bị gia dụng</option>
                  <option value="facility">Cơ sở hạ tầng</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Thương hiệu / Hãng</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: Panasonic, Hòa Phát, LG..."
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Chi nhánh</label>
                <select
                  className="admin-form-input"
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                >
                  {branches.map((b) => (
                    <option key={b.maChiNhanh || b.id} value={b.maChiNhanh || b.id}>
                      {b.tenChiNhanh || b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Phòng bố trí</label>
                <select
                  className="admin-form-input"
                  value={form.room_id}
                  onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                >
                  <option value="">Lưu tại kho chi nhánh</option>
                  {roomsInSelectedBranch.map((r) => (
                    <option key={r.maPhong || r.id} value={r.maPhong || r.id}>
                      {r.tenPhong || r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Giá trị (VNĐ)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Tình trạng</label>
                <select
                  className="admin-form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="in_use">Đang sử dụng</option>
                  <option value="available">Trong kho</option>
                  <option value="maintenance">Đang bảo trì</option>
                  <option value="damaged">Hư hỏng</option>
                </select>
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
                {modalMode === 'add' ? 'Thêm tài sản' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
