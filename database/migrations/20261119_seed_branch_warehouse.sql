/* Nạp hàng dự phòng cho kho tài sản từng chi nhánh (D-076), để màn Điều phối tài sản có dữ liệu demo.
   Chỉ THÊM dòng chưa có (theo MaChiNhanh + MaTaiSan); không sửa, không xóa dòng kho đã có. Chạy lại được.
   Tên và đơn giá lấy từ dbo.TaiSan để khớp danh mục đang dùng trong phòng. */
SET NOCOUNT ON;

DECLARE @Seed TABLE (MaTaiSan VARCHAR(6) PRIMARY KEY, SoLuongDungDuoc INT, SoLuongChoSua INT);
INSERT @Seed VALUES
    ('TS0001', 1, 0),   -- Giường
    ('TS0002', 3, 1),   -- Nệm (1 cái chờ sửa)
    ('TS0003', 2, 0),   -- Tủ cá nhân
    ('TS0004', 5, 0);   -- Chìa khóa

INSERT dbo.KhoTaiSanChiNhanh (MaChiNhanh, MaTaiSan, TenTaiSan, DonGia, SoLuongDungDuoc, SoLuongChoSua)
SELECT cn.MaChiNhanh, s.MaTaiSan, dm.TenTaiSan, dm.DonGia, s.SoLuongDungDuoc, s.SoLuongChoSua
FROM dbo.ChiNhanh cn
CROSS JOIN @Seed s
CROSS APPLY (
    SELECT TOP 1 ts.TenTaiSan, ts.DonGia FROM dbo.TaiSan ts WHERE ts.MaTaiSan = s.MaTaiSan ORDER BY ts.MaPhong
) dm
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.KhoTaiSanChiNhanh k WHERE k.MaChiNhanh = cn.MaChiNhanh AND k.MaTaiSan = s.MaTaiSan
);

SELECT MaChiNhanh, COUNT(*) AS soLoai, SUM(SoLuongDungDuoc) AS dungDuoc, SUM(SoLuongChoSua) AS choSua
FROM dbo.KhoTaiSanChiNhanh GROUP BY MaChiNhanh ORDER BY MaChiNhanh;
