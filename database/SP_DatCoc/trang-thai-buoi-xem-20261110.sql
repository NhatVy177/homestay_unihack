-- D-026 (T-22 phần 1): trạng thái buổi xem + nút "Không thuê nữa".
-- Đổi ràng buộc trạng thái LichXemPhong (thêm "Khách không đến") và tạo 2 SP. Không đổi dữ liệu có sẵn.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CHK_LXP_TrangThai'
  AND definition LIKE N'%Khách không đến%')
BEGIN
  IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CHK_LXP_TrangThai')
    ALTER TABLE dbo.LichXemPhong DROP CONSTRAINT CHK_LXP_TrangThai;
  ALTER TABLE dbo.LichXemPhong WITH CHECK ADD CONSTRAINT CHK_LXP_TrangThai CHECK (TrangThai IN
    (N'Chờ xem', N'Đã xem', N'Đã hủy', N'Yêu cầu đổi lịch', N'Yêu cầu hủy', N'Khách không đến'));
END
GO

-- Sale ghi nhận khách không đến buổi xem (sau giờ hẹn). Đã xem thì hệ thống tự đặt theo giờ.
CREATE OR ALTER PROCEDURE dbo.SP_GhiNhanKhachKhongDen
  @MaNhanVien varchar(6), @MaDangKy varchar(6), @STTLich int
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien=@MaNhanVien AND ChucVu=N'Sale')
    THROW 50322, N'Chỉ Sale được ghi nhận khách không đến.', 1;
  IF NOT EXISTS (SELECT 1 FROM dbo.LichXemPhong l JOIN dbo.PhieuDangKy p ON p.MaDangKy=l.MaDangKy
    WHERE l.MaDangKy=@MaDangKy AND l.STTLich=@STTLich AND p.MaNhanVienSale=@MaNhanVien)
    THROW 50323, N'Không tìm thấy buổi xem của hồ sơ bạn phụ trách.', 1;
  IF NOT EXISTS (SELECT 1 FROM dbo.LichXemPhong
    WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich
      AND TrangThai IN (N'Chờ xem', N'Yêu cầu đổi lịch', N'Yêu cầu hủy') AND ThoiGianHen<=GETDATE())
    THROW 50324, N'Buổi xem chưa đến giờ hoặc đã có kết quả.', 1;
  UPDATE dbo.LichXemPhong SET TrangThai=N'Khách không đến'
    WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich;
  SELECT MaDangKy AS maDangKy, STTLich AS sttLich, TrangThai AS trangThai
  FROM dbo.LichXemPhong WHERE MaDangKy=@MaDangKy AND STTLich=@STTLich;
END;
GO

-- Khách bấm "Không thuê nữa": đóng hồ sơ (chỉ cách này mới đóng hồ sơ sau buổi xem).
CREATE OR ALTER PROCEDURE dbo.SP_KhachKhongThueNua
  @MaKhachHang varchar(6), @MaDangKy varchar(6)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Chu varchar(6), @TrangThai nvarchar(30);
  SELECT @Chu=MaKhachHang, @TrangThai=TrangThai FROM dbo.PhieuDangKy WHERE MaDangKy=@MaDangKy;
  IF @Chu IS NULL OR @Chu<>@MaKhachHang THROW 50320, N'Không tìm thấy hồ sơ của bạn.', 1;
  IF @TrangThai<>N'Đã tiếp nhận'
    THROW 50325, N'Chỉ đóng được hồ sơ đang ở trạng thái đã tiếp nhận (chưa gửi giữ chỗ).', 1;
  UPDATE dbo.PhieuDangKy SET TrangThai=N'Từ chối', GhiChuSale=N'Khách không thuê nữa'
    WHERE MaDangKy=@MaDangKy;
  SELECT MaDangKy AS maDangKy, TrangThai AS trangThaiDangKy FROM dbo.PhieuDangKy WHERE MaDangKy=@MaDangKy;
END;
GO
