import { executeQuery, executeProcedure, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from '../services/serviceErrors.js';
const p=(name,type,value)=>({name,type,value});
const parse=v=>v?JSON.parse(v):null;
const code=id=>{if(!/^[A-Za-z0-9]{1,6}$/.test(id||''))throw createServiceError('Mã hồ sơ không hợp lệ.',400);return id;};
const run=async(name,values)=>{try{return await executeProcedure(name,values);}catch(e){mapDatabaseError(e,{50900:403,50901:404,50902:409,50903:400,50909:410});}};

export class SqlCheckoutClosure {
  async context(id) {
    const row=(await executeQuery(`SELECT h.MaHopDong AS contractId,h.MaKhachHang AS customerId,h.TrangThai AS contractStatus,
      scope.branchId,p.MaPhieuTra AS returnId,d.MaDoiSoat AS settlementId,
      CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT d.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)),2) AS sourceRowHash,
      ISNULL(d.SoTienHoanThucTe,0) AS refundDueVnd,ISNULL(d.SoTienKhachPhaiTT,0) AS topUpDueVnd,
      d.TrangThai AS paymentStatus,d.ChungTuThanhToan AS paymentReference,
      CASE WHEN d.ThoiDiemThanhToan IS NOT NULL THEN CONVERT(varchar(33),d.ThoiDiemThanhToan,126)+'Z' ELSE CONVERT(varchar(33),d.NgayThanhToan,126) END AS paidAt,
      a.Data AS caseData,a.Revision AS caseRevision,l.ClosedAt AS closedAt,l.Mode AS mode,l.BundleJson AS bundle,
      l.KeysReturnedAt AS keysReturnedAt,l.ExceptionReason AS exceptionReason,l.ContactProof AS contactProof,
      l.PreparedRefund AS preparedRefund,l.PreparedTopUp AS preparedTopUp,l.SettlementId AS preparedSettlementId,l.MailStatus AS mailStatus,n.Email AS email
      FROM dbo.HopDongThue h JOIN dbo.NguoiDung n ON n.MaNguoiDung=h.MaKhachHang
      OUTER APPLY(SELECT CASE WHEN MIN(ph.MaChiNhanh)=MAX(ph.MaChiNhanh) THEN MIN(ph.MaChiNhanh) END AS branchId
        FROM dbo.ChiTietDatCoc dc JOIN dbo.Phong ph ON ph.MaPhong=dc.MaPhong WHERE dc.MaPhieuDatCoc=h.MaPhieuCoc) scope
      OUTER APPLY(SELECT TOP(1) * FROM dbo.PhieuTraPhong p WHERE p.MaHopDong=h.MaHopDong AND p.TrangThai<>N'Hủy' ORDER BY p.NgayDangKyTra DESC,p.MaPhieuTra DESC) p
      OUTER APPLY(SELECT TOP(1) * FROM dbo.DoiSoat d WHERE d.MaPhieuTra=p.MaPhieuTra ORDER BY d.MaDoiSoat DESC) d
      LEFT JOIN dbo.AvalancheCase a ON a.ContractId=h.MaHopDong
      LEFT JOIN dbo.CheckoutLifecycle l ON l.ContractId=h.MaHopDong
      WHERE h.MaHopDong=@id`,[p('id',sql.VarChar(6),code(id))])).recordset[0];
    if(!row)return null;
    return {...row,case:row.caseData?{...parse(row.caseData),revision:row.caseRevision}:null,bundle:parse(row.bundle),contactProof:parse(row.contactProof)};
  }
  moneySnapshot(r) {return {contractId:r.contractId,returnId:r.returnId,settlementId:r.settlementId,refundDueVnd:String(r.refundDueVnd),topUpDueVnd:String(r.topUpDueVnd),
    paymentStatus:r.paymentStatus,paymentReference:r.paymentReference||null,paidAt:r.paidAt?new Date(r.paidAt).toISOString():null};}
  async contractForSettlement(id) {
    return (await executeQuery('SELECT p.MaHopDong AS id FROM dbo.DoiSoat d JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra=d.MaPhieuTra WHERE d.MaDoiSoat=@id',[p('id',sql.VarChar(6),code(id))])).recordset[0]?.id;
  }
  async staff(id) {
    const r=(await executeQuery(`SELECT n.MaNhanVien AS maNguoiDung,n.ChucVu AS chucVu,n.MaChiNhanh AS maChiNhanh FROM dbo.NhanVien n
      JOIN dbo.TaiKhoan t ON t.MaNguoiDung=n.MaNhanVien WHERE n.MaNhanVien=@id AND t.TrangThai=N'Hoạt động'`,[p('id',sql.VarChar(6),code(id))])).recordset[0];
    return r&&{...r,vaiTro:'NhanVien'};
  }
  async listIds(user) {
    if(!(user?.vaiTro==='KhachHang'||user?.vaiTro==='NhanVien'&&['Quản lý','Kế toán'].includes(user.chucVu)&&user.maChiNhanh))throw createServiceError('Không có quyền xem hồ sơ trả phòng.',403);
    return (await executeQuery(`SELECT DISTINCT h.MaHopDong AS id FROM dbo.HopDongThue h JOIN dbo.PhieuTraPhong pt ON pt.MaHopDong=h.MaHopDong AND pt.TrangThai<>N'Hủy'
      JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=h.MaPhieuCoc JOIN dbo.Phong ph ON ph.MaPhong=c.MaPhong
      WHERE (@customer=1 AND h.MaKhachHang=@actor) OR (@customer=0 AND ph.MaChiNhanh=@branch)
      ORDER BY h.MaHopDong DESC`,[p('customer',sql.Bit,user.vaiTro==='KhachHang'),p('actor',sql.VarChar(6),user.maNguoiDung),p('branch',sql.VarChar(6),user.maChiNhanh||null)])).recordset.map(r=>r.id);
  }
  async candidates() {
    return (await executeQuery(`SELECT DISTINCT h.MaHopDong AS id FROM dbo.HopDongThue h
      JOIN dbo.PhieuTraPhong p ON p.MaHopDong=h.MaHopDong AND p.TrangThai<>N'Hủy'
      LEFT JOIN dbo.CheckoutLifecycle l ON l.ContractId=h.MaHopDong
      WHERE l.ClosedAt IS NULL OR ISNULL(l.MailStatus,'')<>'sent'`)).recordset.map(r=>r.id);
  }
  async allCases() {
    return (await executeQuery('SELECT Data,Revision FROM dbo.AvalancheCase')).recordset.map(r=>({...JSON.parse(r.Data),revision:r.Revision}));
  }
  async simulatedOrder(id) {
    const r=(await executeQuery(`SELECT Status AS status,Purpose AS purpose,RefId AS refId,GatewayTransId AS transId,AmountVnd AS amountVnd,PaidAt AS paidAt
      FROM dbo.PaymentSimOrder WHERE Id=@id`,[p('id',sql.VarChar(32),id)])).recordset[0];return r;
  }
  accepted(row) {return run('dbo.SP_C4_AdvanceMoney',[p('ContractId',sql.VarChar(6),row.contractId),p('SettlementId',sql.VarChar(6),row.settlementId),p('Mode',sql.VarChar(24),'accepted')]);}
  prepareException(row,user,reason,proof) {return run('dbo.SP_C4_AdvanceMoney',[
    p('ContractId',sql.VarChar(6),row.contractId),p('SettlementId',sql.VarChar(6),row.settlementId),p('Mode',sql.VarChar(24),'without-consent'),
    p('Actor',sql.VarChar(6),user.maNguoiDung),p('Reason',sql.NVarChar(2000),reason),p('ContactProof',sql.NVarChar(sql.MAX),JSON.stringify(proof))]);}
  async disputed(row) {
    const latest=row.case?.versions?.at(-1);
    if(latest?.sourceId!==row.settlementId)return;
    await executeQuery(`UPDATE d SET TrangThai=N'Chờ phản hồi',GhiChuPhanHoiKhach=@reason FROM dbo.DoiSoat d
      JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra=d.MaPhieuTra JOIN dbo.AvalancheCase a ON a.ContractId=p.MaHopDong
      WHERE d.MaDoiSoat=@id AND p.MaHopDong=@contract AND JSON_VALUE(a.Data,'$.state')='disputed'
        AND d.TrangThai IN(N'Chờ xác nhận',N'Chờ phản hồi')`,[
      p('reason',sql.NVarChar(500),String(latest.dispute?.payload?.reason||'Khách phản đối bản đối soát.').slice(0,500)),
      p('id',sql.VarChar(6),row.settlementId),p('contract',sql.VarChar(6),row.contractId)]);
  }
  async close(row,{mode,bundle,sourceDigest,actor}) {
    const r=await run('dbo.SP_C4_Close',[
      p('ContractId',sql.VarChar(6),row.contractId),p('SettlementId',sql.VarChar(6),row.settlementId),p('Mode',sql.VarChar(24),mode),
      p('Bundle',sql.NVarChar(sql.MAX),JSON.stringify(bundle)),p('SourceDigest',sql.VarChar(66),sourceDigest),
      p('ExpectedRowHash',sql.VarChar(64),row.sourceRowHash),
      p('ExpectedRefund',sql.Decimal(15,2),row.refundDueVnd),p('ExpectedTopUp',sql.Decimal(15,2),row.topUpDueVnd),
      p('PaymentReference',sql.VarChar(500),row.paymentReference||null),p('CaseRevision',sql.Int,row.case?.revision),p('Actor',sql.VarChar(6),actor)]);
    return r.recordset?.[0]||{};
  }
  returnKeys(row,user) {return run('dbo.SP_C4_ReturnKeys',[p('ContractId',sql.VarChar(6),row.contractId),p('Actor',sql.VarChar(6),user.maNguoiDung)]);}
  async claimMail(id) {
    const r=await executeQuery(`UPDATE dbo.CheckoutLifecycle SET MailLeaseUntil=DATEADD(MINUTE,5,SYSUTCDATETIME()),MailAttemptAt=SYSUTCDATETIME()
      OUTPUT inserted.ContractId WHERE ContractId=@id AND ClosedAt IS NOT NULL AND ISNULL(MailStatus,'')<>'sent'
        AND (MailLeaseUntil IS NULL OR MailLeaseUntil<SYSUTCDATETIME())
        AND (MailAttemptAt IS NULL OR MailAttemptAt<DATEADD(MINUTE,-5,SYSUTCDATETIME()))`,[p('id',sql.VarChar(6),id)]);
    return r.recordset.length?this.context(id):null;
  }
  async finishMail(id,status) {await executeQuery('UPDATE dbo.CheckoutLifecycle SET MailStatus=@status,MailLeaseUntil=NULL WHERE ContractId=@id',[
    p('id',sql.VarChar(6),id),p('status',sql.VarChar(12),['sent','failed','skipped','logged'].includes(status)?status:'failed')]);}
}
