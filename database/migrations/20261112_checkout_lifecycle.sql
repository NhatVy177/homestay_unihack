-- C4 / D-030, D-031, D-038, D-041. Schema only: no backfill of old contracts.
IF COL_LENGTH(N'dbo.DoiSoat',N'ThoiDiemThanhToan') IS NULL
  ALTER TABLE dbo.DoiSoat ADD ThoiDiemThanhToan datetime2 NULL;
IF OBJECT_ID(N'dbo.CheckoutLifecycle',N'U') IS NULL
CREATE TABLE dbo.CheckoutLifecycle (
  ContractId varchar(6) NOT NULL PRIMARY KEY REFERENCES dbo.HopDongThue(MaHopDong),
  ReturnId varchar(6) NOT NULL REFERENCES dbo.PhieuTraPhong(MaPhieuTra),
  SettlementId varchar(6) NULL,
  ClosedAt datetime2 NULL, Mode varchar(24) NULL,
  BundleJson nvarchar(max) NULL CHECK (BundleJson IS NULL OR ISJSON(BundleJson)=1),
  SourceDigest varchar(66) NULL,
  ExceptionReason nvarchar(2000) NULL, ContactProof nvarchar(max) NULL CHECK (ContactProof IS NULL OR ISJSON(ContactProof)=1),
  ExceptionPreparedBy varchar(6) NULL, PreparedRefund decimal(15,2) NULL, PreparedTopUp decimal(15,2) NULL,
  KeysReturnedAt datetime2 NULL, KeysReturnedBy varchar(6) NULL,
  MailStatus varchar(12) NULL, MailLeaseUntil datetime2 NULL, MailAttemptAt datetime2 NULL,
  CONSTRAINT CK_CheckoutLifecycle_Mode CHECK (Mode IS NULL OR Mode IN ('accepted','without-consent'))
);
GO
CREATE OR ALTER FUNCTION dbo.C4_ExceptionAllowed(@data nvarchar(max)) RETURNS bit
AS
BEGIN
  IF @data IS NULL OR ISJSON(@data)<>1 RETURN 0;
  IF JSON_QUERY(@data,'$.pending') IS NOT NULL RETURN 0;
  DECLARE @state varchar(30)=JSON_VALUE(@data,'$.state');
  IF @state='disputed' RETURN 1;
  DECLARE @sent datetimeoffset;
  IF @state='settlement-pending'
    SELECT TOP (1) @sent=TRY_CONVERT(datetimeoffset,JSON_VALUE(value,'$.bundle.receipt.at'))
    FROM OPENJSON(@data,'$.versions') ORDER BY TRY_CONVERT(int,[key]) DESC;
  ELSE IF @state IN ('review','handover-pending')
    SELECT TOP (1) @sent=TRY_CONVERT(datetimeoffset,JSON_VALUE(value,'$.publishedAt'))
    FROM OPENJSON(@data,'$.drafts') ORDER BY TRY_CONVERT(int,[key]) DESC;
  IF @sent<=DATEADD(DAY,-7,SYSUTCDATETIME()) RETURN 1;
  RETURN 0;
END;
GO
-- Runs inside each existing financial transaction, closing the gap between the
-- API preflight and the write. No-contract deposit cancellations are unchanged.
CREATE OR ALTER PROCEDURE dbo.SP_C4_AssertMoney @SettlementId varchar(6)
AS
BEGIN
 SET NOCOUNT ON;
 IF @@TRANCOUNT=0 THROW 50902,N'Kiểm tra tiền phải nằm trong giao dịch thanh toán.',1;
 DECLARE @contract varchar(6),@refund decimal(15,2),@topup decimal(15,2),@data nvarchar(max),@source varchar(6),@accepted bit;
 SELECT @contract=p.MaHopDong,@refund=ISNULL(d.SoTienHoanThucTe,0),@topup=ISNULL(d.SoTienKhachPhaiTT,0)
 FROM dbo.DoiSoat d WITH(UPDLOCK,HOLDLOCK) JOIN dbo.PhieuTraPhong p WITH(UPDLOCK,HOLDLOCK) ON p.MaPhieuTra=d.MaPhieuTra
 WHERE d.MaDoiSoat=@SettlementId;
 IF @contract IS NULL RETURN;
 IF EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WITH(UPDLOCK,HOLDLOCK) WHERE ContractId=@contract AND ClosedAt IS NOT NULL)
   THROW 50902,N'Hồ sơ đã đóng, không được ghi thêm tiền.',1;
 SELECT @data=Data FROM dbo.AvalancheCase WITH(UPDLOCK,HOLDLOCK) WHERE ContractId=@contract;
 IF JSON_QUERY(@data,'$.pending') IS NOT NULL THROW 50902,N'Còn giao dịch xác nhận đang chờ.',1;
 SELECT TOP(1) @source=JSON_VALUE(value,'$.sourceId'),@accepted=TRY_CONVERT(bit,CASE JSON_VALUE(value,'$.accepted') WHEN 'true' THEN 1 ELSE 0 END)
 FROM OPENJSON(@data,'$.versions') ORDER BY TRY_CONVERT(int,[key]) DESC;
 IF JSON_VALUE(@data,'$.state')='accepted' AND @source=@SettlementId AND @accepted=1 RETURN;
 IF dbo.C4_ExceptionAllowed(@data)=1 AND EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WHERE ContractId=@contract
   AND SettlementId=@SettlementId AND PreparedRefund=@refund AND PreparedTopUp=@topup AND ExceptionReason IS NOT NULL AND ContactProof IS NOT NULL) RETURN;
 THROW 50902,N'Chưa có xác nhận đúng bản hoặc hồ sơ xử lý không có xác nhận.',1;
END;
GO
-- All money transitions still leave rooms/beds occupied. Only C4_ReturnKeys releases them.
CREATE OR ALTER PROCEDURE dbo.SP_C4_AdvanceMoney
  @ContractId varchar(6), @SettlementId varchar(6), @Mode varchar(24),
  @Actor varchar(6)=NULL, @Reason nvarchar(2000)=NULL, @ContactProof nvarchar(max)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @customer varchar(6),@branch varchar(6),@return varchar(6),@refund decimal(15,2),@topup decimal(15,2),@data nvarchar(max),@source varchar(6),@state varchar(30);
  SELECT @customer=MaKhachHang FROM dbo.HopDongThue WITH (UPDLOCK,HOLDLOCK) WHERE MaHopDong=@ContractId;
  SELECT @return=p.MaPhieuTra,@refund=d.SoTienHoanThucTe,@topup=d.SoTienKhachPhaiTT
  FROM dbo.DoiSoat d WITH (UPDLOCK,HOLDLOCK) JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra=d.MaPhieuTra
  WHERE d.MaDoiSoat=@SettlementId AND p.MaHopDong=@ContractId AND p.TrangThai<>N'Hủy';
  IF @customer IS NULL OR @return IS NULL THROW 50901,N'Không tìm thấy đối soát của hợp đồng.',1;
  IF EXISTS(SELECT 1 FROM dbo.DoiSoat WITH(UPDLOCK,HOLDLOCK) WHERE MaPhieuTra=@return AND MaDoiSoat>@SettlementId)
    THROW 50902,N'Đã có đối soát mới hơn, cần tải lại hồ sơ.',1;
  IF EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WHERE ContractId=@ContractId AND ClosedAt IS NOT NULL) THROW 50902,N'Hồ sơ đã đóng.',1;
  SELECT @data=Data FROM dbo.AvalancheCase WITH (UPDLOCK,HOLDLOCK) WHERE ContractId=@ContractId;
  SET @state=JSON_VALUE(@data,'$.state');
  SELECT TOP (1) @source=JSON_VALUE(value,'$.sourceId') FROM OPENJSON(@data,'$.versions') ORDER BY TRY_CONVERT(int,[key]) DESC;
  IF @Mode='accepted'
  BEGIN
    IF ISNULL(@state,'')<>'accepted' OR ISNULL(@source,'')<>@SettlementId
      OR JSON_VALUE(@data,'$.pending.hash') IS NOT NULL THROW 50902,N'Chưa có xác nhận đúng đối soát.',1;
  END
  ELSE IF @Mode='without-consent'
  BEGIN
    IF dbo.C4_ExceptionAllowed(@data)<>1 THROW 50902,N'Chưa đủ điều kiện xử lý không có xác nhận.',1;
    IF NULLIF(LTRIM(RTRIM(@Reason)),N'') IS NULL OR ISNULL(ISJSON(@ContactProof),0)<>1
      OR LEN(ISNULL(JSON_VALUE(@ContactProof,'$.sha256'),''))<>64 THROW 50903,N'Cần lý do và chứng từ liên hệ hợp lệ.',1;
    SELECT @branch=n.MaChiNhanh FROM dbo.NhanVien n JOIN dbo.TaiKhoan t ON t.MaNguoiDung=n.MaNhanVien
    WHERE n.MaNhanVien=@Actor AND n.ChucVu=N'Quản lý' AND t.TrangThai=N'Hoạt động';
    IF @branch IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.HopDongThue h JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=h.MaPhieuCoc
       JOIN dbo.Phong p ON p.MaPhong=c.MaPhong WHERE h.MaHopDong=@ContractId AND p.MaChiNhanh=@branch)
      OR EXISTS(SELECT 1 FROM dbo.HopDongThue h JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=h.MaPhieuCoc
       JOIN dbo.Phong p ON p.MaPhong=c.MaPhong WHERE h.MaHopDong=@ContractId AND p.MaChiNhanh<>@branch)
      THROW 50900,N'Chỉ quản lý đúng chi nhánh được xử lý.',1;
  END
  ELSE THROW 50903,N'Loại xử lý không hợp lệ.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WITH(UPDLOCK,HOLDLOCK) WHERE ContractId=@ContractId)
    INSERT dbo.CheckoutLifecycle(ContractId,ReturnId) VALUES(@ContractId,@return);
  IF @Mode='without-consent'
    UPDATE dbo.CheckoutLifecycle SET SettlementId=@SettlementId,ExceptionReason=@Reason,ContactProof=@ContactProof,
      ExceptionPreparedBy=@Actor,PreparedRefund=@refund,PreparedTopUp=@topup WHERE ContractId=@ContractId;
  UPDATE dbo.DoiSoat SET TrangThai=CASE WHEN ISNULL(@refund,0)>0 THEN N'Chờ hoàn cọc'
       WHEN ISNULL(@topup,0)>0 THEN N'Chờ thanh toán thêm' ELSE N'Đã quyết toán' END
  WHERE MaDoiSoat=@SettlementId AND TrangThai IN(N'Chờ xác nhận',N'Chờ phản hồi',N'Cần điều chỉnh');
  UPDATE dbo.PhieuTraPhong SET TrangThai=CASE WHEN ISNULL(@refund,0)>0 THEN N'Chờ hoàn cọc' ELSE N'Chờ ký biên bản' END
  WHERE MaPhieuTra=@return AND TrangThai IN(N'Chờ đối soát',N'Chờ ký biên bản');
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK; THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.SP_C4_Close
 @ContractId varchar(6),@SettlementId varchar(6),@Mode varchar(24),@Bundle nvarchar(max),@SourceDigest varchar(66),
 @ExpectedRefund decimal(15,2),@ExpectedTopUp decimal(15,2),@PaymentReference varchar(500)=NULL,
 @CaseRevision int,@ExpectedRowHash varchar(64),@Actor varchar(6)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @return varchar(6),@refund decimal(15,2),@topup decimal(15,2),@status nvarchar(30),@paid datetime2,@reference varchar(500),
    @data nvarchar(max),@revision int,@source varchar(6),@branch varchar(6);
  IF NOT EXISTS(SELECT 1 FROM dbo.HopDongThue WITH(UPDLOCK,HOLDLOCK) WHERE MaHopDong=@ContractId) THROW 50901,N'Không tìm thấy hợp đồng.',1;
  IF EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WITH(UPDLOCK,HOLDLOCK) WHERE ContractId=@ContractId AND ClosedAt IS NOT NULL)
  BEGIN COMMIT; SELECT CAST(1 AS bit) AS duplicate; RETURN; END;
  SELECT @return=p.MaPhieuTra,@refund=ISNULL(d.SoTienHoanThucTe,0),@topup=ISNULL(d.SoTienKhachPhaiTT,0),@status=d.TrangThai,
    @paid=COALESCE(d.ThoiDiemThanhToan,CONVERT(datetime2,d.NgayThanhToan)),@reference=d.ChungTuThanhToan
  FROM dbo.DoiSoat d WITH(UPDLOCK,HOLDLOCK) JOIN dbo.PhieuTraPhong p WITH(UPDLOCK,HOLDLOCK) ON p.MaPhieuTra=d.MaPhieuTra
  WHERE d.MaDoiSoat=@SettlementId AND p.MaHopDong=@ContractId AND p.TrangThai<>N'Hủy';
  IF @return IS NULL OR @refund<>@ExpectedRefund OR @topup<>@ExpectedTopUp
    OR ISNULL(@reference,'')<>ISNULL(@PaymentReference,'') THROW 50902,N'Đối soát vừa thay đổi, cần kiểm tra lại.',1;
  IF EXISTS(SELECT 1 FROM dbo.DoiSoat WITH(UPDLOCK,HOLDLOCK) WHERE MaPhieuTra=@return AND MaDoiSoat>@SettlementId)
    THROW 50902,N'Đã có đối soát mới hơn, không đóng bằng bản cũ.',1;
  IF @ExpectedRowHash IS NULL OR @ExpectedRowHash<>(SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT d.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)),2) FROM dbo.DoiSoat d WHERE MaDoiSoat=@SettlementId)
    THROW 50902,N'Nội dung đối soát vừa thay đổi, cần đối chiếu lại xác nhận.',1;
  IF @refund<0 OR @topup<0 OR (@refund>0 AND @topup>0) THROW 50903,N'Số tiền không hợp lệ.',1;
  IF (@refund>0 OR @topup>0) AND (@status<>N'Đã quyết toán' OR @paid IS NULL OR NULLIF(@reference,'') IS NULL
    OR LEN(ISNULL(JSON_VALUE(@Bundle,'$.web2.paymentProofs[0].sha256'),''))<>64)
    THROW 50902,N'Chưa đủ tiền hoặc chứng từ, chưa được đóng hợp đồng.',1;
  IF ISNULL(ISJSON(@Bundle),0)<>1 OR ISNULL(JSON_VALUE(@Bundle,'$.web2.contractId'),'')<>@ContractId
    OR ISNULL(JSON_VALUE(@Bundle,'$.web2.settlementId'),'')<>@SettlementId OR ISNULL(JSON_VALUE(@Bundle,'$.web2.mode'),'')<>@Mode
    OR ISNULL(TRY_CONVERT(decimal(15,2),JSON_VALUE(@Bundle,'$.web2.refundDueVnd')),-1)<>@refund
    OR ISNULL(TRY_CONVERT(decimal(15,2),JSON_VALUE(@Bundle,'$.web2.topUpDueVnd')),-1)<>@topup
    THROW 50903,N'Gói bằng chứng không khớp hồ sơ.',1;
  SELECT @data=Data,@revision=Revision FROM dbo.AvalancheCase WITH(UPDLOCK,HOLDLOCK) WHERE ContractId=@ContractId;
  IF @revision IS NULL OR @revision<>@CaseRevision OR JSON_VALUE(@data,'$.pending.hash') IS NOT NULL THROW 50902,N'Hồ sơ xác nhận vừa thay đổi.',1;
  SELECT TOP(1) @source=JSON_VALUE(value,'$.sourceId') FROM OPENJSON(@data,'$.versions') ORDER BY TRY_CONVERT(int,[key]) DESC;
  IF @Mode='accepted'
  BEGIN
   IF ISNULL(JSON_VALUE(@data,'$.state'),'')<>'accepted' OR ISNULL(@source,'')<>@SettlementId THROW 50902,N'Chưa có xác nhận đúng phiên bản.',1;
  END
  ELSE IF @Mode='without-consent'
  BEGIN
   IF dbo.C4_ExceptionAllowed(@data)<>1 THROW 50902,N'Chưa đủ điều kiện không có xác nhận.',1;
   IF NOT EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WHERE ContractId=@ContractId AND SettlementId=@SettlementId
      AND PreparedRefund=@refund AND PreparedTopUp=@topup AND ExceptionReason IS NOT NULL AND ContactProof IS NOT NULL)
      THROW 50902,N'Cần lưu lại lý do/chứng từ cho bản đối soát hiện tại.',1;
   SELECT @branch=n.MaChiNhanh FROM dbo.NhanVien n JOIN dbo.TaiKhoan t ON t.MaNguoiDung=n.MaNhanVien
    WHERE n.MaNhanVien=@Actor AND n.ChucVu=N'Quản lý' AND t.TrangThai=N'Hoạt động';
   IF @branch IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.HopDongThue h JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=h.MaPhieuCoc
      JOIN dbo.Phong p ON p.MaPhong=c.MaPhong WHERE h.MaHopDong=@ContractId AND p.MaChiNhanh=@branch)
     OR EXISTS(SELECT 1 FROM dbo.HopDongThue h JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=h.MaPhieuCoc
      JOIN dbo.Phong p ON p.MaPhong=c.MaPhong WHERE h.MaHopDong=@ContractId AND p.MaChiNhanh<>@branch) THROW 50900,N'Sai quyền hoặc chi nhánh.',1;
  END
  ELSE THROW 50903,N'Loại đóng hồ sơ không hợp lệ.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WHERE ContractId=@ContractId)
    INSERT dbo.CheckoutLifecycle(ContractId,ReturnId) VALUES(@ContractId,@return);
  UPDATE dbo.CheckoutLifecycle SET SettlementId=@SettlementId,Mode=@Mode,ClosedAt=SYSUTCDATETIME(),BundleJson=@Bundle,
    SourceDigest=@SourceDigest,MailStatus='pending' WHERE ContractId=@ContractId;
  UPDATE dbo.HopDongThue SET TrangThai=N'Đã thanh lý' WHERE MaHopDong=@ContractId;
  UPDATE dbo.PhieuTraPhong SET TrangThai=N'Hoàn tất' WHERE MaPhieuTra=@return;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK; THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.SP_C4_ReturnKeys @ContractId varchar(6),@Actor varchar(6)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @branch varchar(6),@return varchar(6),@deposit varchar(6);
  SELECT @branch=n.MaChiNhanh FROM dbo.NhanVien n JOIN dbo.TaiKhoan t ON t.MaNguoiDung=n.MaNhanVien
    WHERE n.MaNhanVien=@Actor AND n.ChucVu=N'Quản lý' AND t.TrangThai=N'Hoạt động';
  SELECT @deposit=MaPhieuCoc FROM dbo.HopDongThue WITH(UPDLOCK,HOLDLOCK) WHERE MaHopDong=@ContractId;
  SELECT TOP(1) @return=MaPhieuTra FROM dbo.PhieuTraPhong WITH(UPDLOCK,HOLDLOCK)
    WHERE MaHopDong=@ContractId AND TrangThai<>N'Hủy' ORDER BY NgayDangKyTra DESC,MaPhieuTra DESC;
  IF @return IS NULL OR @deposit IS NULL THROW 50901,N'Chưa có yêu cầu trả phòng hợp lệ.',1;
  IF @branch IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.ChiTietDatCoc c JOIN dbo.Phong p ON p.MaPhong=c.MaPhong WHERE c.MaPhieuDatCoc=@deposit AND p.MaChiNhanh=@branch)
    OR EXISTS(SELECT 1 FROM dbo.ChiTietDatCoc c JOIN dbo.Phong p ON p.MaPhong=c.MaPhong WHERE c.MaPhieuDatCoc=@deposit AND p.MaChiNhanh<>@branch)
    THROW 50900,N'Chỉ quản lý đúng chi nhánh được thu chìa khóa.',1;
  IF EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WITH(UPDLOCK,HOLDLOCK) WHERE ContractId=@ContractId AND KeysReturnedAt IS NOT NULL)
    BEGIN COMMIT; SELECT CAST(1 AS bit) AS duplicate; RETURN; END;
  IF NOT EXISTS(SELECT 1 FROM dbo.CheckoutLifecycle WHERE ContractId=@ContractId)
    INSERT dbo.CheckoutLifecycle(ContractId,ReturnId) VALUES(@ContractId,@return);
  -- Do not release a bed currently occupied by another contract, even with legacy overlapping data.
  UPDATE g SET TinhTrang=N'Trống' FROM dbo.Giuong g JOIN dbo.ChiTietDatCoc c ON c.MaPhong=g.MaPhong AND (c.MaGiuong IS NULL OR c.MaGiuong=g.MaGiuong)
  WHERE c.MaPhieuDatCoc=@deposit AND NOT EXISTS(
    SELECT 1 FROM dbo.HopDongThue h JOIN dbo.ChiTietDatCoc other ON other.MaPhieuDatCoc=h.MaPhieuCoc
    LEFT JOIN dbo.CheckoutLifecycle life ON life.ContractId=h.MaHopDong
    WHERE h.MaHopDong<>@ContractId AND (h.TrangThai IN(N'Hiệu lực',N'Hết hạn') OR life.ClosedAt IS NOT NULL) AND life.KeysReturnedAt IS NULL
      AND other.MaPhong=g.MaPhong AND (other.MaGiuong IS NULL OR other.MaGiuong=g.MaGiuong));
  UPDATE p SET TinhTrang=CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.Giuong g WHERE g.MaPhong=p.MaPhong AND g.TinhTrang<>N'Trống') THEN N'Trống'
      WHEN NOT EXISTS(SELECT 1 FROM dbo.Giuong g WHERE g.MaPhong=p.MaPhong AND g.TinhTrang=N'Trống') THEN N'Đầy' ELSE N'Còn chỗ' END,
    GioiTinhChoPhep=CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.Giuong g WHERE g.MaPhong=p.MaPhong AND g.TinhTrang<>N'Trống') THEN N'Không phân biệt' ELSE p.GioiTinhChoPhep END
  FROM dbo.Phong p WHERE EXISTS(SELECT 1 FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc=@deposit AND c.MaPhong=p.MaPhong);
  UPDATE dbo.CheckoutLifecycle SET KeysReturnedAt=SYSUTCDATETIME(),KeysReturnedBy=@Actor WHERE ContractId=@ContractId;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK; THROW;
 END CATCH;
END;
GO
