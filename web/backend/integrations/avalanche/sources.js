import { executeQuery, sql } from '../../database/connection.js';
import { layChiTietBienBanBanGiao } from '../../repositories/banGiao.repository.js';
import { validateStatement } from '@homestaydorm/settlement/evidence';
function code(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(value)) throw Object.assign(new Error('Mã hồ sơ không hợp lệ.'), { statusCode: 400 });
  return value;
}
const query = (text, id) => executeQuery(text, [{ name: 'id', type: sql.VarChar(6), value: code(id) }]);
export const sqlSources = {
  async handover(id) {
    const row = (await query(`SELECT h.MaHopDong AS contractId,h.MaKhachHang AS customerId,
      n.MaChiNhanh AS branchId
      FROM dbo.BienBanBanGiao b JOIN dbo.HopDongThue h ON h.MaHopDong=b.MaHopDong
      JOIN dbo.NhanVien n ON n.MaNhanVien=b.MaNhanVienQuanLy
      WHERE b.MaBienBan=@id AND b.LoaiBanGiao=N'Bàn giao vào'`, id)).recordset[0];
    if (!row) return null;
    const detail = await layChiTietBienBanBanGiao(id);
    return { ...row, notes: String(detail.bienBan?.GhiChuChung || ''), inventory: detail.taiSan.map(item => ({
      item: String(item.TenTaiSan || item.MaTaiSan), quantity: Number(item.SoLuongThucTe),
      condition: String(item.GhiChu || 'Không có ghi chú'),
    })) };
  },
  async statement(id, agreement, version) {
    const d = (await query(`SELECT d.*,p.MaHopDong AS contractId FROM dbo.DoiSoat d
      JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra=d.MaPhieuTra WHERE d.MaDoiSoat=@id`, id)).recordset[0];
    if (!d || d.contractId !== agreement.contractId) return null;
    const money = value => {
      const n = Number(value);
      if (!Number.isSafeInteger(n) || n < 0) throw new Error('Các khoản VND phải là số nguyên không âm.');
      return String(n);
    };
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
