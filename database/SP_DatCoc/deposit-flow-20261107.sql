-- D-023. Run after 20261107_deposit_flow.sql and the existing deposit procedures.
CREATE OR ALTER PROCEDURE dbo.SP_GuiYeuCauCocKemLuaChon
  @MaDangKy varchar(6), @MaNhanVienSale varchar(6),
  @HinhThucThue nvarchar(20), @DanhSachGiuong nvarchar(100) = NULL
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  IF @HinhThucThue NOT IN (N'Nguyên phòng', N'Ghép giường')
    THROW 50301, N'Hình thức thuê không hợp lệ.', 1;
  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien=@MaNhanVienSale AND ChucVu=N'Sale')
    THROW 50302, N'Chỉ Sale được gửi yêu cầu cọc.', 1;
  DECLARE @MaPhong varchar(4)=(SELECT TOP (1) MaPhong FROM dbo.ChiTietXemPhong
    WHERE MaDangKy=@MaDangKy AND KhachChon=1);
  IF @MaPhong IS NULL THROW 50303, N'Chưa chọn phòng đã xem.', 1;
  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien n JOIN dbo.Phong p ON p.MaChiNhanh=n.MaChiNhanh
    WHERE n.MaNhanVien=@MaNhanVienSale AND p.MaPhong=@MaPhong)
    THROW 50315, N'Sale không thuộc chi nhánh của phòng.', 1;
  DECLARE @Giuong TABLE (MaGiuong varchar(3) PRIMARY KEY);
  IF @HinhThucThue=N'Ghép giường'
  BEGIN
    INSERT @Giuong SELECT DISTINCT TRIM(value) FROM STRING_SPLIT(COALESCE(@DanhSachGiuong,N''),N',')
      WHERE TRIM(value)<>N'';
    IF (SELECT COUNT(*) FROM @Giuong)<>(SELECT SoNguoiDuKienO FROM dbo.PhieuDangKy WHERE MaDangKy=@MaDangKy)
      THROW 50304, N'Số giường chọn phải bằng số người dự kiến ở.', 1;
    IF EXISTS (SELECT 1 FROM @Giuong c LEFT JOIN dbo.Giuong g
      ON g.MaPhong=@MaPhong AND g.MaGiuong=c.MaGiuong
      WHERE g.MaGiuong IS NULL OR g.TinhTrang<>N'Trống')
      THROW 50305, N'Giường chọn không còn trống.', 1;
  END
  ELSE SET @DanhSachGiuong=NULL;
  BEGIN TRY
    BEGIN TRAN;
    EXEC dbo.SP_GuiYeuCauDatCoc @MaDangKy=@MaDangKy, @MaNhanVienSale=@MaNhanVienSale;
    IF EXISTS (SELECT 1 FROM dbo.YeuCauDatCocChiTiet WHERE MaDangKy=@MaDangKy)
      UPDATE dbo.YeuCauDatCocChiTiet SET MaNhanVienSale=@MaNhanVienSale,
        HinhThucThue=@HinhThucThue, MaPhong=@MaPhong,
        DanhSachGiuong=@DanhSachGiuong, GuiLuc=GETDATE()
      WHERE MaDangKy=@MaDangKy;
    ELSE
      INSERT dbo.YeuCauDatCocChiTiet(MaDangKy,MaNhanVienSale,HinhThucThue,MaPhong,DanhSachGiuong,GuiLuc)
      VALUES(@MaDangKy,@MaNhanVienSale,@HinhThucThue,@MaPhong,@DanhSachGiuong,GETDATE());
    COMMIT;
  END TRY
  BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
  END CATCH;
  SELECT p.MaDangKy AS maDangKy,p.TrangThai AS trangThaiDangKy,
    y.HinhThucThue AS hinhThucThue,y.DanhSachGiuong AS danhSachGiuong,y.GuiLuc AS guiLuc
  FROM dbo.PhieuDangKy p JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
  WHERE p.MaDangKy=@MaDangKy;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_DuyetVaPhatHanhPhieuCoc
  @MaDangKy varchar(6), @MaQuanLy varchar(6), @LyDoVuotLuot nvarchar(500) = NULL
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien=@MaQuanLy AND ChucVu=N'Quản lý')
    THROW 50306, N'Chỉ quản lý được duyệt yêu cầu cọc.', 1;
  DECLARE @Rejected TABLE (MaDangKy varchar(6) PRIMARY KEY, LyDo nvarchar(1000));
  DECLARE @MaPhong varchar(4), @Sale varchar(6), @HinhThuc nvarchar(20), @Giuong nvarchar(100),
    @GuiLuc datetime2, @LockResult int, @Phieu varchar(6), @RoomLock varchar(30),
    @AutoReason nvarchar(1000);
  BEGIN TRY
    BEGIN TRAN;
    SELECT @MaPhong=c.MaPhong, @Sale=y.MaNhanVienSale, @HinhThuc=y.HinhThucThue,
      @Giuong=y.DanhSachGiuong, @GuiLuc=y.GuiLuc
    FROM dbo.PhieuDangKy p WITH (UPDLOCK,HOLDLOCK)
    JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
    JOIN dbo.ChiTietXemPhong c ON c.MaDangKy=p.MaDangKy AND c.KhachChon=1
    WHERE p.MaDangKy=@MaDangKy AND p.TrangThai=N'Chờ xác nhận cọc';
    IF @MaPhong IS NULL THROW 50307, N'Yêu cầu cọc không còn chờ duyệt hoặc thiếu lựa chọn.', 1;
    SET @RoomLock=CONCAT('deposit-room:',@MaPhong);
    EXEC @LockResult=sys.sp_getapplock @Resource=@RoomLock,
      @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
    IF @LockResult<0 THROW 50308, N'Phòng đang được xử lý, vui lòng thử lại.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien n JOIN dbo.Phong p ON p.MaChiNhanh=n.MaChiNhanh
      WHERE n.MaNhanVien=@MaQuanLy AND p.MaPhong=@MaPhong)
      THROW 50313, N'Quản lý không thuộc chi nhánh của phòng.', 1;
    IF EXISTS (SELECT 1 FROM dbo.PhieuDangKy p
      JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
      JOIN dbo.ChiTietXemPhong c ON c.MaDangKy=p.MaDangKy AND c.KhachChon=1
      WHERE p.TrangThai=N'Chờ xác nhận cọc' AND c.MaPhong=@MaPhong AND p.MaDangKy<>@MaDangKy
        AND (y.GuiLuc<@GuiLuc OR (y.GuiLuc=@GuiLuc AND p.MaDangKy<@MaDangKy)))
      AND NULLIF(TRIM(COALESCE(@LyDoVuotLuot,N'')),N'') IS NULL
      THROW 50312, N'Yêu cầu này không gửi trước trong phòng. Hãy nhập lý do duyệt vượt lượt.', 1;
    SET @AutoReason=N'Phòng/giường đã được đặt cọc cho khách khác';
    IF NULLIF(TRIM(COALESCE(@LyDoVuotLuot,N'')),N'') IS NOT NULL
      SET @AutoReason=CONCAT(@AutoReason,N'. Lý do quản lý duyệt yêu cầu sau: ',TRIM(@LyDoVuotLuot));
    EXEC @LockResult=sys.sp_getapplock @Resource='deposit-number',
      @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
    IF @LockResult<0 THROW 50308, N'Hệ thống đang tạo phiếu khác, vui lòng thử lại.', 1;
    -- The old procedures use nested transactions; the outer transaction controls all three.
    EXEC dbo.SP_XacNhanKhaNangNhanCoc @MaDangKy=@MaDangKy,@MaQuanLy=@MaQuanLy,
      @DuocNhanCoc=1,@LyDo=NULL;
    EXEC dbo.SP_LapPhieuDatCoc @MaDangKy=@MaDangKy,@MaNhanVienSale=@Sale,
      @HinhThucThue=@HinhThuc,@DanhSachGiuong=@Giuong;
    SELECT TOP (1) @Phieu=MaPhieuDatCoc FROM dbo.PhieuDatCoc
      WHERE MaPhieuYeuCauDangKy=@MaDangKy AND TrangThaiCoc=N'Hiệu lực'
      ORDER BY ThoiDiemDatCoc DESC,MaPhieuDatCoc DESC;
    IF @Phieu IS NULL THROW 50309, N'Không tạo được phiếu cọc.', 1;
    EXEC dbo.SP_ChotPhieuDatCoc @MaPhieuDatCoc=@Phieu,@MaNhanVienKeToan='NVAUTO',
      @Chot=1,@LyDo=NULL;

    -- Refuse only requests which can no longer be served under the same room/bed rules.
    DECLARE @Other varchar(6), @OtherType nvarchar(20), @OtherBeds nvarchar(100),
      @People int,@Men int,@Women int,@Free int,@Total int,@Capacity int,@RoomGender nvarchar(20),@Conflict bit;
    DECLARE others CURSOR LOCAL FAST_FORWARD FOR
      SELECT p.MaDangKy,y.HinhThucThue,y.DanhSachGiuong,p.SoNguoiDuKienO,p.SoNam,p.SoNu
      FROM dbo.PhieuDangKy p JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
      JOIN dbo.ChiTietXemPhong c ON c.MaDangKy=p.MaDangKy AND c.KhachChon=1
      WHERE p.TrangThai=N'Chờ xác nhận cọc' AND c.MaPhong=@MaPhong AND p.MaDangKy<>@MaDangKy;
    OPEN others;
    FETCH NEXT FROM others INTO @Other,@OtherType,@OtherBeds,@People,@Men,@Women;
    WHILE @@FETCH_STATUS=0
    BEGIN
      SELECT @Free=SUM(CASE WHEN TinhTrang=N'Trống' THEN 1 ELSE 0 END),@Total=COUNT(*)
      FROM dbo.Giuong WHERE MaPhong=@MaPhong;
      SELECT @Capacity=lp.SucChuaToiDa,@RoomGender=p.GioiTinhChoPhep
      FROM dbo.Phong p JOIN dbo.LoaiPhong lp ON lp.MaLoaiPhong=p.MaLoaiPhong WHERE p.MaPhong=@MaPhong;
      SET @Conflict=0;
      IF @OtherType=N'Nguyên phòng' AND (@Free<@Total OR @People>@Capacity) SET @Conflict=1;
      IF @OtherType=N'Ghép giường' AND
        (@Men>0 AND @Women>0 OR @People>@Free OR
         (@RoomGender<>N'Không phân biệt' AND @RoomGender<>CASE WHEN @Men>0 THEN N'Nam' ELSE N'Nữ' END) OR
         EXISTS (SELECT 1 FROM STRING_SPLIT(COALESCE(@OtherBeds,N''),N',') b
           LEFT JOIN dbo.Giuong g ON g.MaPhong=@MaPhong AND g.MaGiuong=TRIM(b.value)
           WHERE g.MaGiuong IS NULL OR g.TinhTrang<>N'Trống')) SET @Conflict=1;
      IF @Conflict=1
      BEGIN
        EXEC dbo.SP_XacNhanKhaNangNhanCoc @MaDangKy=@Other,@MaQuanLy=@MaQuanLy,
          @DuocNhanCoc=0,@LyDo=@AutoReason;
        INSERT @Rejected VALUES (@Other,@AutoReason);
      END
      FETCH NEXT FROM others INTO @Other,@OtherType,@OtherBeds,@People,@Men,@Women;
    END
    CLOSE others; DEALLOCATE others;
    COMMIT;
  END TRY
  BEGIN CATCH
    IF CURSOR_STATUS('local','others')>=0 CLOSE others;
    IF CURSOR_STATUS('local','others')>=-1 DEALLOCATE others;
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
  END CATCH;
  SELECT @Phieu AS maPhieuDatCoc,@MaDangKy AS maDangKy,
    p.SoTienCoc AS soTienCoc,p.ThoiHanThanhToan AS thoiHanThanhToan
  FROM dbo.PhieuDatCoc p WHERE p.MaPhieuDatCoc=@Phieu;
  SELECT MaDangKy AS maDangKy,LyDo AS lyDo FROM @Rejected;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_TuChoiYeuCauCocQuaHan
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  DECLARE @Ids TABLE (MaDangKy varchar(6) PRIMARY KEY);
  DECLARE @Failed TABLE (MaDangKy varchar(6) PRIMARY KEY, ErrorNumber int, ErrorMessage nvarchar(2048));
  DECLARE @Candidates TABLE (MaDangKy varchar(6) PRIMARY KEY, GuiLuc datetime2);
  DECLARE @Tried TABLE (MaDangKy varchar(6) PRIMARY KEY);
  INSERT @Candidates(MaDangKy,GuiLuc)
    SELECT p.MaDangKy,y.GuiLuc FROM dbo.PhieuDangKy p
    JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
    WHERE p.TrangThai=N'Chờ xác nhận cọc' AND y.GuiLuc<=DATEADD(HOUR,-12,GETDATE());
  DECLARE @Ma varchar(6);
  WHILE EXISTS (SELECT 1 FROM @Candidates c WHERE NOT EXISTS
    (SELECT 1 FROM @Tried t WHERE t.MaDangKy=c.MaDangKy))
  BEGIN
    SELECT TOP (1) @Ma=c.MaDangKy FROM @Candidates c
      WHERE NOT EXISTS (SELECT 1 FROM @Tried t WHERE t.MaDangKy=c.MaDangKy)
      ORDER BY c.GuiLuc,c.MaDangKy;
    INSERT @Tried VALUES(@Ma);
    BEGIN TRY
      BEGIN TRAN;
      IF EXISTS (SELECT 1 FROM dbo.PhieuDangKy p WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
        WHERE p.MaDangKy=@Ma AND p.TrangThai=N'Chờ xác nhận cọc'
          AND y.GuiLuc<=DATEADD(HOUR,-12,GETDATE()))
      BEGIN
        EXEC dbo.SP_XacNhanKhaNangNhanCoc @MaDangKy=@Ma,@MaQuanLy='NVAUTO',
          @DuocNhanCoc=0,@LyDo=N'Quản lý chưa xử lý trong 12 giờ';
        INSERT @Ids VALUES(@Ma);
      END
      COMMIT;
    END TRY
    BEGIN CATCH
      IF XACT_STATE()<>0 ROLLBACK;
      INSERT @Failed VALUES(@Ma,ERROR_NUMBER(),ERROR_MESSAGE());
    END CATCH;
  END
  SELECT MaDangKy AS maDangKy,N'rejected' AS outcome,
    CAST(NULL AS int) AS errorNumber,CAST(NULL AS nvarchar(2048)) AS errorMessage FROM @Ids
  UNION ALL
  SELECT MaDangKy AS maDangKy,N'failed' AS outcome,ErrorNumber AS errorNumber,
    ErrorMessage AS errorMessage FROM @Failed;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_GhiNhanNopQuyCoc
  @MaPhieu varchar(6),@MaKeToan varchar(6)
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien=@MaKeToan AND ChucVu=N'Kế toán')
    THROW 50310,N'Chỉ kế toán được xác nhận nộp quỹ.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.PhieuDatCoc WHERE MaPhieuDatCoc=@MaPhieu
    AND PhuongThucThanhToan=N'Tiền mặt' AND TrangThaiThanhToan=N'Đã TT')
    THROW 50311,N'Phiếu chưa thu tiền mặt.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien nv
    JOIN dbo.Phong p ON p.MaChiNhanh=nv.MaChiNhanh
    JOIN dbo.ChiTietDatCoc c ON c.MaPhong=p.MaPhong
    WHERE nv.MaNhanVien=@MaKeToan AND c.MaPhieuDatCoc=@MaPhieu)
    THROW 50314,N'Phiếu không thuộc chi nhánh của kế toán.',1;
  UPDATE dbo.PhieuDatCoc SET DaNopQuy=1,NopQuyLuc=GETDATE(),MaKeToanNopQuy=@MaKeToan
  WHERE MaPhieuDatCoc=@MaPhieu AND DaNopQuy=0;
  SELECT MaPhieuDatCoc AS maPhieuDatCoc,DaNopQuy AS daNopQuy,NopQuyLuc AS nopQuyLuc
  FROM dbo.PhieuDatCoc WHERE MaPhieuDatCoc=@MaPhieu;
END;
GO
