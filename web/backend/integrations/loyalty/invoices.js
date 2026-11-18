import { executeQuery, sql } from '../../database/connection.js';

async function lookup({ contractId = null, invoiceId = null, pending = false, evidence = false }, query) {
  const result = await query(`
    IF OBJECT_ID('dbo.SP_Loyalty_InvoiceDiscounts', 'P') IS NOT NULL
      EXEC dbo.SP_Loyalty_InvoiceDiscounts @MaHopDong = @MaHopDong, @MaHoaDon = @MaHoaDon,
        @ChoApDung = @ChoApDung, @MinhChung = @MinhChung;`, [
    { name: 'MaHopDong', type: sql.VarChar(6), value: contractId },
    { name: 'MaHoaDon', type: sql.VarChar(6), value: invoiceId },
    { name: 'ChoApDung', type: sql.Bit, value: pending },
    { name: 'MinhChung', type: sql.Bit, value: evidence },
  ]);
  return result.recordset || [];
}

export async function invoiceDiscounts(options, query = executeQuery) {
  const rows = await lookup(options, query);
  return new Map(rows.map(row => [row.maHoaDon, Number(row.giamDiemThuong)]));
}

export async function invoiceRewardEvidence(invoiceId, query = executeQuery) {
  const rows = await lookup({ invoiceId, evidence: true }, query);
  return rows.filter(row => row.chainId === 43113 && /^0x[a-f\d]{64}$/i.test(row.txHash))
    .map(row => ({ kind: row.kind, url: `https://testnet.snowtrace.io/tx/${row.txHash}` }));
}
