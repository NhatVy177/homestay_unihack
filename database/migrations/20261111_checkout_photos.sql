-- C2 / D-030 (1): photos taken by the manager at the move-out inspection.
-- New table only; no change to existing rows. Repeatable. Files live in web/backend/secrets/checkout-photos/
-- (never under public /uploads); the table keeps the stored name and SHA-256 so later evidence can bind them.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.KiemTraTraPhongAnh', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KiemTraTraPhongAnh (
        MaAnh int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        MaPhieuTra varchar(6) NOT NULL REFERENCES dbo.PhieuTraPhong(MaPhieuTra),
        KeyTaiSan varchar(20) NULL,          -- row key of the inspected item (MaTaiSan_n); NULL = whole room
        TenGoc nvarchar(200) NOT NULL,
        StoredName varchar(100) NOT NULL UNIQUE,
        MediaType varchar(40) NOT NULL,
        Sha256 char(64) NOT NULL,
        UploadedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UploadedBy varchar(6) NOT NULL REFERENCES dbo.NguoiDung(MaNguoiDung)
    );
    CREATE INDEX IX_KiemTraTraPhongAnh_MaPhieuTra ON dbo.KiemTraTraPhongAnh(MaPhieuTra);
END;
COMMIT TRANSACTION;
