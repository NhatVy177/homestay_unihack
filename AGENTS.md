# Hướng dẫn làm việc trong HomeStayDorm

Áp dụng cho toàn repo và mọi AI (Claude, Codex, AI khác). Giao tiếp với Vy bằng tiếng Việt dễ hiểu. Repo hiện hành: `NhatVy177/homestay_unihack`; không tự chuyển lại repo cũ theo handoff.

## Đầu mỗi phiên: đọc ít, đúng chỗ

1. Đọc [spec/progress.md](spec/progress.md): trạng thái hiện tại, việc đang làm, việc kế tiếp.
2. Đọc mục liên quan đến việc được giao trong [spec/luong-tong-hop.md](spec/luong-tong-hop.md): luồng và quyết định đã gộp.
3. Chạy `git fetch`, xem branch, `git status` và code thực tế trước khi khẳng định tiến độ.

**Chỉ mở khi cần tra chi tiết**, không đọc cả file: `spec/decisions.md` (tìm đúng mã `D-xxx`), `spec/scope.md` (đúng mã `F-xxx`), `spec/journal.md` (vài mục cuối), `hackathon/plan.md` (đúng mục). `spec/archive/`, `hackathon/handoff.md`, `hackathon/Proposal.md` là lịch sử, không phải phạm vi hiện hành.

Nếu `luong-tong-hop.md` khác `decisions.md` thì `decisions.md` đúng; sửa lại `luong-tong-hop.md` trong cùng đợt.

## Nhánh, commit, push

- **Ngoại lệ tạm thời D-061 / J-X091 (Vy chốt 17/11/2026):** hiện chỉ Codex sửa code, nên sau mỗi đợt hoàn tất và kiểm tra phù hợp, chủ động commit/gộp và push lên `main`, không chờ Vy yêu cầu merge riêng. Có thể dùng nhánh/worktree để chuẩn bị và kiểm tra trước khi gộp. Khi Vy thông báo có người/AI khác cùng sửa, hoặc yêu cầu review nhánh/chưa commit/push, quay lại quy trình nhánh riêng từ `origin/main` mới nhất và để Vy duyệt merge. Không tự gom các nhánh hoặc thay đổi cũ ngoài phạm vi đợt đang làm.
- Commit bằng danh tính Git `NhatVy177`. **Không thêm dòng `Co-Authored-By` hay chú thích do AI tạo** vào commit và mô tả PR.
- Push xong báo: tên nhánh, mã commit, danh sách file đã sửa, kết quả kiểm tra.
- Không gom thay đổi không liên quan của người khác. Không commit `.env`, `web/backend/secrets/`, khóa bí mật.
- Hai AI làm song song thì mỗi AI một nhánh và **một thư mục làm việc riêng** (`git worktree`), không dùng chung một checkout.

## Ghi hồ sơ

- **Quyết định (`D-xxx`)**: chỉ ghi khi Vy đã chốt, vào `spec/decisions.md`, nêu quyết định bị thay. Đề xuất của AI chưa chốt phải mang nhãn "đề xuất". Trước khi lấy số mới, chạy lệnh dưới để thấy số lớn nhất trên **mọi nhánh**, rồi push ngay sau khi ghi:
  `git fetch -q; git grep -ohE "^\| D-[0-9]{3}" $(git branch -r --format="%(refname)") -- spec/decisions.md` (chạy được ở cả PowerShell và Bash; lấy số lớn nhất trong kết quả)
- **Nhật ký (`spec/journal.md`)**: một mục cho mỗi đợt có đổi file hoặc có kết luận ảnh hưởng yêu cầu. Mã có chữ cái của AI để hai nhánh không trùng số: `J-C###` (Claude), `J-X###` (Codex), `J-A###` (AI khác); mỗi AI tự đếm tiếp số của mình. Các mã cũ không có chữ cái giữ nguyên. Ghi giờ thật `YYYY-MM-DD HH:mm:ss +07:00` lấy từ PowerShell `Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"`, người làm, lý do, file, kiểm tra, việc còn lại. Mẫu ở [spec/README.md](spec/README.md).
- **Không ghi nhật ký** cho thao tác không đổi file và không đổi yêu cầu: khởi động lại server, chạy lại test, trả lời câu hỏi, xem code.
- Đổi tính năng → sửa `spec/scope.md` và mục tương ứng của `hackathon/plan.md` cùng đợt. Đổi tiến độ → sửa `spec/progress.md`. Không tạo bản kế hoạch song song.
- `spec/progress.md` chỉ giữ **trạng thái hiện tại**: sửa tại chỗ, không chồng thêm mục "cập nhật lúc…". Lịch sử nằm ở journal và Git.
- Nhật ký giữ thứ tự thời gian; sai thì đính chính bằng mục mới, không xóa quyết định cũ. Không ghi secrets hay dữ liệu cá nhân của khách thuê vào hồ sơ làm việc.

## Chất lượng và bằng chứng

- Chỉ đánh dấu hoàn thành khi có bằng chứng. Phân biệt bốn mức: **có code** → **test tự động qua** → **đã chạy thật qua giao diện với SQL Server** → **đã chạy trên Fuji**. Không biến kết quả phiên trước thành kiểm thử vừa chạy.
- Thay đổi SQL: viết thành file trong `database/` chạy lại được, kèm lệnh `npm run …:db:migrate`. **Hỏi Vy trước khi chạy lên HOMEDORM4**; không sửa, xóa dữ liệu đang có khi chưa được đồng ý.
- Trước khi báo xong phần code, chạy phần liên quan: `cd blockchain && npm test`; `cd web/backend && npm test`; `cd web/frontend && npm run build && npm run test:avalanche-ui`.
- Sửa giao diện: theo skill [homestaydorm-ui](.agents/skills/homestaydorm-ui/SKILL.md).
- Dừng giữa chừng: ghi việc dở, file đã chạm, kết quả kiểm tra và bước tiếp vào `spec/progress.md`.

Đây là quy ước để AI chủ động tuân theo, không phải hệ thống tự động.
