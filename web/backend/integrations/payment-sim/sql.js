import { executeProcedure, executeQuery, getPool, sql } from '../../database/connection.js';
const row = r => r && {
  id: r.Id, purpose: r.Purpose, refId: r.RefId, customerId: r.CustomerId, amountVnd: Number(r.AmountVnd),
  status: r.Status, transId: r.GatewayTransId, invoiceId: r.MaHoaDon, lastError: r.LastError, createdAt: r.CreatedAt, paidAt: r.PaidAt,
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
      v('customerId', sql.VarChar(6), o.customerId), v('amount', sql.Decimal(15, 2), o.amountVnd)]);
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

export const sqlFirstCharges = {
  async get(id) {
    if (!/^[A-Za-z0-9]{1,6}$/.test(id)) return null;
    const result = await executeQuery(`SELECT hd.MaHopDong, hd.MaKhachHang, hd.TrangThai,
      CASE WHEN EXISTS (SELECT 1 FROM dbo.HoaDon h WHERE h.MaHopDong=hd.MaHopDong
        AND h.KyThanhToan=CONVERT(char(7),hd.NgayBatDau,120) AND h.TrangThai=N'Đã TT') THEN 1 ELSE 0 END AS Paid
      FROM dbo.HopDongThue hd WHERE hd.MaHopDong=@id`, [v('id', sql.VarChar(6), id)]);
    const row = result.recordset[0];
    return row && { id: row.MaHopDong, customerId: row.MaKhachHang, status: row.TrangThai, paid: Boolean(row.Paid) };
  },
  async amount(id) {
    let result;
    try { result = await executeProcedure('dbo.SP_TinhKhoanThuNhanPhong', [v('MaHopDong', sql.VarChar(6), id)]); }
    catch (error) {
      if ((error.number ?? error.originalError?.info?.number) === 50007) return 0;
      throw error;
    }
    const summary = result.recordsets[0]?.[0];
    if (!summary || summary.TongCongCanThu == null || summary.TienHoanCoc == null) return NaN;
    return Math.round((Number(summary.TongCongCanThu) - Number(summary.TienHoanCoc)) * 100) / 100;
  },
  async markPaid(order, receipt, transId) {
    const transaction = new sql.Transaction(await getPool());
    await transaction.begin();
    try {
      const result = await new sql.Request(transaction)
        .input('MaHopDong', sql.VarChar(6), order.refId)
        .input('MaNhanVienKeToan', sql.VarChar(6), null)
        .input('SoTienKhachThanhToan', sql.Decimal(15, 2), order.amountVnd)
        .input('PhuongThucThanhToan', sql.NVarChar(20), 'Ví điện tử')
        .input('GhiChuThanhToan', sql.NVarChar(255), receipt)
        .output('MaHoaDon', sql.VarChar(6))
        .output('MaLoi', sql.Int)
        .output('ThongBao', sql.NVarChar(500))
        .execute('dbo.SP_GhiNhanKhoanThuNhanPhong');
      const code = result.output.MaLoi;
      if (code !== 0 || !result.output.MaHoaDon) {
        const message = code === -3 ? 'Hóa đơn kỳ đầu đã được thanh toán bằng cách khác; đơn mô phỏng không được ghi nhận.'
          : code === 1 ? 'Số tiền trong đơn không còn đủ để thanh toán kỳ đầu. Vui lòng liên hệ kế toán.'
            : result.output.ThongBao || 'Không ghi nhận được khoản thu kỳ đầu.';
        throw Object.assign(new Error(message), { statusCode: 409, maLoi: code });
      }
      const updated = await new sql.Request(transaction)
        .input('id', sql.VarChar(32), order.id)
        .input('invoice', sql.VarChar(6), result.output.MaHoaDon)
        .input('transId', sql.VarChar(40), transId)
        .query(`UPDATE dbo.PaymentSimOrder SET Status='Paid', MaHoaDon=@invoice,
          GatewayTransId=@transId, PaidAt=SYSUTCDATETIME(), LastError=NULL
          WHERE Id=@id AND Status='Processing'`);
      if (updated.rowsAffected[0] !== 1) throw Object.assign(new Error('Đơn thanh toán không còn ở trạng thái xử lý.'), { statusCode: 409 });
      await transaction.commit();
      return result.output.MaHoaDon;
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    }
  },
};
