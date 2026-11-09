-- D-026 (T-22 phần 1): khách tự gửi "Giữ chỗ" trên web.
-- Chạy sau deposit-flow-20261107.sql và dat-coc-gui-yeu-cau.sql. Chỉ tạo/đổi SP, không đụng dữ liệu.
-- Tái dùng SP_ChonPhongKhachChot (chọn phòng trong các phòng đã xem) và
-- SP_GuiYeuCauCocKemLuaChon (kiểm tra giường, chuyển "Chờ xác nhận cọc"); Sale phụ trách là
-- Sale đã tiếp nhận hồ sơ, khách không cần biết.
CREATE OR ALTER PROCEDURE dbo.SP_KhachGiuCho
  @MaKhachHang varchar(6), @MaDangKy varchar(6), @MaPhong varchar(4),
  @HinhThucThue nvarchar(20), @DanhSachGiuong nvarchar(100) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Sale varchar(6), @ChuHoSo varchar(6), @TrangThai nvarchar(30), @PhongCu varchar(4);
  SELECT @ChuHoSo=MaKhachHang, @Sale=MaNhanVienSale, @TrangThai=TrangThai
  FROM dbo.PhieuDangKy WHERE MaDangKy=@MaDangKy;
  IF @ChuHoSo IS NULL OR @ChuHoSo<>@MaKhachHang
    THROW 50320, N'Không tìm thấy hồ sơ của bạn.', 1;
  IF @TrangThai<>N'Đã tiếp nhận'
    THROW 50202, N'Hồ sơ đã gửi yêu cầu giữ chỗ hoặc chưa được tiếp nhận.', 1;
  IF @Sale IS NULL
    THROW 50321, N'Hồ sơ chưa có nhân viên Sale phụ trách.', 1;

  SELECT TOP (1) @PhongCu=MaPhong FROM dbo.ChiTietXemPhong
  WHERE MaDangKy=@MaDangKy AND KhachChon=1;

  EXEC dbo.SP_ChonPhongKhachChot @MaDangKy=@MaDangKy, @MaPhong=@MaPhong;
  BEGIN TRY
    EXEC dbo.SP_GuiYeuCauCocKemLuaChon @MaDangKy=@MaDangKy, @MaNhanVienSale=@Sale,
      @HinhThucThue=@HinhThucThue, @DanhSachGiuong=@DanhSachGiuong;
  END TRY
  BEGIN CATCH
    -- Gửi không được thì trả lựa chọn phòng về như cũ để không để lại phòng "đã chọn" lửng lơ.
    IF XACT_STATE()<>0 ROLLBACK;
    UPDATE dbo.ChiTietXemPhong SET KhachChon=0
      WHERE MaDangKy=@MaDangKy AND KhachChon=1;
    IF @PhongCu IS NOT NULL
      UPDATE dbo.ChiTietXemPhong SET KhachChon=1
        WHERE MaDangKy=@MaDangKy AND MaPhong=@PhongCu AND KhachChon=0;
    THROW;
  END CATCH;
END;
GO
