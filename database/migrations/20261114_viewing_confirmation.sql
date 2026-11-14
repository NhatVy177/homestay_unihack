-- D-045: metadata only; never invents historical consent.
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.LichXemPhong', N'U') IS NULL THROW 50400, N'Không tìm thấy bảng lịch xem phòng.', 1;
IF COL_LENGTH(N'dbo.LichXemPhong', N'PhienBanLich') IS NULL
  ALTER TABLE dbo.LichXemPhong ADD PhienBanLich int NOT NULL CONSTRAINT DF_LXP_PhienBan DEFAULT (1) WITH VALUES;
IF COL_LENGTH(N'dbo.LichXemPhong', N'KhachXacNhanPhienBan') IS NULL
  ALTER TABLE dbo.LichXemPhong ADD KhachXacNhanPhienBan int NULL;
IF COL_LENGTH(N'dbo.LichXemPhong', N'ThoiGianKhachXacNhan') IS NULL
  ALTER TABLE dbo.LichXemPhong ADD ThoiGianKhachXacNhan datetime2(3) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.LichXemPhong') AND name=N'CHK_LXP_XacNhanPhienBan')
  ALTER TABLE dbo.LichXemPhong WITH CHECK ADD CONSTRAINT CHK_LXP_XacNhanPhienBan CHECK (
    PhienBanLich > 0 AND ((KhachXacNhanPhienBan IS NULL AND ThoiGianKhachXacNhan IS NULL)
      OR (KhachXacNhanPhienBan IS NOT NULL AND KhachXacNhanPhienBan = PhienBanLich AND ThoiGianKhachXacNhan IS NOT NULL)));
GO
CREATE OR ALTER TRIGGER dbo.TR_LichXemPhong_DoiGioXacNhan
ON dbo.LichXemPhong AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF NOT UPDATE(ThoiGianHen) RETURN;
  UPDATE target SET PhienBanLich = target.PhienBanLich + 1,
    KhachXacNhanPhienBan = NULL, ThoiGianKhachXacNhan = NULL
  FROM dbo.LichXemPhong target
  JOIN inserted i ON i.MaDangKy=target.MaDangKy AND i.STTLich=target.STTLich
  JOIN deleted d ON d.MaDangKy=i.MaDangKy AND d.STTLich=i.STTLich
  WHERE i.ThoiGianHen <> d.ThoiGianHen
    OR (i.ThoiGianHen IS NULL AND d.ThoiGianHen IS NOT NULL)
    OR (i.ThoiGianHen IS NOT NULL AND d.ThoiGianHen IS NULL);
END;
GO
CREATE OR ALTER PROCEDURE dbo.SP_KhachXacNhanLichXem
  @MaKhachHang varchar(6), @MaDangKy varchar(6), @STTLich int, @PhienBanLich int
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @Owner varchar(6), @ProfileStatus nvarchar(30), @Status nvarchar(30), @Version int;
    SELECT @Owner=MaKhachHang, @ProfileStatus=TrangThai FROM dbo.PhieuDangKy WITH (UPDLOCK,HOLDLOCK) WHERE MaDangKy=@MaDangKy;
    IF @Owner IS NULL OR @Owner<>@MaKhachHang OR NOT EXISTS (
      SELECT 1 FROM dbo.TaiKhoan WHERE MaNguoiDung=@MaKhachHang AND TrangThai=N'Hoạt động'
    ) THROW 50401, N'Không tìm thấy lịch xem phòng của bạn.', 1;
    SELECT @Status=TrangThai, @Version=PhienBanLich FROM dbo.LichXemPhong WITH (UPDLOCK,HOLDLOCK) WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich;
    IF @Status IS NULL THROW 50401, N'Không tìm thấy lịch xem phòng của bạn.', 1;
    IF @Version<>@PhienBanLich THROW 50402, N'Lịch đã thay đổi. Vui lòng tải lại và xác nhận ngày giờ mới.', 1;
    IF @Status<>N'Chờ xem' OR @ProfileStatus<>N'Đã tiếp nhận'
      THROW 50402, N'Lịch không còn ở trạng thái chờ xem để xác nhận.', 1;
    UPDATE dbo.LichXemPhong SET KhachXacNhanPhienBan=@Version,
      ThoiGianKhachXacNhan=COALESCE(ThoiGianKhachXacNhan,SYSUTCDATETIME())
      WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich;
    SELECT CONCAT(MaDangKy,'-',STTLich) AS id, PhienBanLich AS phienBanLich,
      ThoiGianKhachXacNhan AS thoiGianKhachXacNhan, CAST(1 AS bit) AS khachDaXacNhanLich,
      CAST(1 AS bit) AS xacNhanLichSanSang FROM dbo.LichXemPhong WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich;
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH;
END;
GO
