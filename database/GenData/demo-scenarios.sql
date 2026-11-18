-- Bộ mẫu dùng riêng cho CSDL HOMEDORM_DEMO_*.
IF DB_NAME() NOT LIKE 'HOMEDORM[_]DEMO[_]%' THROW 51901, N'Chỉ tạo dữ liệu trên CSDL demo.', 1;

DECLARE @today DATE = CONVERT(date, GETDATE());
DECLARE @month2 DATE = DATEFROMPARTS(YEAR(@today), MONTH(@today), 1);
DECLARE @month1 DATE = DATEADD(month, -1, @month2);
DECLARE @leaseEnd DATE = DATEADD(day, -1, DATEADD(month, 6, @month1));

DECLARE @accounts TABLE (Id VARCHAR(6), LoginName VARCHAR(50), DisplayName NVARCHAR(100), RoleName NVARCHAR(20), BranchId VARCHAR(6), Gender NVARCHAR(5));
INSERT @accounts VALUES
('KH9101','demo-moi',N'Khách mới Minh',N'KhachHang',NULL,N'Nam'),
('KH9102','demo-moi-02',N'Khách mới An',N'KhachHang',NULL,N'Nữ'),
('KH9103','demo-moi-03',N'Khách mới Bình',N'KhachHang',NULL,N'Nam'),
('KH9104','demo-moi-04',N'Khách mới Hà',N'KhachHang',NULL,N'Nữ'),
('KH9201','demo-dang-o',N'Khách đang ở Linh',N'KhachHang',NULL,N'Nữ'),
('KH9202','demo-dang-o-02',N'Khách đang ở Nam',N'KhachHang',NULL,N'Nam'),
('KH9203','demo-dang-o-03',N'Khách đang ở Mai',N'KhachHang',NULL,N'Nữ'),
('KH9204','demo-dang-o-04',N'Khách đang ở Khoa',N'KhachHang',NULL,N'Nam'),
('NV9101','demo-sale',N'Sale Demo Quận 1',N'Sale','CN0001',N'Nữ'),
('NV9102','demo-quan-ly',N'Quản lý Demo Quận 1',N'Quản lý','CN0001',N'Nam'),
('NV9103','demo-ke-toan',N'Kế toán Demo Quận 1',N'Kế toán','CN0001',N'Nữ'),
('NV9104','demo-quan-ly-02',N'Quản lý Demo Bình Thạnh',N'Quản lý','CN0002',N'Nữ'),
('NV9105','demo-ke-toan-02',N'Kế toán Demo Bình Thạnh',N'Kế toán','CN0002',N'Nam'),
('NV9106','demo-sale-02',N'Sale Demo Bình Thạnh',N'Sale','CN0002',N'Nữ');

INSERT dbo.ChiNhanh (MaChiNhanh,TenChiNhanh,DiaChi,Email) VALUES
('CN0001',N'HomeDorm Quận 1',N'12 Nguyễn Trãi, Quận 1, TP.HCM','q1@example.invalid'),
('CN0002',N'HomeDorm Bình Thạnh',N'45 Điện Biên Phủ, Bình Thạnh, TP.HCM','bt@example.invalid'),
('CN0003',N'HomeDorm Thủ Đức',N'88 Võ Văn Ngân, Thủ Đức, TP.HCM','td@example.invalid');
INSERT dbo.LoaiPhong (MaLoaiPhong,TenLoaiPhong,SucChuaToiDa,MoTa,GiaThueTheoGiuong,GiaThueNguyenPhong) VALUES
('LP0001',N'Phòng 2 người',2,N'Phòng có hai giường riêng, bàn học và tủ cá nhân. Điều hòa phục vụ sinh hoạt trong phòng.',2200000,4400000),
('LP0002',N'Phòng 4 người',4,N'Phòng bốn giường cho khách thuê ghép hoặc nhóm nhỏ. Mỗi khách có chỗ để đồ cá nhân, không gian chung có điều hòa.',1800000,7200000),
('LP0003',N'Phòng 6 người',6,N'Phòng sáu giường cho khách thuê theo tháng. Phòng có quạt, tủ cá nhân và khu vực bàn học dùng chung.',1400000,8400000),
('LP0004',N'Phòng 2 người có bàn làm việc',2,N'Phòng hai giường có điều hòa, hai bàn làm việc và hai tủ riêng, phù hợp với khách cần chỗ học hoặc làm việc tại phòng.',3000000,6000000);

INSERT dbo.NguoiDung (MaNguoiDung,HoTen,NgaySinh,GioiTinh,SDT,Email,LoaiNguoiDung)
SELECT Id,DisplayName,'2000-05-18',Gender,CONCAT('000000',RIGHT(Id,4)),CONCAT(LoginName,'@example.invalid'),
  CASE WHEN RoleName=N'KhachHang' THEN 'KhachHang' ELSE 'NhanVien' END FROM @accounts;
INSERT dbo.KhachHang (MaKhachHang,QuocTich) SELECT Id,N'Việt Nam' FROM @accounts WHERE RoleName=N'KhachHang';
INSERT dbo.NhanVien (MaNhanVien,MaChiNhanh,NgayVaoLam,ChucVu) SELECT Id,BranchId,'2025-01-01',RoleName FROM @accounts WHERE BranchId IS NOT NULL;
INSERT dbo.TaiKhoan (TenDangNhap,MatKhau,MaNguoiDung)
SELECT LoginName,CONVERT(varchar(64),HASHBYTES('SHA2_256',@Password),2),Id FROM @accounts;

DECLARE @rooms TABLE (RoomId VARCHAR(4), Name NVARCHAR(100), BranchId VARCHAR(6), RoomType VARCHAR(6));
INSERT @rooms VALUES
('P101',N'Phòng P101','CN0001','LP0001'), ('P102',N'Phòng P102','CN0001','LP0002'),
('P203',N'Phòng P203','CN0001','LP0003'), ('P301',N'Phòng P301','CN0001','LP0004'),
('P401',N'Phòng P401','CN0001','LP0002'), ('P111',N'Phòng P111','CN0002','LP0001'),
('P212',N'Phòng P212','CN0002','LP0002'), ('P313',N'Phòng P313','CN0002','LP0003'),
('P121',N'Phòng P121','CN0003','LP0001'), ('P222',N'Phòng P222','CN0003','LP0002'),
('P423',N'Phòng P423','CN0003','LP0003');

DECLARE @residents TABLE (Slot INT, CustomerId VARCHAR(6), RoomId VARCHAR(4), SaleId VARCHAR(6), ManagerId VARCHAR(6), AccountantId VARCHAR(6));
INSERT @residents VALUES
(1,'KH9201','P101','NV9101','NV9102','NV9103'),
(2,'KH9202','P102','NV9101','NV9102','NV9103'),
(3,'KH9203','P111','NV9106','NV9104','NV9105'),
(4,'KH9204','P212','NV9106','NV9104','NV9105');

INSERT dbo.Phong (MaPhong,TenPhong,GioiTinhChoPhep,TinhTrang,MaChiNhanh,MaLoaiPhong)
SELECT r.RoomId,r.Name,COALESCE(a.Gender,N'Không phân biệt'),CASE WHEN o.RoomId IS NULL THEN N'Trống' ELSE N'Còn chỗ' END,r.BranchId,r.RoomType
FROM @rooms r LEFT JOIN @residents o ON o.RoomId=r.RoomId LEFT JOIN @accounts a ON a.Id=o.CustomerId;
INSERT dbo.Giuong (MaPhong,MaGiuong,SoGiuong,TinhTrang)
SELECT r.RoomId,CONCAT('G0',n.Id),n.Id,
  CASE WHEN o.RoomId IS NOT NULL AND n.Id=1 THEN N'Đang thuê' ELSE N'Trống' END
FROM @rooms r JOIN dbo.LoaiPhong t ON t.MaLoaiPhong=r.RoomType LEFT JOIN @residents o ON o.RoomId=r.RoomId
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) n(Id) WHERE n.Id <= t.SucChuaToiDa;
INSERT dbo.TaiSan (MaPhong,MaTaiSan,TenTaiSan,SoLuong,DonGia)
SELECT r.RoomId,a.Id,a.Name,CASE WHEN a.Id IN ('TS0001','TS0002') OR r.RoomType='LP0004' THEN t.SucChuaToiDa ELSE 1 END,a.Price
FROM @rooms r JOIN dbo.LoaiPhong t ON t.MaLoaiPhong=r.RoomType
CROSS JOIN (VALUES ('TS0001',N'Giường đơn',1300000),('TS0002',N'Tủ cá nhân',850000),('TS0003',N'Bàn học',450000)) a(Id,Name,Price);
INSERT dbo.TaiSan (MaPhong,MaTaiSan,TenTaiSan,SoLuong,DonGia)
SELECT RoomId,'TS0004',CASE WHEN RoomType='LP0003' THEN N'Quạt' ELSE N'Điều hòa' END,1,
  CASE WHEN RoomType='LP0003' THEN 350000 ELSE 4500000 END FROM @rooms;
INSERT dbo.DichVu (MaDichVu,TenDichVu,DonViTinh,DonGia,Nhom) VALUES
('DV0001',N'Điện','kWh',4000,N'Thiết yếu'),('DV0002',N'Nước','m3',18000,N'Thiết yếu'),
('DV0003',N'Wifi',N'tháng',100000,N'Thiết yếu'),('DV0004',N'Vệ sinh',N'tháng',80000,N'Thiết yếu'),
('DV0005',N'Gửi xe',N'tháng',150000,N'Thiết yếu');

INSERT dbo.PhieuDangKy (MaDangKy,NgayDangKy,SoNam,SoNu,SoNguoiDuKienO,KhuVucMongMuon,MucGiaToiDa,ThoiGianDuKienVaoO,ThoiHanThue,TrangThai,MaKhachHang,MaNhanVienSale)
SELECT CONCAT('DK900',o.Slot),DATEADD(day,-7,@month1),CASE WHEN a.Gender=N'Nam' THEN 1 ELSE 0 END,
  CASE WHEN a.Gender=N'Nữ' THEN 1 ELSE 0 END,1,b.TenChiNhanh,3500000,@month1,6,N'Xác nhận cọc',o.CustomerId,o.SaleId
FROM @residents o JOIN @accounts a ON a.Id=o.CustomerId JOIN dbo.Phong r ON r.MaPhong=o.RoomId JOIN dbo.ChiNhanh b ON b.MaChiNhanh=r.MaChiNhanh;
INSERT dbo.PhieuDatCoc (MaPhieuDatCoc,ThoiDiemDatCoc,ThoiHanThanhToan,SoTienCoc,PhuongThucThanhToan,TrangThaiThanhToan,ThoiGianXacNhanTT,ThoiGianNhanPhong,HinhThucThue,TrangThaiCoc,MaPhieuYeuCauDangKy,MaKhachHang,MaNhanVienKeToan)
SELECT CONCAT('DC900',o.Slot),DATEADD(day,-6,@month1),DATEADD(day,-3,@month1),t.GiaThueTheoGiuong*2,N'Tiền mặt',N'Đã TT',
  DATEADD(day,-5,@month1),@month1,N'Ghép giường',N'Đã lập HĐ',CONCAT('DK900',o.Slot),o.CustomerId,o.AccountantId
FROM @residents o JOIN dbo.Phong r ON r.MaPhong=o.RoomId JOIN dbo.LoaiPhong t ON t.MaLoaiPhong=r.MaLoaiPhong;
INSERT dbo.ChiTietDatCoc (MaChiTietDC,MaPhieuDatCoc,MaPhong,MaGiuong,GiaThue)
SELECT CONCAT('CT900',o.Slot),CONCAT('DC900',o.Slot),o.RoomId,'G01',t.GiaThueTheoGiuong
FROM @residents o JOIN dbo.Phong r ON r.MaPhong=o.RoomId JOIN dbo.LoaiPhong t ON t.MaLoaiPhong=r.MaLoaiPhong;
INSERT dbo.HoSoCuTru (MaHoSoCuTru,MaPhieuDatCoc,MaNhanVienSale,MaNhanVienQuanLy,TrangThaiHoSo,DaDoiChieuGiayTo)
SELECT CONCAT('HS900',Slot),CONCAT('DC900',Slot),SaleId,ManagerId,N'Đã duyệt cư trú',1 FROM @residents;
INSERT dbo.HopDongThue (MaHopDong,NgayKyHD,NgayBatDau,NgayKetThuc,SoGiuongThue,GiaThue,KyThanhToan,TrangThai,MaPhieuCoc,MaKhachHang,MaNhanVienQuanLy)
SELECT CONCAT('HD900',o.Slot),@month1,@month1,@leaseEnd,1,t.GiaThueTheoGiuong,N'Hàng tháng',N'Hiệu lực',CONCAT('DC900',o.Slot),o.CustomerId,o.ManagerId
FROM @residents o JOIN dbo.Phong r ON r.MaPhong=o.RoomId JOIN dbo.LoaiPhong t ON t.MaLoaiPhong=r.MaLoaiPhong;
INSERT dbo.ThanhVienHopDong (MaThanhVien,MaHoSoCuTru,MaHopDong,HoTen,GioiTinh,CCCD,QuocTich,TrangThai)
SELECT CONCAT('TV900',o.Slot),CONCAT('HS900',o.Slot),CONCAT('HD900',o.Slot),a.DisplayName,a.Gender,CONCAT('00000000000',o.Slot),N'Việt Nam',N'Đang ở'
FROM @residents o JOIN @accounts a ON a.Id=o.CustomerId;
INSERT dbo.BienBanBanGiao (MaBienBan,NgayBanGiao,LoaiBanGiao,MaHopDong,MaNhanVienQuanLy)
SELECT CONCAT('BG900',Slot),@month1,N'Bàn giao vào',CONCAT('HD900',Slot),ManagerId FROM @residents;
INSERT dbo.ChiTietBanGiao (MaChiTietBG,MaBienBan,MaPhong,MaTaiSan,SoLuongThucTe,GhiChu)
SELECT CONCAT('BG9',Slot,'01'),CONCAT('BG900',Slot),RoomId,'TS0001',1,N'Tình trạng tốt' FROM @residents;

INSERT dbo.DichVuHopDong (MaChiTietDVHD,MaDichVu,MaHopDong,GhiChu)
SELECT CONCAT('DV90',o.Slot,n.Id),CONCAT('DV000',n.Id),CONCAT('HD900',o.Slot),'1'
FROM @residents o CROSS JOIN (VALUES (1),(2),(3),(4)) n(Id);

DECLARE @cycles TABLE (Id TINYINT, Period VARCHAR(7), Issued DATE, Due DATE, ElecStart INT, ElecEnd INT, WaterStart INT, WaterEnd INT);
INSERT @cycles VALUES
(1,CONVERT(char(7),@month1,126),@month1,DATEADD(day,10,@month1),120,158,20,23),
(2,CONVERT(char(7),@month2,126),@today,DATEADD(day,10,@today),158,201,23,27);
INSERT dbo.PhieuGhiChiSo (MaPhieuGhi,KyGhi,NgayGhi,ChiSoNuocDau,ChiSoNuocCuoi,ChiSoDienDau,ChiSoDienCuoi,TrangThai,MaNhanVienQuanLy,MaPhong)
SELECT CONCAT('PG90',o.Slot,c.Id),c.Period,c.Issued,c.WaterStart,c.WaterEnd,c.ElecStart,c.ElecEnd,N'Đã Lập HD',o.ManagerId,o.RoomId
FROM @residents o CROSS JOIN @cycles c;
INSERT dbo.HoaDon (MaHoaDon,KyThanhToan,NgayLap,NgayHanTT,TongTien,TrangThai,NgayThanhToan,PhuongThucThanhToan,MaHopDong,MaNhanVienKeToan)
SELECT CONCAT('HO90',o.Slot,c.Id),c.Period,c.Issued,c.Due,h.GiaThue,
  CASE WHEN c.Id=1 THEN N'Đã TT' ELSE N'Chưa TT' END,
  CASE WHEN c.Id=1 THEN DATEADD(day,1,c.Issued) END,CASE WHEN c.Id=1 THEN N'Tiền mặt' END,h.MaHopDong,o.AccountantId
FROM @residents o JOIN dbo.HopDongThue h ON h.MaHopDong=CONCAT('HD900',o.Slot) CROSS JOIN @cycles c;
INSERT dbo.ChiTietHoaDon (MaChiTietHD,SoLuong,DonViTinh,DonGia,ThanhTien,MaHoaDon,MaChiTietDVHD,MaPhieuGhi,NoiDung)
SELECT CONCAT('CH9',o.Slot,c.Id,n.Id),q.Quantity,d.DonViTinh,d.DonGia,q.Quantity*d.DonGia,
  CONCAT('HO90',o.Slot,c.Id),CONCAT('DV90',o.Slot,n.Id),CASE WHEN n.Id IN(1,2) THEN CONCAT('PG90',o.Slot,c.Id) END,d.TenDichVu
FROM @residents o CROSS JOIN @cycles c CROSS JOIN (VALUES (1),(2),(3),(4)) n(Id)
JOIN dbo.DichVu d ON d.MaDichVu=CONCAT('DV000',n.Id)
CROSS APPLY (SELECT CASE n.Id WHEN 1 THEN c.ElecEnd-c.ElecStart WHEN 2 THEN c.WaterEnd-c.WaterStart ELSE 1 END) q(Quantity);
UPDATE hd SET TongTien=h.GiaThue+(SELECT SUM(ct.ThanhTien) FROM dbo.ChiTietHoaDon ct WHERE ct.MaHoaDon=hd.MaHoaDon)
FROM dbo.HoaDon hd JOIN dbo.HopDongThue h ON h.MaHopDong=hd.MaHopDong;

INSERT dbo.YeuCauSuaChua (MaYeuCau,NgayYeuCau,MoTaHuHong,TrangThai,NgayTiepNhan,NgayHoanTat,ChiPhiSuaChua,LoiDoKhachGayRa,GhiChuXuLy,MaHopDong,MaPhong,MaNhanVienQuanLy) VALUES
('SC9001',@month2,N'[Giường, tủ, nội thất] Bản lề tủ bị gãy khi sử dụng.',N'Hoàn tất',@month2,@month2,120000,1,N'Đã thay bản lề, có khoản phí 120.000đ.','HD9001','P101','NV9102'),
('SC9002',@today,N'[Nước, vòi, bồn cầu] Vòi nước nhỏ giọt sau khi khóa.',N'Chờ tiếp nhận',NULL,NULL,NULL,0,NULL,'HD9002','P102',NULL);
INSERT dbo.PhiPhatSinh (MaPhi,MaHopDong,TenPhi,SoTien,TrangThai,NgayGhiNhan,MaNhanVien) VALUES
('SC-SC9001','HD9001',N'Thay bản lề tủ',120000,N'Đã xác nhận',@month2,'NV9102');
