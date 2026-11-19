import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/common/Icon.jsx';
import TableState from '../../../components/common/TableState.jsx';
import StatusBadge from '../../../components/common/StatusBadge.jsx';
import { assetTransferApi } from '../../../components/assetTransfer/assetTransfer.api.js';
import { adminApi } from '../admin.api.js';
import { extractArray } from '../admin.utils.js';
import '../admin-nam4.css';
import './adminAssets.css';

const emptyForm = { maPhong: '', maTaiSan: '', tenTaiSan: '', soLuong: 1, donGia: 0, loaiTaiSan: 'Chung', maGiuong: '' };
const errorText = (error) => error?.response?.data?.message || error?.response?.data?.error || 'Không thể tải dữ liệu tài sản.';
const money = (value) => Number(value || 0).toLocaleString('vi-VN') + ' đ';

export default function AdminAssetsTab() {
  const [assets, setAssets] = useState([]);
  const [warehouse, setWarehouse] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [modal, setModal] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [branchResponse, roomResponse, warehouseResponse] = await Promise.all([
        adminApi.getBranches(), adminApi.getRooms(), assetTransferApi.warehouse(),
      ]);
      const nextBranches = extractArray(branchResponse);
      const nextRooms = extractArray(roomResponse);
      const results = await Promise.allSettled(nextRooms.map(async (room) => {
        const maPhong = room.maPhong || room.id;
        const response = await adminApi.getRoomAssets(maPhong);
        return extractArray(response).map((asset) => ({
          ...asset,
          maPhong,
          tenPhong: room.tenPhong || room.name || maPhong,
          maChiNhanh: room.maChiNhanh || room.branch_id || '',
        }));
      }));
      const failed = results.filter((result) => result.status === 'rejected').length;
      setBranches(nextBranches);
      setRooms(nextRooms);
      setWarehouse(warehouseResponse?.data?.data || []);
      setAssets(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
      if (failed) setError(`Đã tải tài sản nhưng ${failed} phòng không phản hồi. Bấm Tải lại để thử lại.`);
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const branchName = (code) => branches.find((branch) => (branch.maChiNhanh || branch.id) === code)?.tenChiNhanh || code || 'Chưa xác định';
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return assets.filter((asset) => {
      const matchesText = !keyword || [asset.maTaiSan, asset.tenTaiSan, asset.maPhong, asset.tenPhong, asset.maGiuong].some((value) => String(value || '').toLocaleLowerCase('vi').includes(keyword));
      return matchesText && (!branchFilter || asset.maChiNhanh === branchFilter) && (!typeFilter || asset.loaiTaiSan === typeFilter);
    });
  }, [assets, branchFilter, search, typeFilter]);

  const openAdd = () => {
    const firstRoom = rooms[0];
    setForm({ ...emptyForm, maPhong: firstRoom?.maPhong || firstRoom?.id || '' });
    setModal('add');
  };
  const openEdit = (asset) => {
    setForm({
      maPhong: asset.maPhong, maTaiSan: asset.maTaiSan, tenTaiSan: asset.tenTaiSan,
      soLuong: asset.soLuong, donGia: asset.donGia || 0, loaiTaiSan: asset.loaiTaiSan || 'Chung', maGiuong: asset.maGiuong || '',
    });
    setModal('edit');
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        tenTaiSan: form.tenTaiSan.trim(), soLuong: Number(form.soLuong), donGia: Number(form.donGia),
        loaiTaiSan: form.loaiTaiSan, maGiuong: form.loaiTaiSan === 'Riêng' ? form.maGiuong.trim() : null,
      };
      if (modal === 'add') await adminApi.createRoomAsset(form.maPhong, payload);
      else await adminApi.updateRoomAsset(form.maPhong, form.maTaiSan, payload);
      setModal('');
      setNotice(modal === 'add' ? 'Đã thêm tài sản phòng.' : 'Đã cập nhật tài sản phòng.');
      await load();
    } catch (saveError) {
      setError(errorText(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-assets admin-fade-in-up">
      <header className="admin-assets-header">
        <div><h1>Quản trị tài sản</h1><p>Dữ liệu thật của toàn bộ phòng và tồn kho chi nhánh; không dùng trường giả lập.</p></div>
        <div className="admin-assets-header-actions"><button className="admin-btn-sm secondary" onClick={load} disabled={loading}><Icon name="refresh" /> Tải lại</button><button className="admin-btn-sm primary" onClick={openAdd}><Icon name="add" /> Thêm tài sản phòng</button></div>
      </header>

      {error && <div className="admin-assets-alert is-error" role="alert"><Icon name="error_outline" />{error}</div>}
      {notice && <div className="admin-assets-alert is-success" role="status"><Icon name="check_circle" />{notice}</div>}

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card"><div className="admin-kpi-icon blue"><Icon name="inventory_2" /></div><div><p className="admin-kpi-label">Dòng tài sản tại phòng</p><p className="admin-kpi-value">{assets.length}</p></div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon green"><Icon name="meeting_room" /></div><div><p className="admin-kpi-label">Phòng đã kiểm tra</p><p className="admin-kpi-value">{rooms.length}</p></div></div>
        <div className="admin-kpi-card"><div className="admin-kpi-icon amber"><Icon name="inventory_2" /></div><div><p className="admin-kpi-label">Mã tài sản trong kho</p><p className="admin-kpi-value">{warehouse.length}</p></div></div>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-filter-search"><span className="search-icon"><Icon name="search" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, tên tài sản, phòng hoặc giường..." /></div>
        <select className="admin-filter-select" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map((branch) => <option key={branch.maChiNhanh || branch.id} value={branch.maChiNhanh || branch.id}>{branch.tenChiNhanh || branch.name}</option>)}</select>
        <select className="admin-filter-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Tất cả loại</option><option value="Chung">Dùng chung</option><option value="Riêng">Theo giường</option></select>
      </div>

      <div className="admin-table-container admin-assets-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Mã</th><th>Tài sản</th><th>Chi nhánh</th><th>Phòng</th><th>Loại</th><th>Giường</th><th className="admin-assets-num">Số lượng</th><th className="admin-assets-num">Đơn giá</th><th>Thao tác</th></tr></thead>
          <tbody>{loading ? <TableState kind="loading" colSpan={9} /> : filtered.length === 0 ? <TableState kind="empty" colSpan={9} message="Không có tài sản phòng phù hợp bộ lọc." /> : filtered.map((asset) => <tr key={`${asset.maPhong}-${asset.maTaiSan}`}><td className="ui-cell-code">{asset.maTaiSan}</td><td className="ui-cell-main">{asset.tenTaiSan}</td><td>{branchName(asset.maChiNhanh)}</td><td>{asset.tenPhong} ({asset.maPhong})</td><td><StatusBadge status={asset.loaiTaiSan === 'Riêng' ? 'Theo giường' : 'Dùng chung'} tone={asset.loaiTaiSan === 'Riêng' ? 'info' : 'neutral'} /></td><td>{asset.maGiuong ? `${asset.soGiuong || asset.maGiuong} (${asset.maGiuong})` : '—'}</td><td className="admin-assets-num">{asset.soLuong}</td><td className="admin-assets-num">{money(asset.donGia)}</td><td><button className="admin-btn-icon" onClick={() => openEdit(asset)} title="Sửa tài sản"><Icon name="edit" /></button></td></tr>)}</tbody>
        </table>
      </div>

      <article className="admin-assets-warehouse">
        <div><h2>Tồn kho chi nhánh</h2><p>Admin chỉ xem; quản lý chi nhánh thực hiện điều chuyển.</p></div>
        <div className="admin-table-container admin-assets-table-wrap"><table className="admin-table"><thead><tr><th>Chi nhánh</th><th>Mã</th><th>Tài sản</th><th className="admin-assets-num">Dùng được</th><th className="admin-assets-num">Chờ sửa</th></tr></thead><tbody>{loading ? <TableState kind="loading" colSpan={5} /> : warehouse.length === 0 ? <TableState kind="empty" colSpan={5} message="Chưa có tồn kho chi nhánh." /> : warehouse.map((item) => <tr key={`${item.maChiNhanh}-${item.maTaiSan}`}><td>{item.tenChiNhanh}</td><td className="ui-cell-code">{item.maTaiSan}</td><td>{item.tenTaiSan}</td><td className="admin-assets-num">{item.soLuongDungDuoc}</td><td className="admin-assets-num">{item.soLuongChoSua}</td></tr>)}</tbody></table></div>
      </article>

      {modal && <div className="admin-modal-backdrop" onClick={() => setModal('')}><form className="admin-modal-box wide" onSubmit={save} onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><h2 className="admin-modal-title">{modal === 'add' ? 'Thêm tài sản phòng' : 'Cập nhật tài sản phòng'}</h2><button type="button" className="admin-modal-close" onClick={() => setModal('')}><Icon name="close" /></button></div>
        <div className="admin-form-row"><label className="admin-form-group"><span className="admin-form-label">Phòng *</span><select className="admin-form-input" required disabled={modal === 'edit'} value={form.maPhong} onChange={(event) => setForm({ ...form, maPhong: event.target.value })}>{rooms.map((room) => <option key={room.maPhong || room.id} value={room.maPhong || room.id}>{room.tenPhong || room.name} ({room.maPhong || room.id})</option>)}</select></label><label className="admin-form-group"><span className="admin-form-label">Tên tài sản *</span><input className="admin-form-input" required maxLength="100" value={form.tenTaiSan} onChange={(event) => setForm({ ...form, tenTaiSan: event.target.value })} /></label></div>
        <div className="admin-form-row"><label className="admin-form-group"><span className="admin-form-label">Số lượng *</span><input className="admin-form-input" type="number" min="1" step="1" required value={form.soLuong} onChange={(event) => setForm({ ...form, soLuong: event.target.value })} /></label><label className="admin-form-group"><span className="admin-form-label">Đơn giá</span><input className="admin-form-input" type="number" min="0" step="1000" value={form.donGia} onChange={(event) => setForm({ ...form, donGia: event.target.value })} /></label></div>
        <div className="admin-form-row"><label className="admin-form-group"><span className="admin-form-label">Loại tài sản *</span><select className="admin-form-input" value={form.loaiTaiSan} onChange={(event) => setForm({ ...form, loaiTaiSan: event.target.value, maGiuong: event.target.value === 'Chung' ? '' : form.maGiuong })}><option value="Chung">Dùng chung</option><option value="Riêng">Theo giường</option></select></label>{form.loaiTaiSan === 'Riêng' && <label className="admin-form-group"><span className="admin-form-label">Mã giường *</span><input className="admin-form-input" required maxLength="3" value={form.maGiuong} onChange={(event) => setForm({ ...form, maGiuong: event.target.value })} placeholder="Ví dụ: G01" /></label>}</div>
        <div className="admin-form-actions"><button type="button" className="admin-btn-sm secondary" onClick={() => setModal('')}>Hủy</button><button className="admin-btn-sm primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu tài sản'}</button></div>
      </form></div>}
    </section>
  );
}
