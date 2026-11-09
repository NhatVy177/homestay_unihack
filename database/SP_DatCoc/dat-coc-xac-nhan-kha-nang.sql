USE [HOMEDORM4];
GO

-- =============================================
-- MODULE: DAT COC - XAC NHAN KHA NANG NHAN COC (Nhan vien Quan ly) - DC02
-- =============================================

-- ============================================================
-- SP_DanhSachChoXacNhanCoc
-- Danh sách PhieuDangKy đang chờ Quản lý xác nhận khả năng nhận cọc.
-- ============================================================
IF OBJECT_ID(N'dbo.SP_DanhSachChoXacNhanCoc', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.SP_DanhSachChoXacNhanCoc AS BEGIN SET NOCOUNT ON; RETURN 0; END;');
GO

CREATE OR ALTER PROCEDURE dbo.SP_DanhSachChoXacNhanCoc
    @MaNhanVien VARCHAR(6)
AS
BEGIN
    SET NOCOUNT ON;

    -- Giới hạn theo chi nhánh của Quản lý: chỉ thấy phiếu của phòng thuộc chi nhánh mình.
    DECLARE @MaChiNhanh VARCHAR(6) = (SELECT MaChiNhanh FROM dbo.NhanVien WHERE MaNhanVien = @MaNhanVien);

    SELECT
        pdk.MaDangKy        AS maDangKy,
        nd.HoTen            AS hoTen,
        nd.SDT              AS soDienThoai,
        pdk.NgayDangKy      AS ngayDangKy,
        pdk.TrangThai       AS trangThai,      -- để frontend tô badge + phân nhóm
        pdk.GhiChuSale      AS ghiChuSale,     -- lý do (khi trạng thái = 'Từ chối')
        pdk.MaNhanVienSale  AS maNhanVienSale,
        yc.HinhThucThue    AS hinhThucThue,
        yc.DanhSachGiuong  AS danhSachGiuong,
        yc.GuiLuc          AS guiLuc,
        CASE WHEN yc.GuiLuc IS NULL THEN NULL
          ELSE DATEDIFF(MINUTE,yc.GuiLuc,GETDATE()) END AS phutDaCho,
        CASE WHEN pdk.TrangThai=N'Chờ xác nhận cọc' AND yc.GuiLuc IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM dbo.PhieuDangKy px
            JOIN dbo.YeuCauDatCocChiTiet yx ON yx.MaDangKy=px.MaDangKy
            JOIN dbo.ChiTietXemPhong cx ON cx.MaDangKy=px.MaDangKy AND cx.KhachChon=1
            WHERE px.TrangThai=N'Chờ xác nhận cọc' AND cx.MaPhong=phong.maPhong
              AND (yx.GuiLuc<yc.GuiLuc OR (yx.GuiLuc=yc.GuiLuc AND px.MaDangKy<pdk.MaDangKy)))
          THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS laYeuCauDau,
        (SELECT COUNT(*) FROM dbo.ChiTietXemPhong cx
          JOIN dbo.PhieuDangKy px ON px.MaDangKy=cx.MaDangKy
          WHERE cx.MaPhong=phong.maPhong AND cx.KhachChon=1
            AND px.TrangThai=N'Chờ xác nhận cọc') AS yeuCauCungPhong,
        ndSale.HoTen        AS tenNhanVienSale,
        pdk.SoNam           AS soNam,
        pdk.SoNu            AS soNu,
        pdk.SoNguoiDuKienO  AS soNguoiDuKienO,
        CASE WHEN pdk.SoNam > 0 AND pdk.SoNu > 0 THEN 1 ELSE 0 END AS khacGioi,
        phong.maPhong,
        p.TenPhong          AS tenPhong,
        p.GioiTinhChoPhep   AS gioiTinhChoPhep,
        p.TinhTrang         AS tinhTrangPhong,
        lp.SucChuaToiDa     AS sucChuaToiDa,
        g.soChoTrong        AS soChoTrong,
        g.tongGiuong        AS tongGiuong,
        -- GỢI Ý hình thức cho Quản lý; Kế toán mới chốt thật ở DC03.
        -- Nhóm khác giới buộc nguyên phòng (nam nữ không ghép chung một phòng).
        CASE WHEN pdk.SoNam > 0 AND pdk.SoNu > 0 THEN N'Nguyên phòng' ELSE N'Ghép giường' END AS hinhThucThueDuKien,
        -- Quản lý duyệt ĐÚNG PHÒNG KHÁCH CHỐT (Sale chốt ở DC01), nên các luật dưới đây
        -- xét trên chính phòng đó — không còn xét ở mức chi nhánh.
        CASE
            WHEN pdk.TrangThai <> N'Chờ xác nhận cọc' THEN CAST(NULL AS BIT)
            WHEN phong.maPhong IS NULL THEN CAST(0 AS BIT)
            WHEN yc.HinhThucThue=N'Nguyên phòng' AND g.soChoTrong<g.tongGiuong THEN CAST(0 AS BIT)
            WHEN yc.HinhThucThue=N'Ghép giường' AND pdk.SoNam>0 AND pdk.SoNu>0 THEN CAST(0 AS BIT)
            WHEN yc.HinhThucThue=N'Ghép giường' AND EXISTS (
              SELECT 1 FROM STRING_SPLIT(COALESCE(yc.DanhSachGiuong,N''),N',') b
              LEFT JOIN dbo.Giuong gb ON gb.MaPhong=phong.maPhong AND gb.MaGiuong=TRIM(b.value)
              WHERE gb.MaGiuong IS NULL OR gb.TinhTrang<>N'Trống') THEN CAST(0 AS BIT)
            -- Nhóm khác giới -> nguyên phòng -> phòng phải trống hoàn toàn + đủ sức chứa
            WHEN pdk.SoNam > 0 AND pdk.SoNu > 0 AND g.soChoTrong < g.tongGiuong THEN CAST(0 AS BIT)
            WHEN pdk.SoNam > 0 AND pdk.SoNu > 0 AND pdk.SoNguoiDuKienO > lp.SucChuaToiDa THEN CAST(0 AS BIT)
            -- Nhóm cùng giới -> đủ giường trống + phòng không bị khóa sang giới khác
            WHEN (pdk.SoNam = 0 OR pdk.SoNu = 0) AND pdk.SoNguoiDuKienO > g.soChoTrong THEN CAST(0 AS BIT)
            WHEN (pdk.SoNam = 0 OR pdk.SoNu = 0)
             AND p.GioiTinhChoPhep <> N'Không phân biệt'
             AND p.GioiTinhChoPhep <> CASE WHEN pdk.SoNam > 0 THEN N'Nam' ELSE N'Nữ' END THEN CAST(0 AS BIT)
            ELSE CAST(1 AS BIT)
        END AS coTheNhanCoc,
        CASE
            WHEN pdk.TrangThai <> N'Chờ xác nhận cọc' THEN NULL
            WHEN phong.maPhong IS NULL THEN N'Hồ sơ chưa chốt phòng. Sale cần chọn phòng khách muốn thuê.'
            WHEN yc.HinhThucThue=N'Nguyên phòng' AND g.soChoTrong<g.tongGiuong THEN N'Phòng không còn trống hoàn toàn.'
            WHEN yc.HinhThucThue=N'Ghép giường' AND pdk.SoNam>0 AND pdk.SoNu>0 THEN N'Nhóm khác giới cần thuê nguyên phòng.'
            WHEN yc.HinhThucThue=N'Ghép giường' AND EXISTS (
              SELECT 1 FROM STRING_SPLIT(COALESCE(yc.DanhSachGiuong,N''),N',') b
              LEFT JOIN dbo.Giuong gb ON gb.MaPhong=phong.maPhong AND gb.MaGiuong=TRIM(b.value)
              WHERE gb.MaGiuong IS NULL OR gb.TinhTrang<>N'Trống') THEN N'Giường đã chọn không còn trống.'
            WHEN pdk.SoNam > 0 AND pdk.SoNu > 0 AND g.soChoTrong < g.tongGiuong
                THEN N'Nhóm có cả nam và nữ phải thuê nguyên phòng: phòng chưa hoàn toàn trống.'
            WHEN pdk.SoNam > 0 AND pdk.SoNu > 0 AND pdk.SoNguoiDuKienO > lp.SucChuaToiDa
                THEN N'Số người dự kiến ở vượt quá sức chứa của phòng.'
            WHEN (pdk.SoNam = 0 OR pdk.SoNu = 0) AND pdk.SoNguoiDuKienO > g.soChoTrong
                THEN N'Phòng không đủ chỗ trống cho số người dự kiến ở.'
            WHEN (pdk.SoNam = 0 OR pdk.SoNu = 0)
             AND p.GioiTinhChoPhep <> N'Không phân biệt'
             AND p.GioiTinhChoPhep <> CASE WHEN pdk.SoNam > 0 THEN N'Nam' ELSE N'Nữ' END
                THEN N'Phòng đã được giữ cho giới tính khác, không thể xếp nhóm này.'
            ELSE NULL
        END AS lyDoKhongKhaDung
    FROM dbo.PhieuDangKy AS pdk
    INNER JOIN dbo.KhachHang AS kh ON kh.MaKhachHang = pdk.MaKhachHang
    INNER JOIN dbo.NguoiDung AS nd ON nd.MaNguoiDung  = kh.MaKhachHang
    LEFT JOIN dbo.NguoiDung AS ndSale ON ndSale.MaNguoiDung = pdk.MaNhanVienSale
    LEFT JOIN dbo.YeuCauDatCocChiTiet AS yc ON yc.MaDangKy=pdk.MaDangKy
    -- PHÒNG KHÁCH CHỐT (DC01), không còn TOP 1 phòng đã xem
    OUTER APPLY (
        SELECT TOP 1 ctxp.MaPhong AS maPhong
        FROM dbo.ChiTietXemPhong AS ctxp
        WHERE ctxp.MaDangKy = pdk.MaDangKy AND ctxp.KhachChon = 1
    ) AS phong
    LEFT JOIN dbo.Phong     AS p  ON p.MaPhong      = phong.maPhong
    LEFT JOIN dbo.LoaiPhong AS lp ON lp.MaLoaiPhong = p.MaLoaiPhong
    OUTER APPLY (
        SELECT COUNT(*) AS tongGiuong,
               SUM(CASE WHEN TinhTrang = N'Trống' THEN 1 ELSE 0 END) AS soChoTrong
        FROM dbo.Giuong
        WHERE MaPhong = phong.maPhong
    ) AS g
    -- Gồm phiếu chờ duyệt + đã xử lý (để Quản lý vẫn xem lại sau khi bấm);
    -- việc phân nhóm/đổi chiều sắp xếp do frontend đảm nhận.
    WHERE pdk.TrangThai IN (N'Chờ xác nhận cọc', N'Xác nhận cọc', N'Từ chối')
      AND (p.MaChiNhanh IS NULL OR p.MaChiNhanh = @MaChiNhanh)
    ORDER BY pdk.NgayDangKy DESC, pdk.MaDangKy DESC;
END;
GO

-- ============================================================
-- SP_XacNhanKhaNangNhanCoc
-- Quản lý chấp nhận hoặc từ chối yêu cầu đặt cọc.
-- Khi chấp nhận: SP tự kiểm tra phòng/giường phải còn khả dụng.
-- ============================================================
IF OBJECT_ID(N'dbo.SP_XacNhanKhaNangNhanCoc', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE dbo.SP_XacNhanKhaNangNhanCoc AS BEGIN SET NOCOUNT ON; RETURN 0; END;');
GO

CREATE OR ALTER PROCEDURE dbo.SP_XacNhanKhaNangNhanCoc
    @MaDangKy    VARCHAR(6),
    @MaQuanLy    VARCHAR(6),
    @DuocNhanCoc BIT,
    @LyDo        NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.PhieuDangKy WHERE MaDangKy = @MaDangKy)
        THROW 50204, N'Không tìm thấy phiếu đăng ký.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.PhieuDangKy
        WHERE MaDangKy = @MaDangKy AND TrangThai = N'Chờ xác nhận cọc'
    )
        THROW 50205, N'Phiếu đăng ký không ở trạng thái "Chờ xác nhận cọc".', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien = @MaQuanLy)
        THROW 50206, N'Không tìm thấy nhân viên quản lý.', 1;

    IF @DuocNhanCoc = 0 AND NULLIF(LTRIM(RTRIM(COALESCE(@LyDo, N''))), N'') IS NULL
        THROW 50207, N'Vui lòng nhập lý do từ chối.', 1;

    -- Phòng Sale chốt ở DC01 -- Quản lý duyệt/từ chối ĐÚNG phòng này.
    DECLARE @MaPhong VARCHAR(4);
    SELECT TOP 1 @MaPhong = ctxp.MaPhong
    FROM dbo.ChiTietXemPhong AS ctxp
    WHERE ctxp.MaDangKy = @MaDangKy AND ctxp.KhachChon = 1;

    IF @MaPhong IS NULL
        THROW 50208, N'Hồ sơ chưa chốt phòng. Sale cần chọn phòng khách muốn thuê trước khi duyệt.', 1;

    IF @DuocNhanCoc = 1
    BEGIN
        DECLARE @SoNam INT, @SoNu INT, @SoNguoi INT, @SucChua INT, @SoChoTrong INT, @TongGiuong INT;
        SELECT @SoNam = ISNULL(SoNam, 0), @SoNu = ISNULL(SoNu, 0), @SoNguoi = SoNguoiDuKienO
        FROM dbo.PhieuDangKy WHERE MaDangKy = @MaDangKy;

        SELECT @SucChua = lp.SucChuaToiDa
        FROM dbo.Phong p JOIN dbo.LoaiPhong lp ON lp.MaLoaiPhong = p.MaLoaiPhong
        WHERE p.MaPhong = @MaPhong;

        SELECT @TongGiuong = COUNT(*),
               @SoChoTrong = SUM(CASE WHEN TinhTrang = N'Trống' THEN 1 ELSE 0 END)
        FROM dbo.Giuong WHERE MaPhong = @MaPhong;

        IF @SoNam > 0 AND @SoNu > 0
        BEGIN
            -- Nhóm khác giới: nam nữ không ghép chung phòng -> buộc thuê nguyên phòng
            IF @SoChoTrong < @TongGiuong
                THROW 50209, N'Nhóm có cả nam và nữ phải thuê nguyên phòng: phòng chưa hoàn toàn trống.', 1;
            IF @SoNguoi > @SucChua
                THROW 50209, N'Số người dự kiến ở vượt quá sức chứa của phòng.', 1;
        END
        ELSE
        BEGIN
            -- Nhóm cùng giới: đủ chỗ trống là được (ghép giường hoặc nguyên phòng)
            IF @SoNguoi > @SoChoTrong
                THROW 50209, N'Phòng không đủ chỗ trống cho số người dự kiến ở.', 1;

            -- Phòng đã bị khóa sang giới khác thì không xếp nhóm này được
            DECLARE @GioiTinhPhongXN NVARCHAR(20), @GioiTinhNhomXN NVARCHAR(5);
            SELECT @GioiTinhPhongXN = GioiTinhChoPhep FROM dbo.Phong WHERE MaPhong = @MaPhong;
            SET @GioiTinhNhomXN = CASE WHEN @SoNam > 0 THEN N'Nam' ELSE N'Nữ' END;
            IF @GioiTinhPhongXN <> N'Không phân biệt' AND @GioiTinhPhongXN <> @GioiTinhNhomXN
                THROW 50209, N'Phòng đã được giữ cho giới tính khác, không thể xếp nhóm này.', 1;
        END

        UPDATE dbo.PhieuDangKy
        SET TrangThai = N'Xác nhận cọc'
        WHERE MaDangKy = @MaDangKy;
    END
    ELSE
    BEGIN
        -- ===== TỪ CHỐI (D-026) =====
        -- Từ chối, quá 12 giờ hay hết hạn đều đưa hồ sơ về "Đã tiếp nhận" (hiển thị "Đã xem"):
        -- khách giữ chỗ lại phòng này hoặc phòng khác trong buổi xem. Không còn đánh dấu
        -- từng phòng bị từ chối và không tự đóng hồ sơ; chỉ khách bấm "Không thuê nữa" mới đóng.
        BEGIN TRY
            BEGIN TRAN;

            UPDATE dbo.ChiTietXemPhong
            SET KhachChon = 0
            WHERE MaDangKy = @MaDangKy AND KhachChon = 1;

            UPDATE dbo.PhieuDangKy
            SET TrangThai  = N'Đã tiếp nhận',
                GhiChuSale = @LyDo
            WHERE MaDangKy = @MaDangKy;

            COMMIT TRAN;
        END TRY
        BEGIN CATCH
            IF XACT_STATE() <> 0 ROLLBACK TRAN;
            THROW;
        END CATCH
    END

    SELECT
        pdk.MaDangKy    AS maDangKy,
        nd.HoTen        AS hoTen,
        pdk.TrangThai   AS trangThaiDangKy,
        p.TenPhong      AS tenPhongDuyet,
        -- 1 = hồ sơ đã trả về Sale để chọn phòng khác; 0 = hết phòng, hồ sơ bị từ chối hẳn
        ISNULL(@ConPhongKhac, 0) AS conPhongKhac
    FROM dbo.PhieuDangKy AS pdk
    INNER JOIN dbo.KhachHang AS kh ON kh.MaKhachHang = pdk.MaKhachHang
    INNER JOIN dbo.NguoiDung AS nd ON nd.MaNguoiDung  = kh.MaKhachHang
    INNER JOIN dbo.Phong     AS p  ON p.MaPhong       = @MaPhong
    WHERE pdk.MaDangKy = @MaDangKy;
END;
GO
