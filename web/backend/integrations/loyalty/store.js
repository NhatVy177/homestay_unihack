import { getPool, sql } from '../../database/connection.js';
import { createServiceError } from '../../errors/serviceErrors.js';
import { SqlStore } from '../avalanche/store.js';
import { VOUCHER_VND } from '@homestaydorm/settlement/loyalty';

const opColumns = `op.Id AS id, op.Kind AS kind, op.CustomerId AS customerId, op.ContractId AS contractId,
    op.EarnedInvoiceId AS invoiceId, op.AppliedInvoiceId AS appliedInvoiceId, op.Status AS status,
    op.Wallet AS wallet, op.Deadline AS deadline, op.Signature AS signature, op.PendingTx AS pending,
    op.DiscountVnd AS discountVnd, op.TxHash AS txHash, op.CreatedAt AS createdAt`;
const deploymentFilter = 'op.ChainId=@chainId AND op.TokenAddress=@tokenAddress AND (@demoContract IS NULL OR op.ContractId=@demoContract)';
const config = ({ chainId, address, demoContract = null }) => ({ chainId, tokenAddress: address.toLowerCase(), demoContract });
const eligibleContract = `
    h.TrangThai=N'Hiệu lực'
    AND h.NgayKetThuc >= CONVERT(date, GETDATE())
    AND CONVERT(char(7), h.NgayKetThuc, 126) > COALESCE(
      (SELECT MAX(i.KyThanhToan) FROM dbo.HoaDon i
       WHERE i.MaHopDong=h.MaHopDong AND TRY_CONVERT(date, i.KyThanhToan + '-01', 23) IS NOT NULL),
      CONVERT(char(7), h.NgayBatDau, 126))
    AND NOT EXISTS (SELECT 1 FROM dbo.LoyaltyOperation v
      WHERE v.ContractId=h.MaHopDong AND v.Kind='Redeem' AND v.Status='Confirmed' AND v.AppliedInvoiceId IS NULL)`;

export class LoyaltyStore extends SqlStore {
  async locked(resource, action, wait = 5000) {
    const tx = new sql.Transaction(await getPool());
    await tx.begin();
    try {
      const lock = await this.query(`
        DECLARE @result INT;
        EXEC @result=sp_getapplock @Resource=@resource, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=@wait;
        SELECT @result AS code;`, { resource, wait }, tx);
      if (lock.recordset[0].code < 0) throw createServiceError('Điểm thưởng đang được xử lý. Vui lòng thử lại.', 409);
      const result = await action(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  }

  async discoverAwards(deployment, tx) {
    await this.query(`
      INSERT dbo.LoyaltyOperation(Id, Kind, CustomerId, ContractId, EarnedInvoiceId, Status, ChainId, TokenAddress)
      SELECT TOP (30) '0x' + LOWER(CONVERT(varchar(64), CRYPT_GEN_RANDOM(32), 2)), 'Award', h.MaKhachHang,
        hd.MaHopDong, hd.MaHoaDon, 'Queued', @chainId, @tokenAddress
      FROM dbo.HoaDon hd
      JOIN dbo.HopDongThue h ON h.MaHopDong=hd.MaHopDong
      WHERE hd.TrangThai=N'Đã TT'
        AND (@demoContract IS NULL OR h.MaHopDong=@demoContract)
        AND hd.NgayThanhToan >= @startDate AND hd.NgayThanhToan <= hd.NgayHanTT
        AND TRY_CONVERT(date, hd.KyThanhToan + '-01', 23) IS NOT NULL
        AND hd.KyThanhToan > CONVERT(char(7), h.NgayBatDau, 126)
        AND NOT EXISTS (SELECT 1 FROM dbo.LoyaltyOperation op WITH (UPDLOCK,HOLDLOCK)
                        WHERE op.EarnedInvoiceId=hd.MaHoaDon)
      ORDER BY hd.NgayThanhToan, hd.MaHoaDon;`, { ...config(deployment), startDate: deployment.startDate }, tx);
  }

  async contracts(customerId, deployment, tx) {
    return (await this.query(`
      SELECT h.MaHopDong AS id
      FROM dbo.HopDongThue h WHERE h.MaKhachHang=@customerId
        AND (@demoContract IS NULL OR h.MaHopDong=@demoContract) AND ${eligibleContract}
      ORDER BY h.MaHopDong;`, { customerId, ...config(deployment) }, tx)).recordset;
  }

  async history(customerId, deployment) {
    return (await this.query(`
      SELECT TOP (50) ${opColumns} FROM dbo.LoyaltyOperation op
      WHERE op.CustomerId=@customerId AND ${deploymentFilter} AND op.Status<>'Quoted'
      ORDER BY op.CreatedAt DESC, op.Id;`, { customerId, ...config(deployment) })).recordset;
  }

  async operation(id, customerId, deployment, tx) {
    return (await this.query(`
      SELECT ${opColumns} FROM dbo.LoyaltyOperation op
      WHERE op.Id=@id AND op.CustomerId=@customerId AND ${deploymentFilter};`, { id, customerId, ...config(deployment) }, tx)).recordset[0];
  }

  async quote(row, deployment) {
    return this.locked(`loyalty-customer:${row.customerId}`, async tx => {
      const contracts = await this.contracts(row.customerId, deployment, tx);
      if (!contracts.some(contract => contract.id === row.contractId)) {
        throw createServiceError('Hợp đồng chưa có kỳ hóa đơn tiếp theo đủ điều kiện hoặc đang có voucher.', 409);
      }
      const existing = (await this.query(`
        SELECT TOP (1) ${opColumns} FROM dbo.LoyaltyOperation op
        WHERE op.CustomerId=@customerId AND op.Kind='Redeem' AND ${deploymentFilter}
          AND (op.Status IN ('Queued','Sent') OR (op.Status='Quoted' AND op.Deadline>@now))
        ORDER BY op.CreatedAt DESC;`, { ...config(deployment), customerId: row.customerId, now: String(row.deadline - 900) }, tx)).recordset[0];
      if (existing) {
        if (existing.status === 'Quoted' && existing.contractId === row.contractId) return existing;
        throw createServiceError('Bạn đang có một yêu cầu đổi điểm. Vui lòng hoàn tất yêu cầu đó trước.', 409);
      }
      await this.query(`
        INSERT dbo.LoyaltyOperation(Id, Kind, CustomerId, ContractId, Wallet, Status, Deadline, ChainId, TokenAddress, DiscountVnd)
        VALUES(@id, 'Redeem', @customerId, @contractId, @wallet, 'Quoted', @deadline, @chainId, @tokenAddress, @discountVnd);
        `, { ...config(deployment), ...row, deadline: String(row.deadline), discountVnd: VOUCHER_VND }, tx);
      return row;
    });
  }

  async queueRedemption(row, signature, now, deployment) {
    return this.locked(`loyalty-customer:${row.customerId}`, async tx => {
      const result = await this.query(`
        UPDATE op SET Signature=@signature, Status='Queued'
        FROM dbo.LoyaltyOperation op WHERE op.Id=@id AND op.CustomerId=@customerId AND ${deploymentFilter}
          AND op.Kind='Redeem' AND op.Status='Quoted' AND op.Deadline>@now;
        `, { ...config(deployment), id: row.id, customerId: row.customerId, signature, now: String(now) }, tx);
      const current = await this.operation(row.id, row.customerId, deployment, tx);
      if (!result.rowsAffected[0] && !['Queued', 'Sent', 'Confirmed'].includes(current?.status)) {
        throw createServiceError('Lượt xác nhận đã hết hạn. Vui lòng đổi điểm lại.', 409);
      }
      return current;
    });
  }

  async next(deployment, tx) {
    return (await this.query(`
      SELECT TOP (1) ${opColumns}, w.Address AS linkedWallet
      FROM dbo.LoyaltyOperation op
      LEFT JOIN dbo.AvalancheWallet w ON w.UserId=op.CustomerId
      WHERE ${deploymentFilter} AND (op.Status='Sent'
        OR (op.Status='Queued' AND (op.Kind='Redeem' OR w.Address IS NOT NULL)))
      ORDER BY CASE WHEN op.Status='Sent' THEN 0 WHEN op.Kind='Redeem' THEN 1 ELSE 2 END, op.CreatedAt, op.Id;
      `, config(deployment), tx)).recordset[0];
  }

  async markSent(row, pending, wallet, tx) {
    await this.query(`
      UPDATE dbo.LoyaltyOperation SET Status='Sent', Wallet=@wallet, PendingTx=@pending, TxHash=@hash
      WHERE Id=@id AND Status='Queued';`, {
      id: row.id, pending: JSON.stringify(pending), wallet, hash: pending.hash,
    }, tx);
  }

  async finish(id, status, tx) {
    await this.query(`
      UPDATE dbo.LoyaltyOperation SET Status=@status, PendingTx=NULL, Signature=NULL,
        ConfirmedAt=CASE WHEN @status='Confirmed' THEN SYSUTCDATETIME() END
      WHERE Id=@id AND Status IN ('Queued','Sent');`, { id, status }, tx);
  }
}
