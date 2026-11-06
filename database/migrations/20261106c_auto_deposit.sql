-- D-019: tự động duyệt nhận cọc và chốt phiếu cọc.
-- Tài khoản "Hệ thống tự động" (NVAUTO) đứng tên các bước do hệ thống tự làm, để dữ liệu không
-- ghi sai rằng một quản lý/kế toán thật đã duyệt. Không có TaiKhoan nên không đăng nhập được.
-- Chạy lại nhiều lần vẫn an toàn.
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE MaNguoiDung = 'NVAUTO')
    INSERT INTO dbo.NguoiDung (MaNguoiDung, HoTen, LoaiNguoiDung)
    VALUES ('NVAUTO', N'Hệ thống tự động', 'NhanVien');

-- NhanVien bắt buộc chi nhánh và chức vụ: gắn chi nhánh đầu tiên, chức vụ Admin để không lọt vào
-- danh sách nhân viên nghiệp vụ. Các SP duyệt cọc chỉ kiểm tra mã nhân viên có tồn tại.
IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE MaNhanVien = 'NVAUTO')
    INSERT INTO dbo.NhanVien (MaNhanVien, MaChiNhanh, NgayVaoLam, ChucVu)
    SELECT 'NVAUTO', MIN(MaChiNhanh), CAST(GETDATE() AS DATE), N'Admin'
    FROM dbo.ChiNhanh
    HAVING MIN(MaChiNhanh) IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM dbo.ThamSoHeThong WHERE MaThamSo = 'TU_DONG_DUYET_COC')
    INSERT INTO dbo.ThamSoHeThong (MaThamSo, NhomThamSo, TenThamSo, GiaTri, KieuDuLieu, MoTa)
    VALUES ('TU_DONG_DUYET_COC', N'Đặt cọc', N'Tự động duyệt nhận cọc và chốt phiếu cọc', N'1', N'Boolean',
        N'Bật: phòng còn phù hợp thì hệ thống tự duyệt nhận cọc, phiếu cọc sale lập được tự chốt (tiền cọc do trigger tính). Tắt: quản lý và kế toán duyệt tay như cũ.');
