-- C3 / D-030 (3): the tenant pays the settlement top-up through the simulated wallet (D-013).
-- Additive: one more PaymentSimOrder purpose, one more DoiSoat payment method, one new procedure.
-- Repeatable. Not a real provider: no money moves. Existing rows are not changed.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @purposeCheck sysname = (
  SELECT TOP (1) name FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.PaymentSimOrder') AND definition LIKE '%Purpose%'
);
IF @purposeCheck IS NOT NULL
BEGIN
  DECLARE @dropPurposeSql nvarchar(max) = N'ALTER TABLE dbo.PaymentSimOrder DROP CONSTRAINT ' + QUOTENAME(@purposeCheck);
  EXEC sys.sp_executesql @dropPurposeSql;
END;
ALTER TABLE dbo.PaymentSimOrder ADD CONSTRAINT CK_PaymentSimOrder_Purpose
  CHECK (Purpose IN ('dat-coc', 'thu-nhan-phong', 'thu-them-doi-soat'));

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.DoiSoat') AND name = 'CHK_DS_PhuongThuc')
  ALTER TABLE dbo.DoiSoat DROP CONSTRAINT CHK_DS_PhuongThuc;
ALTER TABLE dbo.DoiSoat ADD CONSTRAINT CHK_DS_PhuongThuc
  CHECK (PhuongThucThanhToan IN (N'Tiền mặt', N'Chuyển khoản', N'Ví điện tử'));

COMMIT TRANSACTION;
GO

-- Same checks as SP_TraPhong_KeToan_XacNhanThuThem, but the payer is the tenant who owns the contract,
-- the amount must equal the agreed top-up and no accountant is recorded as collector.
CREATE OR ALTER PROCEDURE dbo.SP_TraPhong_ThuThemQuaViMoPhong
    @MaDoiSoat VARCHAR(6),
    @MaKhachHang VARCHAR(6),
    @SoTien DECIMAL(15,2),
    @ChungTuThanhToan VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @TrangThaiDoiSoat NVARCHAR(30), @TrangThaiPhieuTra NVARCHAR(50), @MaPhieuTra VARCHAR(6),
                @SoTienKhachPhaiTT DECIMAL(15,2), @ChuHopDong VARCHAR(6);
        SELECT @TrangThaiDoiSoat = ds.TrangThai, @MaPhieuTra = ds.MaPhieuTra, @SoTienKhachPhaiTT = ds.SoTienKhachPhaiTT,
               @TrangThaiPhieuTra = pt.TrangThai, @ChuHopDong = hd.MaKhachHang
        FROM dbo.DoiSoat ds WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.PhieuTraPhong pt WITH (UPDLOCK, HOLDLOCK) ON pt.MaPhieuTra = ds.MaPhieuTra
        INNER JOIN dbo.HopDongThue hd ON hd.MaHopDong = pt.MaHopDong
        WHERE ds.MaDoiSoat = @MaDoiSoat;

        IF @MaPhieuTra IS NULL OR @ChuHopDong <> @MaKhachHang
            THROW 50704, N'Không tìm thấy phiếu đối soát của bạn.', 1;
        IF @TrangThaiDoiSoat <> N'Chờ thanh toán thêm'
            THROW 50701, N'Phiếu đối soát không còn ở bước chờ thanh toán thêm.', 1;
        IF @TrangThaiPhieuTra <> N'Chờ ký biên bản'
            THROW 50702, N'Phiếu trả phòng không còn ở trạng thái chờ ký biên bản.', 1;
        IF ISNULL(@SoTienKhachPhaiTT, 0) <= 0
            THROW 50700, N'Phiếu đối soát không phát sinh số tiền cần thu thêm.', 1;
        IF @SoTien <> @SoTienKhachPhaiTT
            THROW 50705, N'Số tiền thanh toán không khớp số tiền cần thu thêm.', 1;

        UPDATE dbo.DoiSoat
        SET PhuongThucThanhToan = N'Ví điện tử',
            NgayThanhToan = CAST(SYSDATETIME() AS DATE),
            ChungTuThanhToan = @ChungTuThanhToan,
            TrangThai = N'Đã quyết toán'
        WHERE MaDoiSoat = @MaDoiSoat;

        COMMIT TRANSACTION;
        SELECT @MaDoiSoat AS maDoiSoat, @MaPhieuTra AS maPhieuTra, N'Đã quyết toán' AS trangThaiDoiSoat;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
