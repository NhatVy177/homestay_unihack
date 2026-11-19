import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../../components/common/Icon.jsx';
import SaleKpiReport from '../../../components/kpiSale/SaleKpiReport.jsx';
import { adminApi } from '../admin.api.js';
import { extractArray, formatVND } from '../admin.utils.js';

export default function AdminDashboardTab() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [branchRes, roomRes, empRes, servRes] = await Promise.allSettled([
        adminApi.getBranches(),
        adminApi.getRooms(),
        adminApi.getEmployees(),
        adminApi.getServices()
      ]);

      const branches = branchRes.status === 'fulfilled' ? extractArray(branchRes.value) : [];
      const rooms = roomRes.status === 'fulfilled' ? extractArray(roomRes.value) : [];
      const employees = empRes.status === 'fulfilled' ? extractArray(empRes.value) : [];
      const services = servRes.status === 'fulfilled' ? extractArray(servRes.value) : [];

      const totalBeds = rooms.reduce((sum, r) => sum + (Number(r.soGiuong) || 0), 0);
      const availableBeds = rooms.reduce((sum, r) => sum + (Number(r.soGiuongTrong) || 0), 0);
      const occupiedBeds = Math.max(0, totalBeds - availableBeds);

      const availableRooms = rooms.filter(r => (r.tinhTrang || r.status) === 'Trống' || (r.soGiuongTrong && r.soGiuongTrong === r.soGiuong)).length;
      const occupiedRooms = rooms.filter(r => r.soGiuongTrong === 0).length;
      const partialRooms = rooms.filter(r => (r.tinhTrang || r.status) === 'Còn chỗ' || ((Number(r.soGiuongTrong) || 0) > 0 && (Number(r.soGiuongTrong) || 0) < (Number(r.soGiuong) || 0))).length;
      const maintenanceRooms = rooms.filter(r => (r.tinhTrang || r.status) === 'Bảo trì').length;

      const activeServices = services.filter(s => s.trangThai !== 'Ngừng' && s.trangThai !== false && s.trangThai !== 'Đã tắt').length;

      setData({
        branchesCount: branches.length,
        roomsCount: rooms.length,
        capacityCount: totalBeds,
        occupantsCount: occupiedBeds,
        staffCount: employees.length,
        customerCount: occupiedBeds,
        servicesCount: services.length,
        servicesAvailable: activeServices,
        roomStatus: {
          available: availableRooms,
          occupied: occupiedRooms,
          deposited: 0,
          maintenance: maintenanceRooms,
          partial: partialRooms
        }
      });
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải số liệu tổng quan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      branchesCount: data.branchesCount,
      roomsCount: data.roomsCount,
      capacityCount: data.capacityCount,
      occupantsCount: data.occupantsCount,
      maxOccupants: data.capacityCount,
      staffCount: data.staffCount,
      customerCount: data.customerCount,
      servicesCount: data.servicesCount,
      servicesAvailable: data.servicesAvailable,
      roomStatus: data.roomStatus || {}
    };
  }, [data]);

  const occupancyRate = stats && stats.capacityCount > 0
    ? Math.round((stats.occupantsCount / stats.capacityCount) * 100)
    : 0;

  // Donut chart segments
  const donutBase = stats ? [
    { label: 'Trống', color: '#4C7A4F', count: stats.roomStatus.available || 0 },
    { label: 'Đang ở', color: '#4A6549', count: stats.roomStatus.occupied || 0 },
    { label: 'Còn chỗ', color: '#8A9E88', count: stats.roomStatus.partial || 0 },
    { label: 'Bảo trì', color: '#9E9489', count: stats.roomStatus.maintenance || 0 }
  ] : [];

  const donutTotal = donutBase.reduce((sum, s) => sum + s.count, 0);
  let donutAcc = 0;
  const donutSegments = donutBase
    .filter(s => s.count > 0)
    .map(s => {
      const len = donutTotal > 0 ? (s.count / donutTotal) * 100 : 0;
      const seg = { ...s, len, offset: -donutAcc };
      donutAcc += len;
      return seg;
    });

  if (isLoading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Đang tải số liệu tổng quan hệ thống...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: 24, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 12 }}>
        {error || 'Không có dữ liệu tổng quan.'}
      </div>
    );
  }

  return (
    <div className="admin-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Greeting Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>Xin chào, Quản trị viên!</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            <Icon name="calendar_today" size={16} />
            {todayLabel}
          </p>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <section className="admin-kpi-grid">
        {/* Branch Card */}
        <div className="admin-kpi-card" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-kpi-icon">
              <Icon name="apartment" size={24} />
            </div>
            <span className="admin-badge type">{stats.branchesCount} CHI NHÁNH</span>
          </div>
          <div>
            <p className="admin-kpi-label">Hạ tầng hoạt động</p>
            <p className="admin-kpi-value">{stats.branchesCount} Cơ sở</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>Tổng số chi nhánh đang quản lý</p>
          </div>
        </div>

        {/* Room / Bed Card */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-kpi-icon">
              <Icon name="bed" size={24} />
            </div>
            <span className="admin-badge low">LẤP ĐẦY {occupancyRate}%</span>
          </div>
          <div>
            <p className="admin-kpi-label">Tổng số phòng & giường</p>
            <p className="admin-kpi-value" style={{ fontSize: 22 }}>{stats.roomsCount} Phòng / {stats.capacityCount} Giường</p>
            <div className="admin-occupancy" style={{ marginTop: 8 }}>
              <div className="admin-occupancy-bar">
                <div className="admin-occupancy-fill" style={{ width: `${occupancyRate}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                <span>Đang ở: {stats.occupantsCount}</span>
                <span>Trống: {Math.max(0, stats.capacityCount - stats.occupantsCount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Card */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-kpi-icon">
              <Icon name="groups" size={24} />
            </div>
            <span className="admin-badge type">HOẠT ĐỘNG</span>
          </div>
          <div>
            <p className="admin-kpi-label">Tài khoản trên hệ thống</p>
            <p className="admin-kpi-value">{stats.staffCount + stats.customerCount} Tài khoản</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="admin-badge type">{stats.staffCount} Nhân sự</span>
              <span className="admin-badge off">{stats.customerCount} Khách thuê</span>
            </div>
          </div>
        </div>

        {/* Services Card */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="admin-kpi-icon">
              <Icon name="bolt" size={24} />
            </div>
            <span className="admin-badge low">{stats.servicesAvailable} ĐANG BẬT</span>
          </div>
          <div>
            <p className="admin-kpi-label">Danh mục dịch vụ cung cấp</p>
            <p className="admin-kpi-value">{stats.servicesCount} Dịch vụ</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {stats.servicesAvailable}/{stats.servicesCount} dịch vụ đang hoạt động
            </p>
          </div>
        </div>
      </section>

      {/* ── Main Analysis Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Room Status Analysis Donut Chart */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 20px' }}>
            Phân tích trạng thái phòng trống & lấp đầy
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--color-bg)" strokeWidth="3" />
                {donutSegments.map(seg => (
                  <circle
                    key={seg.label}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="3"
                    strokeDasharray={`${seg.len} ${100 - seg.len}`}
                    strokeDashoffset={seg.offset}
                  />
                ))}
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', margin: 0, lineHeight: 1 }}>{stats.roomsCount}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', margin: '4px 0 0' }}>Tổng số phòng</p>
              </div>
            </div>

            {/* Donut Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600 }}>
              {donutSegments.length === 0 ? (
                <span style={{ color: 'var(--color-text-muted)' }}>Chưa có dữ liệu phòng</span>
              ) : (
                donutSegments.map(seg => (
                  <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color }} />
                    <span style={{ color: 'var(--color-text)' }}>{seg.label} ({seg.count})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Operating Details & Maintenance Alert */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', margin: '0 0 12px' }}>Chi tiết vận hành cơ sở</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Sức chứa tối đa:</span>
                <strong>{stats.maxOccupants} người</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Đang ở thực tế:</span>
                <strong>{stats.occupantsCount} người</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tỷ lệ lấp đầy bình quân:</span>
                <strong style={{ color: 'var(--color-success)' }}>{occupancyRate}%</strong>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', textTransform: 'uppercase', margin: '0 0 10px' }}>Cảnh báo bảo trì phòng</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              {stats.roomStatus.maintenance > 0 ? (
                <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                  Có {stats.roomStatus.maintenance} phòng đang bảo trì
                </span>
              ) : (
                <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                  Không có phòng nào đang sửa chữa/bảo trì
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <SaleKpiReport title="KPI Sale toàn hệ thống" />
    </div>
  );
}
