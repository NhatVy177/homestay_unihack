# Hướng dẫn làm việc trong HomeStayDorm

Áp dụng cho toàn repo. Giao tiếp với Vy bằng tiếng Việt dễ hiểu.

## Đầu mỗi phiên

1. Đọc `spec/README.md`, `spec/progress.md`, `spec/scope.md`, `spec/decisions.md` và các mục mới nhất trong `spec/journal.md`.
2. Đọc phần liên quan trong `hackathon/plan.md`; khi cần bối cảnh trao đổi cũ, đọc `hackathon/handoff.md`. `Proposal.md` là lịch sử ý tưởng, không phải scope hiện hành.
3. Kiểm tra branch, remote, `git status` và code thực tế trước khi khẳng định tiến độ. Repo hiện hành là `NhatVy177/homestay_unihack`; không tự chuyển lại repo cũ theo handoff.

## Trong và cuối mỗi đợt làm việc

- Ghi mọi trao đổi có ảnh hưởng đến yêu cầu, quyết định, câu hỏi còn mở và mọi đợt sửa file vào `spec/journal.md`, kể cả phiên chỉ thảo luận. Gộp thao tác cùng mục đích thành một mục; không chép toàn bộ hội thoại hay từng lệnh đọc file.
- Ghi thời gian thực theo `YYYY-MM-DD HH:mm:ss +07:00` (Asia/Saigon), người thực hiện, lý do, đường dẫn file và nội dung đổi, kiểm tra/kết quả, việc còn lại. Mốc quá khứ không rõ giờ phải ghi đúng mức độ biết được.
- Khi đổi quyết định, thêm mục có mã `D-xxx` vào `spec/decisions.md`; chỉ rõ quyết định bị thay thế. Đề xuất của AI chưa được chốt phải mang nhãn đề xuất.
- Khi đổi tính năng, cập nhật `spec/scope.md` và phần tương ứng của `hackathon/plan.md` trong cùng đợt. Khi đổi tiến độ/công việc tiếp theo, cập nhật `spec/progress.md`. Không tạo bản plan song song.
- Chỉ đánh dấu hoàn thành khi có bằng chứng; phân biệt code có ở repo này, code được handoff nhắc đến ở repo khác, test local và kết quả Fuji. Không biến kết quả phiên trước thành kiểm thử vừa chạy.
- Nhật ký giữ lịch sử theo thứ tự thời gian; sai sót được đính chính bằng mục mới. Không xóa dấu vết quyết định cũ. Không ghi secrets hay dữ liệu cá nhân của khách thuê vào hồ sơ làm việc.
- Theo quy ước đã được Vy nêu trong handoff: sau đợt thay đổi hoàn tất, kiểm tra phù hợp, commit với danh tính Git `NhatVy177`, push đúng repo/nhánh đang làm và báo commit. Kiểm tra remote trước khi push; tôn trọng yêu cầu mới nếu Vy bảo chưa commit/push. Không gom thay đổi không liên quan của người khác vào commit.
- Nếu dừng giữa chừng, để lại công việc đang làm, file đã chạm, kết quả kiểm tra và bước tiếp theo trong `spec/progress.md`/`spec/journal.md`.

Đây là quy ước để AI chủ động tuân theo, không phải hệ thống tự động thu thập hội thoại. Mẫu ghi chép nằm trong `spec/README.md`.
