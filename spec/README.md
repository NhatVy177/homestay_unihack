# Sổ làm việc HomeStayDorm × UniHack

Khởi tạo: **2026-11-05 00:38:27 +07:00** (Asia/Saigon).

Thư mục Markdown gọn để Vy và AI tiếp nối công việc: hiểu đang xây gì, vì sao chọn như vậy, code đã đến đâu và lần gần nhất đã sửa gì. Không cần cài OpenSpec hay chạy công cụ riêng.

## Đọc từ đâu?

| File | Trả lời câu hỏi |
|---|---|
| [progress.md](progress.md) | Hiện tại đã làm đến đâu, đang vướng gì, tiếp theo làm gì? |
| [scope.md](scope.md) | Chức năng nào sẽ làm và khi nào được xem là hoàn thành? |
| [decisions.md](decisions.md) | Đã thống nhất điều gì, căn cứ đâu, điều gì còn mở? |
| [journal.md](journal.md) | Ngày giờ nào thảo luận/sửa gì, trong file nào, kiểm tra ra sao? |

AI mới đọc theo thứ tự bảng, rồi phần liên quan trong [plan hiện hành](../hackathon/plan.md) và [handoff lịch sử](../hackathon/handoff.md). Hướng dẫn áp dụng toàn repo nằm ở [AGENTS.md](../AGENTS.md).

## Nguồn và cách giải quyết mâu thuẫn

- Yêu cầu mới nhất của Vy quyết định hướng làm. `scope.md` là bản tóm tắt nghiệm thu; `hackathon/plan.md` vẫn là kế hoạch chi tiết duy nhất. Khi scope đổi, cập nhật cả hai, không xem chúng là hai kế hoạch độc lập.
- `progress.md` phải dựa vào Git/code/kết quả kiểm tra; không dùng một kế hoạch hay lời bàn giao để chứng minh tính năng đã chạy.
- `handoff.md` lưu bối cảnh phiên AI trước; các repo/branch/đường dẫn trong phần gốc có thể đã cũ. `Proposal.md` lưu các hướng đã cân nhắc. `Unihack_Context.md` là kiến thức nền; `hackathon/README.md` là thông tin cuộc thi được tổng hợp trước đây.
- Nếu nguồn mâu thuẫn chưa có kết luận: ghi câu hỏi mở trong `decisions.md`, ảnh hưởng trong `progress.md`; tiếp tục phần không phụ thuộc. Không tự coi giả định là yêu cầu đã chốt.
- Phiên khởi tạo này đọc tài liệu local, không xác minh lại website cuộc thi hoặc nhánh Avalanche cũ. Ngày/giờ deadline còn mâu thuẫn phải được kiểm tra trước khi lập lịch nộp thực tế.

## Cách cập nhật đơn giản

1. Trước khi làm: xem trạng thái và xác định mã chức năng/công việc liên quan.
2. Có kết luận từ trao đổi: ghi nhật ký, thêm quyết định nếu cần; chỉ sửa scope/plan khi phạm vi thực sự đổi.
3. Sửa file: ghi đường dẫn và nội dung thay đổi cụ thể, lý do, kết quả kiểm tra. Một mục cho một đợt cùng mục đích; ghi cả file tài liệu/quy tắc làm việc đã đổi.
4. Kết thúc: cập nhật tiến độ, việc tiếp theo, commit/push theo quy ước. Phiên chỉ thảo luận vẫn ghi nhật ký; câu xã giao không cần mục riêng.

Mọi thời gian mới dùng **giờ Việt Nam `+07:00`**, lấy từ đồng hồ thực tế. Phân biệt thời gian sự kiện và thời gian ghi lại. Với lịch sử chỉ biết ngày, viết `2026-11-04 (không rõ giờ; ghi lại ngày ...)`.

Mẫu thêm vào cuối `journal.md`:

```markdown
## YYYY-MM-DD HH:mm:ss +07:00 — J-xxx — Tiêu đề

- Người thực hiện: Vy / AI đang làm việc.
- Trao đổi/yêu cầu: ...
- Kết luận: đã chốt / đề xuất / còn mở; liên kết D-xxx hoặc câu hỏi Q-xxx.
- Liên quan: F-xxx (chức năng), T-xxx (công việc), nếu có.
- File và nội dung: `đường/dẫn` — thêm/sửa/xóa gì, vì sao. Nếu chỉ thảo luận, ghi rõ chỉ cập nhật hồ sơ.
- Kiểm tra: lệnh hoặc cách kiểm tra, kết quả và phần chưa kiểm tra.
- Còn lại/bước tiếp: ...
- Git: commit/nhánh và trạng thái push nếu đã biết.
```

Không cần thêm commit chỉ để chèn hash của chính commit đang chứa nhật ký. Dùng mã `J-xxx` trong commit message, tra bằng `git log --all --grep="J-xxx"`; xác nhận push bằng remote và báo hash trong phản hồi cuối. Lần cập nhật sau có thể bổ sung hash đã biết.

Quy ước trạng thái công việc: **chưa bắt đầu**, **đang làm**, **chờ phụ thuộc**, **hoàn thành** (kèm bằng chứng). “Được phiên trước báo đã có” là nguồn tham khảo, không phải trạng thái hoàn thành ở repo hiện tại.
