# Tiến độ và điểm tiếp tục

Cập nhật: **2026-11-05 00:43:02 +07:00**. Người cập nhật: Codex trong phiên làm việc cùng Vy.

## Điểm đứng hiện tại

- Repo: `https://github.com/NhatVy177/homestay_unihack.git`; local `D:\HomeStayDorm`; branch kiểm tra: `main`; commit nền trước đợt ghi sổ: `40acf39`.
- Đã tổ chức `database/`, `web/`, `hackathon/` và push repo mới trong phiên trước. Không thay SQL Server hoặc logic nghiệp vụ khi đổi cấu trúc.
- Đợt hiện tại thiết lập sổ làm việc `spec/` và hướng dẫn AI; không triển khai chức năng Avalanche.
- **Repo main hiện chưa có `blockchain/`, file Solidity hoặc trang Avalanche Verify.** `git ls-files '*avalanche*' '*blockchain*' '*.sol'` không trả file; App.jsx không có route Avalanche. Đây là khác biệt quan trọng với handoff cũ.
- Handoff báo nền contract/adapter/evidence/Verify ở `homedorm/feature/avalanche-settlement`, commit `09f8270`; **chưa kiểm tra lại nhánh đó hoặc nhập về repo này**. Không khởi động lại từ đầu mà bỏ qua nền cũ, cũng không đánh dấu nó đã có ở đây.

## Công việc và bằng chứng

| Mã | Công việc | Trạng thái trong repo hiện tại | Bằng chứng / bước kế |
|---|---|---|---|
| T-01 | Chuẩn hóa cấu trúc và gom tài liệu | Hoàn thành | `40acf39`; database/web chữ thường, 5 file hackathon gồm handoff; origin repo mới. |
| T-02 | Thiết lập sổ làm việc và chỉ dẫn AI | Hoàn thành | 5 file spec + AGENTS và chú thích nguồn; 31 link local hợp lệ, diff tài liệu qua. Commit chứa mã J-003; kiểm tra trạng thái đồng bộ qua Git. |
| T-03 | Kiểm tra nền Avalanche cũ để tiếp nối | Chưa bắt đầu | Q-04; so diff/đường dẫn và scope trước khi nhập. Kết quả test cũ không thay test hiện tại. |
| T-04 | Chốt nguồn cọc/policy và dữ liệu demo | Chưa bắt đầu | Q-01/Q-02/Q-05; đã đọc calculator local, chưa chốt ý nghĩa số cọc. |
| T-05 | Thử ví → chữ ký → relayer → receipt | Chưa bắt đầu | F-01/F-05; giải quyết Q-03, có thử khôi phục ví. |
| T-06 | Thu gọn contract và thêm xác nhận ký | Chưa bắt đầu | F-02/F-03/F-04/F-05; bỏ bước tiền/báo trước cũ, test quyền/replay/version/số học. |
| T-07 | Nối UI ba vai trò, SQL, evidence và Verify | Chưa bắt đầu | F-02/F-03/F-04/F-06/F-07/F-08; cần kiểm tra SQL và receipt/event phục hồi. |
| T-08 | Deploy, verify source và nghiệm thu Fuji | Chưa bắt đầu | F-09; chưa có deployment/tx/source verification được xác minh trong repo mới. |
| T-09 | Hồ sơ nộp và demo | Chưa bắt đầu | README setup/ghi công, video 2–3 phút, slides, kiểm tra link; Q-06/Q-07. |

## Kiểm thử: phân biệt nguồn kết quả

| Nguồn | Điều đã biết | Giới hạn |
|---|---|---|
| Phiên cấu trúc lại repo, trước `40acf39` | Frontend `npm run build` qua; backend `node --check` qua; đường dẫn SQL kiểm tra tồn tại; hash 4 file UniHack khi chép trùng nguồn. | Không E2E SQL; build có cảnh báo bundle lớn và `use client`; không phải kiểm thử Avalanche. Hai dòng trắng cuối run.bat/run.ps1 là thay đổi có sẵn, đã giữ lại. |
| Handoff phiên AI cũ, mục 9 | Báo 4 test contract + 3 adapter, build frontend, deploy EVM local qua. | Chỉ là báo cáo lịch sử ở nhánh cũ; chưa chạy lại, chưa bao gồm ví/relayer/scope mới và không chứng minh Fuji. |
| Phiên sổ làm việc | Đọc đủ 5 file hackathon, đối chiếu Git và calculator local. | Kiểm tra tài liệu mới ghi ở J-003; không chạy app/test nghiệp vụ trong đợt chỉ sửa tài liệu. |

## Bước tiếp theo cho AI

Bắt đầu T-03: đọc nhánh Avalanche cũ và đối chiếu với scope hiện hành, xác định phần tái sử dụng; sau đó T-04/T-05. Chỉ đọc/ghi hồ sơ được thực hiện trong đợt hiện tại. Khi bắt tay triển khai, thử một luồng nhỏ trước khi làm nhiều màn hình; không lấy mô tả handoff làm bằng chứng đã tích hợp.

Vướng mắc đang biết nằm ở Q-01 đến Q-07 trong [decisions.md](decisions.md). Chưa có tác vụ triển khai blockchain đang chạy hoặc thay đổi code ứng dụng dở dang do đợt ghi sổ này.
