-- C5-a / D-026. No existing business rows are changed by this migration.
SET NOCOUNT ON;
DECLARE @check nvarchar(max) = (
  SELECT definition FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.LichXemPhong') AND name = N'CHK_LXP_TrangThai'
);
IF @check IS NULL THROW 50333, N'Không tìm thấy ràng buộc trạng thái lịch xem.', 1;
IF CHARINDEX(N'Khách không đến', @check) = 0
BEGIN
  ALTER TABLE dbo.LichXemPhong DROP CONSTRAINT CHK_LXP_TrangThai;
  DECLARE @ddl nvarchar(max) = N'ALTER TABLE dbo.LichXemPhong WITH CHECK ADD CONSTRAINT CHK_LXP_TrangThai CHECK ('
    + @check + N' OR TrangThai = N''Khách không đến'');';
  EXEC sys.sp_executesql @ddl;
END;
GO
CREATE OR ALTER PROCEDURE dbo.SP_GhiNhanKetQuaBuoiXem
  @MaNhanVien varchar(6), @MaDangKy varchar(6), @STTLich int,
  @KetQua nvarchar(30), @GhiChu nvarchar(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @KetQua IS NULL OR @KetQua NOT IN (N'Đã xem', N'Khách không đến')
    THROW 50333, N'Kết quả buổi xem không hợp lệ.', 1;
  DECLARE @Branch varchar(6);
  SELECT @Branch = n.MaChiNhanh FROM dbo.NhanVien n
  JOIN dbo.TaiKhoan t ON t.MaNguoiDung = n.MaNhanVien AND t.TrangThai = N'Hoạt động'
  WHERE n.MaNhanVien = @MaNhanVien AND n.ChucVu = N'Sale';
  IF @Branch IS NULL THROW 50330, N'Chỉ Sale đang hoạt động được ghi kết quả buổi xem.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @Owner varchar(6), @ProfileStatus nvarchar(30), @Status nvarchar(30), @Time datetime;
    SELECT @Owner = MaNhanVienSale, @ProfileStatus = TrangThai
    FROM dbo.PhieuDangKy WITH (UPDLOCK, HOLDLOCK) WHERE MaDangKy = @MaDangKy;
    SELECT @Status = TrangThai, @Time = ThoiGianHen
    FROM dbo.LichXemPhong WITH (UPDLOCK, HOLDLOCK) WHERE MaDangKy = @MaDangKy AND STTLich = @STTLich;
    IF @Status IS NULL OR @Owner IS NULL OR @Owner <> @MaNhanVien
      THROW 50331, N'Không tìm thấy buổi xem của hồ sơ bạn phụ trách.', 1;
    IF NOT EXISTS (
      SELECT 1 FROM dbo.ChiTietXemPhong c JOIN dbo.Phong p ON p.MaPhong = c.MaPhong
      WHERE c.MaDangKy = @MaDangKy AND c.STTLich = @STTLich AND p.MaChiNhanh = @Branch
    ) OR EXISTS (
      SELECT 1 FROM dbo.ChiTietXemPhong c JOIN dbo.Phong p ON p.MaPhong = c.MaPhong
      WHERE c.MaDangKy = @MaDangKy AND c.STTLich = @STTLich AND p.MaChiNhanh <> @Branch
    ) THROW 50330, N'Không được ghi kết quả buổi xem ngoài chi nhánh.', 1;
    IF @Time > GETDATE() OR @Status NOT IN (N'Chờ xem', N'Yêu cầu đổi lịch', N'Yêu cầu hủy')
      OR @ProfileStatus <> N'Đã tiếp nhận' OR EXISTS (
        SELECT 1 FROM dbo.PhieuDatCoc WITH (UPDLOCK, HOLDLOCK)
        WHERE MaPhieuYeuCauDangKy = @MaDangKy AND TrangThaiCoc <> N'Đã hủy'
      ) THROW 50332, N'Buổi xem chưa đến giờ, đã có kết quả hoặc hồ sơ đã chuyển sang bước cọc.', 1;
    UPDATE dbo.LichXemPhong SET TrangThai = @KetQua,
      GhiChu = COALESCE(NULLIF(LTRIM(RTRIM(@GhiChu)), N''), GhiChu)
    WHERE MaDangKy = @MaDangKy AND STTLich = @STTLich;
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH;
  SELECT MaDangKy AS maDangKy, STTLich AS sttLich, TrangThai AS trangThai
  FROM dbo.LichXemPhong WHERE MaDangKy = @MaDangKy AND STTLich = @STTLich;
END;
GO
