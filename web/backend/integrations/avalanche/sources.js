import { executeQuery, sql } from '../../database/connection.js';
import { layChiTietBienBanBanGiao } from '../../repositories/banGiao.repository.js';
import { validateStatement } from '@homestaydorm/settlement/evidence';
import { contractEvidence } from './contractEvidence.js';
export { policyText } from './policy.js';
function code(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(value)) throw Object.assign(new Error('Mã hồ sơ không hợp lệ.'), { statusCode: 400 });
  return value;
}
const query = (text, id) => executeQuery(text, [{ name: 'id', type: sql.VarChar(6), value: code(id) }]);
const money = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Các khoản VND phải là số nguyên không âm.');
  return String(n);
};
export const sqlSources = {
  async handover(id, user) {
    const row = (await query(`SELECT h.MaHopDong AS contractId,h.MaKhachHang AS customerId,
      n.MaChiNhanh AS branchId, c.SoTienCoc AS depositVnd
      FROM dbo.BienBanBanGiao b JOIN dbo.HopDongThue h ON h.MaHopDong=b.MaHopDong
      JOIN dbo.NhanVien n ON n.MaNhanVien=b.MaNhanVienQuanLy
      LEFT JOIN dbo.PhieuDatCoc c ON c.MaPhieuDatCoc=h.MaPhieuCoc
      WHERE b.MaBienBan=@id AND b.LoaiBanGiao=N'Bàn giao vào' AND b.TrangThai=N'Đã lập'`, id)).recordset[0];
    if (!row || (user && row.branchId !== user.maChiNhanh)) return null;
    const detail = await layChiTietBienBanBanGiao(id);
    const evidence = await contractEvidence.source(row.contractId);
    return {
      contractId: row.contractId, customerId: row.customerId, branchId: row.branchId,
      // D-034 / C1: retain PhieuDatCoc.SoTienCoc; partial refunds are outside C1.
      depositVnd: row.depositVnd == null ? null : money(row.depositVnd),
      ...evidence,
      notes: String(detail.bienBan?.GhiChuChung || ''),
      inventory: detail.taiSan.map(item => ({
        item: String(item.TenTaiSan || item.MaTaiSan), quantity: Number(item.SoLuongThucTe),
        condition: String(item.GhiChu || 'Không có ghi chú'),
      })),
    };
  },
  async unpublishedHandovers(branchId) {
    return (await query(`SELECT TOP (50) b.MaBienBan AS sourceId,b.MaHopDong AS contractId,b.NgayBanGiao AS handoverDate,nd.HoTen AS customerName
      FROM dbo.BienBanBanGiao b JOIN dbo.HopDongThue h ON h.MaHopDong=b.MaHopDong
      JOIN dbo.NhanVien n ON n.MaNhanVien=b.MaNhanVienQuanLy
      JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=h.MaKhachHang
      WHERE n.MaChiNhanh=@id AND b.LoaiBanGiao=N'Bàn giao vào' AND b.TrangThai=N'Đã lập'
        AND NOT EXISTS (SELECT 1 FROM dbo.AvalancheCase a WHERE a.ContractId=b.MaHopDong)
      ORDER BY b.MaBienBan DESC`, branchId)).recordset;
  },
  async contact(customerId) {
    const row = (await query('SELECT HoTen AS name,Email AS email FROM dbo.NguoiDung WHERE MaNguoiDung=@id', customerId)).recordset[0];
    return row ? { name: row.name, email: row.email } : null;
  },
  async statements(contractId) {
    return (await query(`SELECT d.MaDoiSoat AS sourceId,d.NgayLap AS createdAt,d.TrangThai AS status,
      d.TongKhauTru AS deductionsVnd,d.SoTienHoanThucTe AS refundDueVnd,d.SoTienKhachPhaiTT AS topUpDueVnd
      FROM dbo.DoiSoat d JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra=d.MaPhieuTra
      WHERE p.MaHopDong=@id ORDER BY d.MaDoiSoat DESC`, contractId)).recordset;
  },
  async statement(id, agreement, version) {
    const d = (await query(`SELECT d.*,p.MaHopDong AS contractId FROM dbo.DoiSoat d
      JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra=d.MaPhieuTra WHERE d.MaDoiSoat=@id`, id)).recordset[0];
    if (!d || d.contractId !== agreement.contractId) return null;
    // Snapshot saved Web2 result rather than recalculating policy independently.
    if (money(d.TienCocBanDau) !== agreement.depositHeldVnd) throw new Error('Cọc trên đối soát khác cọc hai bên đã xác nhận. Cần làm rõ cọc còn giữ trước khi phát hành.');
    const items = [
      ['policy-forfeiture', 'Phần cọc không được hoàn theo chính sách', Number(d.TienCocBanDau) - Number(d.TienCocDuocHoan)],
      ['rent-debt', 'Tiền thuê còn nợ', d.TienThueConNo],
      ['service-debt', 'Tiền dịch vụ còn nợ', d.TienDichVuConNo],
      ['repair', 'Chi phí sửa chữa', d.TongChiPhiSuaChua],
      ['penalty', 'Tiền phạt', d.TienPhat],
    ].map(([category, description, value]) => ({ category, description, amountVnd: money(value) }));
    const payload = {
      schema: 'homestaydorm.settlement.v1', agreementId: agreement.id, version,
      depositHeldVnd: agreement.depositHeldVnd, items,
      deductionsVnd: items.reduce((s, i) => s + BigInt(i.amountVnd), 0n).toString(),
      refundDueVnd: money(d.SoTienHoanThucTe), topUpDueVnd: money(d.SoTienKhachPhaiTT),
    };
    validateStatement(payload);
    return payload;
  },
};
