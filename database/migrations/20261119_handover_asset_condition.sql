-- Tình trạng từng tài sản lúc bàn giao (Vy chốt 19/11/2026): Tốt / Dùng được / Hư hỏng. Chạy lại được.
-- Cột cho phép NULL: biên bản cũ chưa ghi nhận thì giữ trống (hiển thị "Chưa ghi nhận"), không bịa là "Tốt".
-- Kiểu TVP_ChiTietBanGiao_V2 thêm TinhTrang để SP_LapBienBanBanGiaoVao nhận từ web.
IF COL_LENGTH(N'dbo.ChiTietBanGiao', N'TinhTrang') IS NULL
    EXEC(N'ALTER TABLE dbo.ChiTietBanGiao ADD TinhTrang NVARCHAR(20) NULL');

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CHK_ChiTietBanGiao_TinhTrang')
    EXEC(N'ALTER TABLE dbo.ChiTietBanGiao ADD CONSTRAINT CHK_ChiTietBanGiao_TinhTrang
           CHECK (TinhTrang IS NULL OR TinhTrang IN (N''Tốt'', N''Dùng được'', N''Hư hỏng''))');

IF TYPE_ID(N'dbo.TVP_ChiTietBanGiao_V2') IS NULL
    EXEC(N'CREATE TYPE dbo.TVP_ChiTietBanGiao_V2 AS TABLE
           (
               MaPhong VARCHAR(4) NOT NULL,
               MaTaiSan VARCHAR(6) NOT NULL,
               SoLuongThucTe INT NULL,
               GhiChu NVARCHAR(255) NULL,
               TinhTrang NVARCHAR(20) NULL
           )');

-- Chạy bằng EXEC vì cột mới chưa có lúc biên dịch lô lệnh.
EXEC(N'SELECT COUNT(*) AS soDongChiTietBanGiao, SUM(CASE WHEN TinhTrang IS NULL THEN 1 ELSE 0 END) AS chuaGhiNhan FROM dbo.ChiTietBanGiao');
