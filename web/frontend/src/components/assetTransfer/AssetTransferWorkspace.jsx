import React, { useEffect, useMemo, useState } from 'react';
import { assetTransferApi } from './assetTransfer.api.js';
import PageHeader from '../common/PageHeader.jsx';
import OverviewCards from '../common/OverviewCards.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import TableState from '../common/TableState.jsx';
import { Icon } from '../common/Icon.jsx';
import './assetTransfer.css';

const OPERATIONS = [
  { value: 'PHONG_KHO', label: 'Phòng → kho dùng được', source: true },
  { value: 'KHO_PHONG', label: 'Kho dùng được → phòng', destination: true },
  { value: 'PHONG_PHONG', label: 'Phòng → phòng', source: true, destination: true },
  { value: 'DUNGDUOC_CHO_SUA', label: 'Kho dùng được → chờ sửa' },
  { value: 'CHOSUA_DUNGDUOC', label: 'Kho chờ sửa → dùng được' },
  { value: 'CHOSUA_THANHLY', label: 'Kho chờ sửa → thanh lý' },
];

const initialForm = { loaiThaoTac: 'PHONG_KHO', maPhongNguon: '', maPhongDich: '', maTaiSan: '', soLuong: 1, lyDo: '' };
const rowsOf = (response) => response?.data?.data || [];
const errorText = (error) => error?.response?.data?.message || error?.response?.data?.error || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
const location = (type, roomCode, roomName) => roomCode ? `${roomName || roomCode} (${roomCode})` : type;

export default function AssetTransferWorkspace() {
  const [warehouse, setWarehouse] = useState([]);
  const [roomAssets, setRoomAssets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouseResponse, roomResponse, historyResponse] = await Promise.all([
        assetTransferApi.warehouse(), assetTransferApi.rooms(), assetTransferApi.history(),
      ]);
      setWarehouse(rowsOf(warehouseResponse));
      setRoomAssets(rowsOf(roomResponse));
      setHistory(rowsOf(historyResponse));
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rooms = useMemo(() => {
    const grouped = new Map();
    roomAssets.forEach((item) => {
      if (!grouped.has(item.maPhong)) grouped.set(item.maPhong, { ...item, assets: [] });
      if (item.maTaiSan && Number(item.soLuong) > 0) grouped.get(item.maPhong).assets.push(item);
    });
    return [...grouped.values()];
  }, [roomAssets]);

  const operation = OPERATIONS.find((item) => item.value === form.loaiThaoTac) || OPERATIONS[0];
  const sourceRoom = rooms.find((room) => room.maPhong === form.maPhongNguon);
  const assetOptions = useMemo(() => {
    if (operation.source) return sourceRoom?.assets || [];
    const repairSource = form.loaiThaoTac.startsWith('CHOSUA_');
    return warehouse.filter((item) => Number(repairSource ? item.soLuongChoSua : item.soLuongDungDuoc) > 0);
  }, [form.loaiThaoTac, operation.source, sourceRoom, warehouse]);

  const selectRoom = (field, room) => {
    if (room.dangCoKhach) return;
    setForm((current) => ({ ...current, [field]: room.maPhong, ...(field === 'maPhongNguon' ? { maTaiSan: '' } : {}) }));
    document.getElementById('asset-transfer-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changeOperation = (value) => setForm({ ...initialForm, loaiThaoTac: value });

  const submit = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    setSubmitting(true);
    try {
      await assetTransferApi.transfer({ ...form, soLuong: Number(form.soLuong) });
      setNotice('Đã điều chuyển tài sản và ghi đúng một dòng lịch sử.');
      setForm((current) => ({ ...initialForm, loaiThaoTac: current.loaiThaoTac }));
      await load();
    } catch (submitError) {
      setError(errorText(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const totalUsable = warehouse.reduce((sum, item) => sum + Number(item.soLuongDungDuoc || 0), 0);
  const totalRepair = warehouse.reduce((sum, item) => sum + Number(item.soLuongChoSua || 0), 0);
  const occupied = rooms.filter((room) => room.dangCoKhach).length;

  return (
    <section className="asset-transfer-page">
      <div className="asset-transfer-heading">
        <PageHeader title="Điều phối tài sản" description="Chuyển tài sản dùng chung giữa kho và các phòng trong chi nhánh." />
        <button type="button" className="ui-btn ui-btn--secondary" onClick={load} disabled={loading}>
          <Icon name="refresh" /> Tải lại
        </button>
      </div>

      {error && <div className="ui-list-alert ui-list-alert--danger" role="alert"><Icon name="error_outline" />{error}</div>}
      {notice && <div className="ui-list-alert ui-list-alert--success" role="status"><Icon name="check_circle" />{notice}</div>}

      <OverviewCards items={[
        { key: 'usable', label: 'Trong kho dùng được', value: totalUsable, icon: 'inventory_2' },
        { key: 'repair', label: 'Kho chờ sửa', value: totalRepair, icon: 'build' },
        { key: 'rooms', label: 'Phòng trong chi nhánh', value: rooms.length, icon: 'meeting_room' },
        { key: 'occupied', label: 'Phòng đang có khách', value: occupied, icon: 'lock' },
      ]} />

      <div className="asset-transfer-grid">
        <article className="ui-card asset-transfer-card">
          <div className="asset-transfer-section-title"><div><h2>Tồn kho chi nhánh</h2><p>Dùng được và chờ sửa được tách riêng.</p></div></div>
          <div className="asset-transfer-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Mã</th><th>Tài sản</th><th className="ui-num">Dùng được</th><th className="ui-num">Chờ sửa</th></tr></thead>
              <tbody>
                {loading ? <TableState kind="loading" colSpan={4} /> : warehouse.length === 0 ? <TableState kind="empty" colSpan={4} message="Kho chi nhánh chưa có tài sản." /> : warehouse.map((item) => (
                  <tr key={`${item.maChiNhanh}-${item.maTaiSan}`}><td className="ui-cell-code">{item.maTaiSan}</td><td><span className="ui-cell-main">{item.tenTaiSan}</span></td><td className="ui-num">{item.soLuongDungDuoc}</td><td className="ui-num">{item.soLuongChoSua}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <form id="asset-transfer-form" className="ui-card asset-transfer-card asset-transfer-form" onSubmit={submit}>
          <div className="asset-transfer-section-title"><div><h2>Tạo phiếu điều chuyển</h2><p>Phòng có khách không thể là nguồn hoặc đích.</p></div></div>
          <label className="ui-form-field"><span>Thao tác <span className="ui-required">*</span></span><select className="ui-input" value={form.loaiThaoTac} onChange={(event) => changeOperation(event.target.value)}>{OPERATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {operation.source && <label className="ui-form-field"><span>Phòng nguồn <span className="ui-required">*</span></span><select className="ui-input" required value={form.maPhongNguon} onChange={(event) => setForm({ ...form, maPhongNguon: event.target.value, maTaiSan: '' })}><option value="">Chọn phòng nguồn</option>{rooms.map((room) => <option key={room.maPhong} value={room.maPhong} disabled={room.dangCoKhach}>{room.tenPhong} ({room.maPhong}){room.dangCoKhach ? ' — đang có khách' : ''}</option>)}</select></label>}
          {operation.destination && <label className="ui-form-field"><span>Phòng đích <span className="ui-required">*</span></span><select className="ui-input" required value={form.maPhongDich} onChange={(event) => setForm({ ...form, maPhongDich: event.target.value })}><option value="">Chọn phòng đích</option>{rooms.map((room) => <option key={room.maPhong} value={room.maPhong} disabled={room.dangCoKhach || room.maPhong === form.maPhongNguon}>{room.tenPhong} ({room.maPhong}){room.dangCoKhach ? ' — đang có khách' : ''}</option>)}</select></label>}
          <label className="ui-form-field"><span>Tài sản <span className="ui-required">*</span></span><select className="ui-input" required value={form.maTaiSan} onChange={(event) => setForm({ ...form, maTaiSan: event.target.value })}><option value="">Chọn tài sản</option>{assetOptions.map((item) => <option key={item.maTaiSan} value={item.maTaiSan}>{item.tenTaiSan} ({item.maTaiSan})</option>)}</select></label>
          <label className="ui-form-field"><span>Số lượng <span className="ui-required">*</span></span><input className="ui-input" type="number" min="1" step="1" required value={form.soLuong} onChange={(event) => setForm({ ...form, soLuong: event.target.value })} /></label>
          <label className="ui-form-field"><span>Lý do <span className="ui-required">*</span></span><textarea className="ui-textarea" rows="3" maxLength="500" required value={form.lyDo} onChange={(event) => setForm({ ...form, lyDo: event.target.value })} placeholder="Ví dụ: Điều chuyển giường sang phòng trống để chuẩn bị đón khách" /></label>
          <div className="asset-transfer-form-actions"><button className="ui-btn ui-btn--primary" disabled={submitting}>{submitting ? 'Đang điều chuyển...' : 'Xác nhận điều chuyển'}</button></div>
        </form>
      </div>

      <article className="ui-card asset-transfer-card">
        <div className="asset-transfer-section-title"><div><h2>Phòng và tài sản</h2><p>Chọn nhanh phòng trống làm nguồn hoặc đích.</p></div></div>
        <div className="asset-room-grid">
          {loading ? <p>Đang tải danh sách phòng...</p> : rooms.map((room) => (
            <article className={`asset-room${room.dangCoKhach ? ' is-occupied' : ''}`} key={room.maPhong}>
              <div className="asset-room-head"><div><strong>{room.tenPhong}</strong><span>{room.maPhong}</span></div><StatusBadge status={room.dangCoKhach ? 'Đang có khách' : 'Phòng trống'} tone={room.dangCoKhach ? 'warning' : 'success'} /></div>
              <p>{room.assets.length ? room.assets.map((item) => `${item.tenTaiSan}: ${item.soLuong}`).join(' · ') : 'Chưa có tài sản dùng chung'}</p>
              <div className="asset-room-actions"><button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={room.dangCoKhach || !operation.source} onClick={() => selectRoom('maPhongNguon', room)}>Chọn nguồn</button><button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={room.dangCoKhach || !operation.destination || room.maPhong === form.maPhongNguon} onClick={() => selectRoom('maPhongDich', room)}>Chọn đích</button></div>
            </article>
          ))}
        </div>
      </article>

      <article className="ui-card asset-transfer-card">
        <div className="asset-transfer-section-title"><div><h2>Lịch sử điều chuyển</h2><p>Mỗi lần thành công tạo đúng một phiếu để đối chiếu.</p></div></div>
        <div className="asset-transfer-table-wrap">
          <table className="ui-table">
            <thead><tr><th>Thời điểm</th><th>Tài sản</th><th>Nguồn → đích</th><th className="ui-num">Số lượng</th><th>Lý do</th><th>Người thực hiện</th></tr></thead>
            <tbody>{loading ? <TableState kind="loading" colSpan={6} /> : history.length === 0 ? <TableState kind="empty" colSpan={6} message="Chưa có lịch sử điều chuyển." /> : history.map((item) => <tr key={item.maPhieu}><td>{new Date(item.thoiDiem).toLocaleString('vi-VN')}</td><td><span className="ui-cell-main">{item.tenTaiSan}</span><span className="ui-cell-sub">{item.maTaiSan}</span></td><td>{location(item.loaiNguon, item.maPhongNguon, item.tenPhongNguon)} → {location(item.loaiDich, item.maPhongDich, item.tenPhongDich)}</td><td className="ui-num">{item.soLuong}</td><td>{item.lyDo}</td><td>{item.tenNhanVien}</td></tr>)}</tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
