-- Giới tính phòng theo người đang ở (D-077). Chạy lại được nhiều lần.
-- Chỉ phòng đang "Không phân biệt" mà có phiếu cọc còn hiệu lực/đã lập hợp đồng, và MỌI người đặt cọc đều cùng một giới tính (Nam hoặc Nữ),
-- thì phòng mang giới tính đó. Phòng không có người ở, phòng có cả nam lẫn nữ, phòng đã là Nam/Nữ: không đổi.
;WITH occupant AS (
    SELECT DISTINCT c.MaPhong, nd.GioiTinh
    FROM dbo.ChiTietDatCoc c
    JOIN dbo.PhieuDatCoc pdc ON pdc.MaPhieuDatCoc = c.MaPhieuDatCoc AND pdc.TrangThaiCoc <> N'Đã hủy'
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = pdc.MaKhachHang
    WHERE nd.GioiTinh IN (N'Nam', N'Nữ')
      AND NOT EXISTS (SELECT 1 FROM dbo.HopDongThue h WHERE h.MaPhieuCoc = pdc.MaPhieuDatCoc AND h.TrangThai <> N'Hiệu lực')
)
UPDATE p SET GioiTinhChoPhep = o.GioiTinh
FROM dbo.Phong p
JOIN occupant o ON o.MaPhong = p.MaPhong
WHERE p.GioiTinhChoPhep = N'Không phân biệt'
  AND (SELECT COUNT(DISTINCT GioiTinh) FROM occupant x WHERE x.MaPhong = p.MaPhong) = 1;

SELECT p.MaChiNhanh, p.MaPhong, p.GioiTinhChoPhep FROM dbo.Phong p WHERE p.GioiTinhChoPhep <> N'Không phân biệt' AND EXISTS (SELECT 1 FROM dbo.ChiTietDatCoc c WHERE c.MaPhong = p.MaPhong) ORDER BY p.MaPhong;
