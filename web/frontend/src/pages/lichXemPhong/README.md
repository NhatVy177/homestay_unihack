# Module Quản lý lịch xem phòng

Chỉ code phần liên quan đến module này ở folder này.

- Trang chính: `LichXemPhongPage.jsx`
- API frontend: `lichXemPhong.api.js`
- Backend tương ứng: `happyroom-backend/routes`, `controllers`, `services`

D-045: `LichXemPhongPage.jsx` xuất trang `CustomerViewingSchedule.jsx`; thẻ lịch, lịch tháng và form yêu cầu đổi/hủy tách thành component trong cùng thư mục. Trang dùng CSS token ở `customerViewingSchedule.css` và Icon chung; không còn tải stylesheet timeline/font cũ.

Xác nhận lịch gọi API thật với phiên bản đang hiển thị, sau đó tải lại dữ liệu; không tự đổi trạng thái bằng state giả. Khách cần xác nhận lại sau khi Sale đổi giờ. Backend và SQL cùng chặn ghi kết quả nếu chưa xác nhận. Form đổi/hủy giữ callback và quy tắc ngày/giờ hiện có. Cấu hình migration và kiểm thử: `docs/cau-hinh.md` mục D-045; UI fixture: `scripts/ui-customer-viewing-confirmation.mjs`.
