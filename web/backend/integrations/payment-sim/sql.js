import { executeProcedure, executeQuery, sql } from '../../database/connection.js';
const row = r => r && {
  id: r.Id, purpose: r.Purpose, refId: r.RefId, customerId: r.CustomerId, amountVnd: Number(r.AmountVnd),
  status: r.Status, transId: r.GatewayTransId, lastError: r.LastError, createdAt: r.CreatedAt, paidAt: r.PaidAt,
};
const v = (name, type, value) => ({ name, type, value });
export const sqlPaymentStore = {
  async get(id) {
    return row((await executeQuery('SELECT * FROM dbo.PaymentSimOrder WHERE Id=@id', [v('id', sql.VarChar(32), id)])).recordset[0]);
  },
  async findPending(purpose, refId, customerId) {
    return row((await executeQuery(`SELECT TOP (1) * FROM dbo.PaymentSimOrder WHERE Purpose=@purpose AND RefId=@refId
      AND CustomerId=@customerId AND Status='Pending' ORDER BY CreatedAt DESC`,
    [v('purpose', sql.VarChar(20), purpose), v('refId', sql.VarChar(6), refId), v('customerId', sql.VarChar(6), customerId)])).recordset[0]);
  },
  async create(o) {
    await executeQuery('INSERT dbo.PaymentSimOrder(Id,Purpose,RefId,CustomerId,AmountVnd) VALUES(@id,@purpose,@refId,@customerId,@amount)', [
      v('id', sql.VarChar(32), o.id), v('purpose', sql.VarChar(20), o.purpose), v('refId', sql.VarChar(6), o.refId),
      v('customerId', sql.VarChar(6), o.customerId), v('amount', sql.BigInt, o.amountVnd)]);
  },
  async transition(id, from, to, extra = {}) {
    const result = await executeQuery(`UPDATE dbo.PaymentSimOrder SET Status=@to,
      GatewayTransId=COALESCE(@transId,GatewayTransId), LastError=@lastError,
      PaidAt=CASE WHEN @to='Paid' THEN SYSUTCDATETIME() ELSE PaidAt END
      WHERE Id=@id AND Status=@from`, [v('id', sql.VarChar(32), id), v('from', sql.VarChar(12), from), v('to', sql.VarChar(12), to),
      v('transId', sql.VarChar(40), extra.transId || null), v('lastError', sql.NVarChar(500), extra.lastError || null)]);
    return result.rowsAffected[0] === 1;
  },
};
export const sqlDeposits = {
  async get(id) {
    if (!/^[A-Za-z0-9]{1,6}$/.test(id)) return null;
    const r = (await executeQuery(`SELECT MaPhieuDatCoc,MaKhachHang,SoTienCoc,TrangThaiThanhToan,MaNhanVienKeToan,ThoiHanThanhToan
      FROM dbo.PhieuDatCoc WHERE MaPhieuDatCoc=@id`, [v('id', sql.VarChar(6), id)])).recordset[0];
    return r && { id: r.MaPhieuDatCoc, customerId: r.MaKhachHang, amountVnd: Number(r.SoTienCoc), status: r.TrangThaiThanhToan,
      accountantId: r.MaNhanVienKeToan, expiresAt: r.ThoiHanThanhToan };
  },
  async chooseTransfer(id) {
    await executeProcedure('dbo.SP_ChonPhuongThucThanhToanCoc', [v('PhieuId', sql.NVarChar(30), id), v('PhuongThucThanhToan', sql.NVarChar(20), 'Chuyển khoản')]);
  },
  // Reuse the existing Web2 procedures: record the gateway receipt as the payment proof, then confirm it.
  async markPaid(id, receipt) {
    await executeProcedure('dbo.SP_CapNhatMinhChungThanhToanCoc', [v('PhieuId', sql.NVarChar(30), id), v('ChungTuThanhToan', sql.NVarChar(500), receipt)]);
    await executeProcedure('dbo.SP_XacNhanThanhToanCoc', [v('PhieuId', sql.NVarChar(30), id), v('HopLe', sql.Bit, true),
      v('GhiChu', sql.NVarChar(sql.MAX), null), v('QuanLyXacNhanThanhToanId', sql.NVarChar(20), null)]);
  },
};
