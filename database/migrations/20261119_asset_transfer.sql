/* D-076 / F-24: kho va dieu phoi tai san theo chi nhanh.
   File chay lai duoc; khong sua du lieu TaiSan/hop dong hien co.
   Khi chuyen het khoi phong, giu dong TaiSan voi SoLuong = 0 de bao toan FK lich su. */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- Demo databases created before the Admin asset module do not yet have these
-- two columns. Keep this migration independently repeatable without changing
-- any existing asset quantity or room assignment.
IF COL_LENGTH('dbo.TaiSan', 'LoaiTaiSan') IS NULL
BEGIN
    ALTER TABLE dbo.TaiSan
        ADD LoaiTaiSan NVARCHAR(20) NOT NULL
            CONSTRAINT DF_TaiSan_LoaiTaiSan DEFAULT N'Chung';
END;
GO

IF COL_LENGTH('dbo.TaiSan', 'MaGiuong') IS NULL
    ALTER TABLE dbo.TaiSan ADD MaGiuong VARCHAR(3) NULL;
GO

IF OBJECT_ID(N'dbo.KhoTaiSanChiNhanh', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KhoTaiSanChiNhanh (
        MaChiNhanh       VARCHAR(6)      NOT NULL,
        MaTaiSan         VARCHAR(6)      NOT NULL,
        TenTaiSan        NVARCHAR(100)   NOT NULL,
        DonGia           DECIMAL(15,2)   NULL,
        SoLuongDungDuoc  INT             NOT NULL CONSTRAINT DF_KhoTaiSan_DungDuoc DEFAULT 0,
        SoLuongChoSua    INT             NOT NULL CONSTRAINT DF_KhoTaiSan_ChoSua DEFAULT 0,
        CapNhatLuc       DATETIME2(0)    NOT NULL CONSTRAINT DF_KhoTaiSan_CapNhat DEFAULT SYSDATETIME(),
        CONSTRAINT PK_KhoTaiSanChiNhanh PRIMARY KEY (MaChiNhanh, MaTaiSan),
        CONSTRAINT FK_KhoTaiSan_ChiNhanh FOREIGN KEY (MaChiNhanh) REFERENCES dbo.ChiNhanh(MaChiNhanh),
        CONSTRAINT CK_KhoTaiSan_SoLuong CHECK (SoLuongDungDuoc >= 0 AND SoLuongChoSua >= 0),
        CONSTRAINT CK_KhoTaiSan_DonGia CHECK (DonGia IS NULL OR DonGia >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Seq_DieuChuyenTaiSan', N'SO') IS NULL
    EXEC(N'CREATE SEQUENCE dbo.Seq_DieuChuyenTaiSan AS BIGINT START WITH 1 INCREMENT BY 1;');
GO

IF OBJECT_ID(N'dbo.PhieuDieuChuyenTaiSan', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PhieuDieuChuyenTaiSan (
        MaPhieu        VARCHAR(12)     NOT NULL,
        MaChiNhanh     VARCHAR(6)      NOT NULL,
        LoaiThaoTac    NVARCHAR(30)    NOT NULL,
        LoaiNguon      NVARCHAR(20)    NOT NULL,
        MaPhongNguon   VARCHAR(4)      NULL,
        LoaiDich       NVARCHAR(20)    NOT NULL,
        MaPhongDich    VARCHAR(4)      NULL,
        MaTaiSan       VARCHAR(6)      NOT NULL,
        TenTaiSan      NVARCHAR(100)   NOT NULL,
        SoLuong        INT             NOT NULL,
        LyDo            NVARCHAR(500)   NOT NULL,
        MaNhanVien     VARCHAR(6)      NOT NULL,
        ThoiDiem       DATETIME2(0)    NOT NULL CONSTRAINT DF_PhieuDCTS_ThoiDiem DEFAULT SYSDATETIME(),
        CONSTRAINT PK_PhieuDieuChuyenTaiSan PRIMARY KEY (MaPhieu),
        CONSTRAINT FK_PhieuDCTS_ChiNhanh FOREIGN KEY (MaChiNhanh) REFERENCES dbo.ChiNhanh(MaChiNhanh),
        CONSTRAINT FK_PhieuDCTS_NhanVien FOREIGN KEY (MaNhanVien) REFERENCES dbo.NhanVien(MaNhanVien),
        CONSTRAINT FK_PhieuDCTS_PhongNguon FOREIGN KEY (MaPhongNguon) REFERENCES dbo.Phong(MaPhong),
        CONSTRAINT FK_PhieuDCTS_PhongDich FOREIGN KEY (MaPhongDich) REFERENCES dbo.Phong(MaPhong),
        CONSTRAINT CK_PhieuDCTS_SoLuong CHECK (SoLuong > 0),
        CONSTRAINT CK_PhieuDCTS_Loai CHECK (
            LoaiThaoTac IN (N'PHONG_KHO', N'KHO_PHONG', N'PHONG_PHONG', N'DUNGDUOC_CHO_SUA', N'CHOSUA_DUNGDUOC', N'CHOSUA_THANHLY')
            AND LoaiNguon IN (N'Phòng', N'Kho dùng được', N'Kho chờ sửa')
            AND LoaiDich IN (N'Phòng', N'Kho dùng được', N'Kho chờ sửa', N'Thanh lý')
        )
    );
    CREATE INDEX IX_PhieuDCTS_TraCuu
        ON dbo.PhieuDieuChuyenTaiSan (MaChiNhanh, MaTaiSan, ThoiDiem DESC);
    CREATE INDEX IX_PhieuDCTS_PhongNguon
        ON dbo.PhieuDieuChuyenTaiSan (MaPhongNguon, ThoiDiem DESC) WHERE MaPhongNguon IS NOT NULL;
    CREATE INDEX IX_PhieuDCTS_PhongDich
        ON dbo.PhieuDieuChuyenTaiSan (MaPhongDich, ThoiDiem DESC) WHERE MaPhongDich IS NOT NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_DieuPhoiTaiSan_Chuyen
    @MaChiNhanh   VARCHAR(6),
    @LoaiThaoTac  NVARCHAR(30),
    @MaPhongNguon VARCHAR(4) = NULL,
    @MaPhongDich  VARCHAR(4) = NULL,
    @MaTaiSan     VARCHAR(6),
    @SoLuong      INT,
    @LyDo         NVARCHAR(500),
    @MaNhanVien   VARCHAR(6)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @MaChiNhanh = NULLIF(LTRIM(RTRIM(@MaChiNhanh)), '');
    SET @LoaiThaoTac = UPPER(NULLIF(LTRIM(RTRIM(@LoaiThaoTac)), N''));
    SET @MaPhongNguon = NULLIF(LTRIM(RTRIM(@MaPhongNguon)), '');
    SET @MaPhongDich = NULLIF(LTRIM(RTRIM(@MaPhongDich)), '');
    SET @MaTaiSan = NULLIF(LTRIM(RTRIM(@MaTaiSan)), '');
    SET @LyDo = NULLIF(LTRIM(RTRIM(@LyDo)), N'');
    SET @MaNhanVien = NULLIF(LTRIM(RTRIM(@MaNhanVien)), '');

    IF @LoaiThaoTac NOT IN (N'PHONG_KHO', N'KHO_PHONG', N'PHONG_PHONG', N'DUNGDUOC_CHO_SUA', N'CHOSUA_DUNGDUOC', N'CHOSUA_THANHLY')
        THROW 51401, N'Loại điều chuyển không hợp lệ.', 1;
    IF @SoLuong IS NULL OR @SoLuong <= 0
        THROW 51402, N'Số lượng điều chuyển phải lớn hơn 0.', 1;
    IF @LyDo IS NULL
        THROW 51403, N'Vui lòng nhập lý do điều chuyển.', 1;
    IF @MaTaiSan IS NULL
        THROW 51404, N'Vui lòng chọn tài sản.', 1;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.NhanVien
        WHERE MaNhanVien = @MaNhanVien AND MaChiNhanh = @MaChiNhanh AND ChucVu = N'Quản lý'
    )
        THROW 51405, N'Quản lý chỉ được điều chuyển tài sản trong chi nhánh của mình.', 1;

    DECLARE @CanPhongNguon BIT = IIF(@LoaiThaoTac IN (N'PHONG_KHO', N'PHONG_PHONG'), 1, 0);
    DECLARE @CanPhongDich BIT = IIF(@LoaiThaoTac IN (N'KHO_PHONG', N'PHONG_PHONG'), 1, 0);
    IF @CanPhongNguon = 1 AND @MaPhongNguon IS NULL
        THROW 51406, N'Vui lòng chọn phòng nguồn.', 1;
    IF @CanPhongDich = 1 AND @MaPhongDich IS NULL
        THROW 51407, N'Vui lòng chọn phòng đích.', 1;
    IF @LoaiThaoTac = N'PHONG_PHONG' AND @MaPhongNguon = @MaPhongDich
        THROW 51408, N'Phòng nguồn và phòng đích phải khác nhau.', 1;
    IF @CanPhongNguon = 1 AND NOT EXISTS (
        SELECT 1 FROM dbo.Phong WHERE MaPhong = @MaPhongNguon AND MaChiNhanh = @MaChiNhanh
    )
        THROW 51409, N'Phòng nguồn không thuộc chi nhánh của quản lý.', 1;
    IF @CanPhongDich = 1 AND NOT EXISTS (
        SELECT 1 FROM dbo.Phong WHERE MaPhong = @MaPhongDich AND MaChiNhanh = @MaChiNhanh
    )
        THROW 51410, N'Phòng đích không thuộc chi nhánh của quản lý.', 1;

    IF (@CanPhongNguon = 1 AND EXISTS (
            SELECT 1
            FROM dbo.ChiTietDatCoc ctdc
            JOIN dbo.HopDongThue hd ON hd.MaPhieuCoc = ctdc.MaPhieuDatCoc
            WHERE ctdc.MaPhong = @MaPhongNguon AND hd.TrangThai = N'Hiệu lực'
              AND EXISTS (SELECT 1 FROM dbo.BienBanBanGiao bb WHERE bb.MaHopDong = hd.MaHopDong AND bb.LoaiBanGiao = N'Bàn giao vào' AND bb.TrangThai <> N'Đã hủy')
        )) OR (@CanPhongDich = 1 AND EXISTS (
            SELECT 1
            FROM dbo.ChiTietDatCoc ctdc
            JOIN dbo.HopDongThue hd ON hd.MaPhieuCoc = ctdc.MaPhieuDatCoc
            WHERE ctdc.MaPhong = @MaPhongDich AND hd.TrangThai = N'Hiệu lực'
              AND EXISTS (SELECT 1 FROM dbo.BienBanBanGiao bb WHERE bb.MaHopDong = hd.MaHopDong AND bb.LoaiBanGiao = N'Bàn giao vào' AND bb.TrangThai <> N'Đã hủy')
        ))
        THROW 51411, N'Phòng đang có khách, biên bản bàn giao đã ghi nhận nên không chuyển tài sản được', 1;

    DECLARE @TenTaiSan NVARCHAR(100), @DonGia DECIMAL(15,2), @Ton INT;
    DECLARE @LoaiNguon NVARCHAR(20), @LoaiDich NVARCHAR(20), @MaPhieu VARCHAR(12);

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @CanPhongNguon = 1
        BEGIN
            SELECT @TenTaiSan = TenTaiSan, @DonGia = DonGia, @Ton = SoLuong
            FROM dbo.TaiSan WITH (UPDLOCK, HOLDLOCK)
            WHERE MaPhong = @MaPhongNguon AND MaTaiSan = @MaTaiSan AND LoaiTaiSan = N'Chung';
            IF @TenTaiSan IS NULL
                THROW 51412, N'Không tìm thấy tài sản dùng chung trong phòng nguồn.', 1;
            IF @Ton < @SoLuong
                THROW 51413, N'Số lượng chuyển vượt quá số lượng trong phòng nguồn.', 1;
        END
        ELSE
        BEGIN
            SELECT @TenTaiSan = TenTaiSan, @DonGia = DonGia,
                   @Ton = CASE WHEN @LoaiThaoTac = N'KHO_PHONG' OR @LoaiThaoTac = N'DUNGDUOC_CHO_SUA'
                               THEN SoLuongDungDuoc ELSE SoLuongChoSua END
            FROM dbo.KhoTaiSanChiNhanh WITH (UPDLOCK, HOLDLOCK)
            WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan;
            IF @TenTaiSan IS NULL
                THROW 51414, N'Không tìm thấy tài sản trong kho chi nhánh.', 1;
            IF @Ton < @SoLuong
                THROW 51415, N'Số lượng chuyển vượt quá số lượng tồn kho.', 1;
        END;

        IF @LoaiThaoTac = N'PHONG_KHO'
        BEGIN
            UPDATE dbo.TaiSan SET SoLuong = SoLuong - @SoLuong
            WHERE MaPhong = @MaPhongNguon AND MaTaiSan = @MaTaiSan;
            IF EXISTS (SELECT 1 FROM dbo.KhoTaiSanChiNhanh WITH (UPDLOCK, HOLDLOCK) WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan)
                UPDATE dbo.KhoTaiSanChiNhanh
                SET SoLuongDungDuoc = SoLuongDungDuoc + @SoLuong, TenTaiSan = @TenTaiSan,
                    DonGia = COALESCE(@DonGia, DonGia), CapNhatLuc = SYSDATETIME()
                WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan;
            ELSE
                INSERT dbo.KhoTaiSanChiNhanh (MaChiNhanh, MaTaiSan, TenTaiSan, DonGia, SoLuongDungDuoc, SoLuongChoSua)
                VALUES (@MaChiNhanh, @MaTaiSan, @TenTaiSan, @DonGia, @SoLuong, 0);
            SELECT @LoaiNguon = N'Phòng', @LoaiDich = N'Kho dùng được';
        END
        ELSE IF @LoaiThaoTac = N'KHO_PHONG'
        BEGIN
            UPDATE dbo.KhoTaiSanChiNhanh
            SET SoLuongDungDuoc = SoLuongDungDuoc - @SoLuong, CapNhatLuc = SYSDATETIME()
            WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan;
            IF EXISTS (SELECT 1 FROM dbo.TaiSan WITH (UPDLOCK, HOLDLOCK) WHERE MaPhong = @MaPhongDich AND MaTaiSan = @MaTaiSan)
            BEGIN
                IF EXISTS (SELECT 1 FROM dbo.TaiSan WHERE MaPhong = @MaPhongDich AND MaTaiSan = @MaTaiSan AND LoaiTaiSan <> N'Chung')
                    THROW 51416, N'Phòng đích đã có mã tài sản riêng theo giường.', 1;
                UPDATE dbo.TaiSan SET SoLuong = SoLuong + @SoLuong
                WHERE MaPhong = @MaPhongDich AND MaTaiSan = @MaTaiSan;
            END
            ELSE
                INSERT dbo.TaiSan (MaPhong, MaTaiSan, TenTaiSan, SoLuong, DonGia, LoaiTaiSan, MaGiuong)
                VALUES (@MaPhongDich, @MaTaiSan, @TenTaiSan, @SoLuong, @DonGia, N'Chung', NULL);
            SELECT @LoaiNguon = N'Kho dùng được', @LoaiDich = N'Phòng';
        END
        ELSE IF @LoaiThaoTac = N'PHONG_PHONG'
        BEGIN
            UPDATE dbo.TaiSan SET SoLuong = SoLuong - @SoLuong
            WHERE MaPhong = @MaPhongNguon AND MaTaiSan = @MaTaiSan;
            IF EXISTS (SELECT 1 FROM dbo.TaiSan WITH (UPDLOCK, HOLDLOCK) WHERE MaPhong = @MaPhongDich AND MaTaiSan = @MaTaiSan)
            BEGIN
                IF EXISTS (SELECT 1 FROM dbo.TaiSan WHERE MaPhong = @MaPhongDich AND MaTaiSan = @MaTaiSan AND LoaiTaiSan <> N'Chung')
                    THROW 51416, N'Phòng đích đã có mã tài sản riêng theo giường.', 1;
                UPDATE dbo.TaiSan SET SoLuong = SoLuong + @SoLuong
                WHERE MaPhong = @MaPhongDich AND MaTaiSan = @MaTaiSan;
            END
            ELSE
                INSERT dbo.TaiSan (MaPhong, MaTaiSan, TenTaiSan, SoLuong, DonGia, LoaiTaiSan, MaGiuong)
                VALUES (@MaPhongDich, @MaTaiSan, @TenTaiSan, @SoLuong, @DonGia, N'Chung', NULL);
            SELECT @LoaiNguon = N'Phòng', @LoaiDich = N'Phòng';
        END
        ELSE IF @LoaiThaoTac = N'DUNGDUOC_CHO_SUA'
        BEGIN
            UPDATE dbo.KhoTaiSanChiNhanh
            SET SoLuongDungDuoc = SoLuongDungDuoc - @SoLuong,
                SoLuongChoSua = SoLuongChoSua + @SoLuong, CapNhatLuc = SYSDATETIME()
            WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan;
            SELECT @LoaiNguon = N'Kho dùng được', @LoaiDich = N'Kho chờ sửa';
        END
        ELSE IF @LoaiThaoTac = N'CHOSUA_DUNGDUOC'
        BEGIN
            UPDATE dbo.KhoTaiSanChiNhanh
            SET SoLuongChoSua = SoLuongChoSua - @SoLuong,
                SoLuongDungDuoc = SoLuongDungDuoc + @SoLuong, CapNhatLuc = SYSDATETIME()
            WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan;
            SELECT @LoaiNguon = N'Kho chờ sửa', @LoaiDich = N'Kho dùng được';
        END
        ELSE
        BEGIN
            UPDATE dbo.KhoTaiSanChiNhanh
            SET SoLuongChoSua = SoLuongChoSua - @SoLuong, CapNhatLuc = SYSDATETIME()
            WHERE MaChiNhanh = @MaChiNhanh AND MaTaiSan = @MaTaiSan;
            SELECT @LoaiNguon = N'Kho chờ sửa', @LoaiDich = N'Thanh lý';
        END;

        DECLARE @Seq BIGINT = NEXT VALUE FOR dbo.Seq_DieuChuyenTaiSan;
        SET @MaPhieu = CONCAT('DCTS', RIGHT(CONCAT('00000000', @Seq), 8));
        INSERT dbo.PhieuDieuChuyenTaiSan (
            MaPhieu, MaChiNhanh, LoaiThaoTac, LoaiNguon, MaPhongNguon,
            LoaiDich, MaPhongDich, MaTaiSan, TenTaiSan, SoLuong, LyDo, MaNhanVien
        ) VALUES (
            @MaPhieu, @MaChiNhanh, @LoaiThaoTac, @LoaiNguon, @MaPhongNguon,
            @LoaiDich, @MaPhongDich, @MaTaiSan, @TenTaiSan, @SoLuong, @LyDo, @MaNhanVien
        );

        COMMIT TRANSACTION;
        SELECT @MaPhieu AS maPhieu, @LoaiThaoTac AS loaiThaoTac, @MaTaiSan AS maTaiSan,
               @TenTaiSan AS tenTaiSan, @SoLuong AS soLuong, SYSDATETIME() AS thoiDiem;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_DieuPhoiTaiSan_DanhSachKho
    @MaChiNhanh VARCHAR(6) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT k.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS tenChiNhanh,
           k.MaTaiSan AS maTaiSan, k.TenTaiSan AS tenTaiSan, k.DonGia AS donGia,
           k.SoLuongDungDuoc AS soLuongDungDuoc, k.SoLuongChoSua AS soLuongChoSua,
           k.CapNhatLuc AS capNhatLuc
    FROM dbo.KhoTaiSanChiNhanh k
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = k.MaChiNhanh
    WHERE @MaChiNhanh IS NULL OR k.MaChiNhanh = @MaChiNhanh
    ORDER BY k.MaChiNhanh, k.MaTaiSan;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_DieuPhoiTaiSan_DanhSachPhong
    @MaChiNhanh VARCHAR(6) = NULL,
    @MaTaiSan VARCHAR(6) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS tenChiNhanh,
           p.MaPhong AS maPhong, p.TenPhong AS tenPhong,
           -- D-083: chỉ khóa khi phòng đã có biên bản bàn giao vào (đã băm lên chuỗi); hợp đồng hiệu lực mà chưa bàn giao vẫn điều phối được.
           CAST(CASE WHEN EXISTS (
               SELECT 1 FROM dbo.ChiTietDatCoc ctdc
               JOIN dbo.HopDongThue hd ON hd.MaPhieuCoc = ctdc.MaPhieuDatCoc
               WHERE ctdc.MaPhong = p.MaPhong AND hd.TrangThai = N'Hiệu lực'
                 AND EXISTS (SELECT 1 FROM dbo.BienBanBanGiao bb WHERE bb.MaHopDong = hd.MaHopDong AND bb.LoaiBanGiao = N'Bàn giao vào' AND bb.TrangThai <> N'Đã hủy')
           ) THEN 1 ELSE 0 END AS BIT) AS dangCoKhach,
           CAST(CASE WHEN EXISTS (
               SELECT 1 FROM dbo.ChiTietDatCoc ctdc
               JOIN dbo.HopDongThue hd ON hd.MaPhieuCoc = ctdc.MaPhieuDatCoc
               WHERE ctdc.MaPhong = p.MaPhong AND hd.TrangThai = N'Hiệu lực'
                 AND NOT EXISTS (SELECT 1 FROM dbo.BienBanBanGiao bb WHERE bb.MaHopDong = hd.MaHopDong AND bb.LoaiBanGiao = N'Bàn giao vào' AND bb.TrangThai <> N'Đã hủy')
           ) THEN 1 ELSE 0 END AS BIT) AS choBanGiao,
           ts.MaTaiSan AS maTaiSan, ts.TenTaiSan AS tenTaiSan, ts.SoLuong AS soLuong,
           ts.DonGia AS donGia, ts.LoaiTaiSan AS loaiTaiSan, ts.MaGiuong AS maGiuong
    FROM dbo.Phong p
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = p.MaChiNhanh
    LEFT JOIN dbo.TaiSan ts ON ts.MaPhong = p.MaPhong
        AND (@MaTaiSan IS NULL OR ts.MaTaiSan = @MaTaiSan)
    WHERE (@MaChiNhanh IS NULL OR p.MaChiNhanh = @MaChiNhanh)
    ORDER BY p.MaChiNhanh, p.MaPhong, ts.MaTaiSan;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_DieuPhoiTaiSan_LichSu
    @MaChiNhanh VARCHAR(6) = NULL,
    @MaTaiSan VARCHAR(6) = NULL,
    @MaPhong VARCHAR(4) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.MaPhieu AS maPhieu, p.MaChiNhanh AS maChiNhanh, cn.TenChiNhanh AS tenChiNhanh,
           p.LoaiThaoTac AS loaiThaoTac, p.LoaiNguon AS loaiNguon,
           p.MaPhongNguon AS maPhongNguon, pn.TenPhong AS tenPhongNguon,
           p.LoaiDich AS loaiDich, p.MaPhongDich AS maPhongDich, pd.TenPhong AS tenPhongDich,
           p.MaTaiSan AS maTaiSan, p.TenTaiSan AS tenTaiSan, p.SoLuong AS soLuong,
           p.LyDo AS lyDo, p.MaNhanVien AS maNhanVien, nd.HoTen AS tenNhanVien, p.ThoiDiem AS thoiDiem
    FROM dbo.PhieuDieuChuyenTaiSan p
    JOIN dbo.ChiNhanh cn ON cn.MaChiNhanh = p.MaChiNhanh
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = p.MaNhanVien
    LEFT JOIN dbo.Phong pn ON pn.MaPhong = p.MaPhongNguon
    LEFT JOIN dbo.Phong pd ON pd.MaPhong = p.MaPhongDich
    WHERE (@MaChiNhanh IS NULL OR p.MaChiNhanh = @MaChiNhanh)
      AND (@MaTaiSan IS NULL OR p.MaTaiSan = @MaTaiSan)
      AND (@MaPhong IS NULL OR p.MaPhongNguon = @MaPhong OR p.MaPhongDich = @MaPhong)
    ORDER BY p.ThoiDiem DESC, p.MaPhieu DESC;
END;
GO
