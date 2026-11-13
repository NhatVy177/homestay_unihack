-- D-043 / J-C079. Phòng khách quan tâm theo từng hồ sơ đăng ký (một hồ sơ, nhiều phòng).
-- Chỉ thêm bảng mới; không đổi hay xóa dòng dữ liệu nghiệp vụ hiện có. Chạy lại được.
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.PhieuDangKyPhongQuanTam', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PhieuDangKyPhongQuanTam (
    MaDangKy     VARCHAR(6) NOT NULL,
    MaPhong      VARCHAR(4) NOT NULL,
    ThoiGianThem DATETIME   NOT NULL CONSTRAINT DF_PDKPQT_ThoiGianThem DEFAULT GETDATE(),
    CONSTRAINT PK_PDKPQT PRIMARY KEY (MaDangKy, MaPhong),
    CONSTRAINT FK_PDKPQT_PhieuDangKy FOREIGN KEY (MaDangKy) REFERENCES dbo.PhieuDangKy (MaDangKy),
    CONSTRAINT FK_PDKPQT_Phong FOREIGN KEY (MaPhong) REFERENCES dbo.Phong (MaPhong)
  );
END;
GO
