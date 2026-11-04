# Tiến độ và điểm tiếp tục

Cập nhật quyết định nghiệp vụ: **2026-11-05 02:13:15 +07:00**. Kết quả kiểm tra code ở dưới là snapshot Codex lúc 00:50, **chưa đối chiếu code local mới của Vy**.

## Điểm đứng hiện tại

- Repo: `https://github.com/NhatVy177/homestay_unihack.git`; local `D:\HomeStayDorm`; branch kiểm tra: `main`; commit trước đợt dựng khung blockchain: `a83b18e` (sổ làm việc, J-003); nền tổ chức Web2: `40acf39`.
- Đã tổ chức `database/`, `web/`, `hackathon/` và push repo mới trong phiên trước. Không thay SQL Server hoặc logic nghiệp vụ khi đổi cấu trúc.
- Đợt hiện tại đọc Senpai local và tạo khung `blockchain/` riêng cùng các vị trí integration frontend/backend theo D-008/J-004.
- **Đã có thư mục/package blockchain nhưng chưa có file Solidity, ABI, trang Avalanche Verify hoặc toolchain chạy được.** Integration mới chỉ có README. Các chức năng F-01–F-09 chưa được triển khai trong repo này; không nhầm khung với nền được handoff mô tả.
- Handoff báo nền contract/adapter/evidence/Verify ở `homedorm/feature/avalanche-settlement`, commit `09f8270`; **chưa kiểm tra lại nhánh đó hoặc nhập về repo này**. Không khởi động lại từ đầu mà bỏ qua nền cũ, cũng không đánh dấu nó đã có ở đây.

## Yêu cầu mới cần đối chiếu code (D-009)

Vy đã chốt: nhân viên dẫn sinh viên xem phòng và lập biên bản trong Web2; sinh viên xem/phản hồi/ký ví nhúng trên trang hợp đồng; nếu chưa ký tại chỗ thì email link để đăng nhập ký sau. Không tự check-in hoặc ký giấy song song; tách đã giao phòng với đã ký Avalanche; không báo đã ký khi chưa có receipt/event. Mốc nhắc 24h chưa chốt. Xem F-02 trong scope.md và mục D-009 trong hackathon/plan.md.

**Đây là thay đổi yêu cầu, không phải báo cáo code đã xong.** Vy thông báo Codex đã code trong phiên riêng; code local/commit chưa push có thể mới hơn snapshot dưới đây. AI phải kiểm tra git status, diff, source và test trước khi sửa, rồi cập nhật tiến độ thực tế.

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
| T-10 | Tổ chức module blockchain sau khi đọc Senpai | Hoàn thành | Khung root + integration client/server, private package chưa có dependencies; 34 link local, JSON, ignore rules và diff đã kiểm tra. Commit mang mã J-004. Không đồng nghĩa hoàn thành tính năng blockchain. |
| T-11 | Nối bàn giao Web2 → email → chữ ký Avalanche theo D-009 | Chờ kiểm tra code local mới | Kiểm tra luồng nhân viên lập, khách xem/yêu cầu sửa/ký hoặc mở email sau; quyền, version, trạng thái thực tế vs điện tử, receipt và chống gửi trùng. |

## Kiểm thử: phân biệt nguồn kết quả

| Nguồn | Điều đã biết | Giới hạn |
|---|---|---|
| Phiên cấu trúc lại repo, trước `40acf39` | Frontend `npm run build` qua; backend `node --check` qua; đường dẫn SQL kiểm tra tồn tại; hash 4 file UniHack khi chép trùng nguồn. | Không E2E SQL; build có cảnh báo bundle lớn và `use client`; không phải kiểm thử Avalanche. Hai dòng trắng cuối run.bat/run.ps1 là thay đổi có sẵn, đã giữ lại. |
| Handoff phiên AI cũ, mục 9 | Báo 4 test contract + 3 adapter, build frontend, deploy EVM local qua. | Chỉ là báo cáo lịch sử ở nhánh cũ; chưa chạy lại, chưa bao gồm ví/relayer/scope mới và không chứng minh Fuji. |
| Phiên sổ làm việc | Đọc đủ 5 file hackathon, đối chiếu Git và calculator local. | Kiểm tra tài liệu mới ghi ở J-003; không chạy app/test nghiệp vụ trong đợt chỉ sửa tài liệu. |
| Phiên tổ chức blockchain | Đọc Senpai local tại `cde33571a348c26bae614f11aa31b32487cbc285`: contract, Foundry config, export artifact, ví/ký, relayer/API và README. | Chưa chạy Senpai, chưa kiểm deployment; giữ nguyên thay đổi có sẵn `senpai/web/package-lock.json`. Kết quả kiểm tra khung ghi ở J-004. |

## Bước tiếp theo cho AI

**Ưu tiên theo yêu cầu mới:** đối chiếu code Codex vừa làm với D-009/F-02. Tái dùng UI, API, Privy, relayer và contract thực tế; chỉ bổ sung phần thiếu, test rồi ghi kết quả thật. Đừng coi có bản ghi BG trong SQL là có trang khách xem. Sau đó tiếp tục các nhiệm vụ dưới đây nếu chưa xong.

Mốc cũ (00:50): Bắt đầu T-03: đọc nhánh Avalanche cũ và đối chiếu với scope hiện hành, xác định phần tái sử dụng vào khung đã có; sau đó T-04/T-05. Di chuyển adapter phụ thuộc nghiệp vụ sang integration backend; giữ mã thuần dùng chung ở blockchain/src. Chọn toolchain sau khi rà nền cũ, rồi bổ sung dependency/lockfile, compile/test và cách nối shared vào hai app. Khi bắt tay triển khai, thử một luồng nhỏ trước khi làm nhiều màn hình; không lấy mô tả handoff làm bằng chứng đã tích hợp.

Vướng mắc đang biết nằm ở Q-01 đến Q-07 trong [decisions.md](decisions.md). Chưa có tác vụ triển khai blockchain đang chạy hoặc thay đổi code ứng dụng dở dang do đợt ghi sổ này.
