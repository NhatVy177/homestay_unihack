import assert from 'node:assert/strict';
import { it } from 'node:test';
import { getPool, sql } from '../database/connection.js';
import { sqlFirstCharges } from '../integrations/payment-sim/sql.js';

it('records a first-charge wallet invoice without an accountant and rolls back SQL changes',
  { skip: process.env.TEST_SQL !== 'true' }, async t => {
    const pool = await getPool();
    try {
      const rows = (await pool.request().query(`SELECT TOP (50) hd.MaHopDong FROM dbo.HopDongThue hd
        WHERE hd.TrangThai=N'Hiệu lực' AND NOT EXISTS (
          SELECT 1 FROM dbo.HoaDon h WHERE h.MaHopDong=hd.MaHopDong
            AND h.KyThanhToan=CONVERT(char(7),hd.NgayBatDau,120) AND h.TrangThai=N'Đã TT')
        ORDER BY hd.MaHopDong`)).recordset;
      let selected;
      for (const row of rows) {
        try {
          const amount = await sqlFirstCharges.amount(row.MaHopDong);
          if (amount > 0) { selected = { id: row.MaHopDong, amount }; break; }
        } catch { /* Try another existing test contract. */ }
      }
      if (!selected) return t.skip('No active, unpaid first-charge contract with a positive amount in local SQL.');
      const invoiceQuery = `SELECT MaHoaDon, TrangThai, PhuongThucThanhToan, MaNhanVienKeToan
        FROM dbo.HoaDon WHERE MaHopDong=@id AND KyThanhToan=(SELECT CONVERT(char(7),NgayBatDau,120)
          FROM dbo.HopDongThue WHERE MaHopDong=@id) ORDER BY MaHoaDon`;
      const before = (await pool.request().input('id', sql.VarChar(6), selected.id).query(invoiceQuery)).recordset;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        const result = await new sql.Request(transaction)
          .input('MaHopDong', sql.VarChar(6), selected.id)
          .input('MaNhanVienKeToan', sql.VarChar(6), null)
          .input('SoTienKhachThanhToan', sql.Decimal(15, 2), selected.amount)
          .input('PhuongThucThanhToan', sql.NVarChar(20), 'Ví điện tử')
          .input('GhiChuThanhToan', sql.NVarChar(255), 'cong-thanh-toan-mo-phong:SIMROLLBACK:SIMTXROLLBACK')
          .output('MaHoaDon', sql.VarChar(6))
          .output('MaLoi', sql.Int)
          .output('ThongBao', sql.NVarChar(500))
          .execute('dbo.SP_GhiNhanKhoanThuNhanPhong');
        assert.equal(result.output.MaLoi, 0, result.output.ThongBao);
        const invoice = (await new sql.Request(transaction)
          .input('id', sql.VarChar(6), result.output.MaHoaDon)
          .query('SELECT TrangThai, PhuongThucThanhToan, MaNhanVienKeToan FROM dbo.HoaDon WHERE MaHoaDon=@id')).recordset[0];
        assert.equal(invoice.TrangThai, 'Đã TT');
        assert.equal(invoice.PhuongThucThanhToan, 'Ví điện tử');
        assert.equal(invoice.MaNhanVienKeToan, null);
        const detail = await new sql.Request(transaction)
          .input('MaHopDong', sql.VarChar(6), selected.id)
          .execute('dbo.SP_LayChiTietThuNhanPhong');
        assert.equal(detail.recordsets[0]?.[0]?.NguoiThu, 'Tự động (cổng thanh toán mô phỏng)');
        const duplicate = await new sql.Request(transaction)
          .input('MaHopDong', sql.VarChar(6), selected.id)
          .input('MaNhanVienKeToan', sql.VarChar(6), null)
          .input('SoTienKhachThanhToan', sql.Decimal(15, 2), selected.amount)
          .input('PhuongThucThanhToan', sql.NVarChar(20), 'Ví điện tử')
          .input('GhiChuThanhToan', sql.NVarChar(255), 'cong-thanh-toan-mo-phong:SIMROLLBACK:SIMTXROLLBACK')
          .output('MaHoaDon', sql.VarChar(6))
          .output('MaLoi', sql.Int)
          .output('ThongBao', sql.NVarChar(500))
          .execute('dbo.SP_GhiNhanKhoanThuNhanPhong');
        assert.equal(duplicate.output.MaLoi, -3);
        assert.equal(duplicate.output.MaHoaDon, result.output.MaHoaDon);
      } finally { await transaction.rollback(); }
      const after = (await pool.request().input('id', sql.VarChar(6), selected.id).query(invoiceQuery)).recordset;
      assert.deepEqual(after, before);
    } finally { await pool.close(); }
  });
