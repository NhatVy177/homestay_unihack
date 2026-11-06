SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.YeuCauDatCocChiTiet', 'U') IS NULL
CREATE TABLE dbo.YeuCauDatCocChiTiet (
  MaDangKy varchar(6) NOT NULL PRIMARY KEY
    REFERENCES dbo.PhieuDangKy(MaDangKy),
  MaNhanVienSale varchar(6) NOT NULL REFERENCES dbo.NhanVien(MaNhanVien),
  HinhThucThue nvarchar(20) NOT NULL
    CHECK (HinhThucThue IN (N'Nguyên phòng', N'Ghép giường')),
  MaPhong varchar(4) NULL,
  DanhSachGiuong nvarchar(100) NULL,
  GuiLuc datetime2 NOT NULL DEFAULT GETDATE()
);
IF COL_LENGTH('dbo.YeuCauDatCocChiTiet', 'MaPhong') IS NULL
  ALTER TABLE dbo.YeuCauDatCocChiTiet ADD MaPhong varchar(4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_YC_Coc_Phong')
  ALTER TABLE dbo.YeuCauDatCocChiTiet ADD CONSTRAINT FK_YC_Coc_Phong
    FOREIGN KEY (MaPhong) REFERENCES dbo.Phong(MaPhong);

IF COL_LENGTH('dbo.PhieuDatCoc', 'DaNopQuy') IS NULL
  ALTER TABLE dbo.PhieuDatCoc ADD DaNopQuy bit NOT NULL
    CONSTRAINT DF_PDC_DaNopQuy DEFAULT 0;
IF COL_LENGTH('dbo.PhieuDatCoc', 'NopQuyLuc') IS NULL
  ALTER TABLE dbo.PhieuDatCoc ADD NopQuyLuc datetime2 NULL;
IF COL_LENGTH('dbo.PhieuDatCoc', 'MaKeToanNopQuy') IS NULL
  ALTER TABLE dbo.PhieuDatCoc ADD MaKeToanNopQuy varchar(6) NULL;

IF OBJECT_ID('dbo.DepositMailEvent', 'U') IS NULL
CREATE TABLE dbo.DepositMailEvent (
  EventKey varchar(100) NOT NULL PRIMARY KEY,
  Status varchar(12) NOT NULL CHECK (Status IN ('Sending', 'Sent', 'Logged', 'Skipped', 'Failed')),
  CreatedAt datetime2 NOT NULL DEFAULT GETDATE()
);
COMMIT;
