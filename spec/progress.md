# Tiến độ và điểm tiếp tục

Cập nhật quyết định nghiệp vụ: **2026-11-05 02:13:15 +07:00**. Đối chiếu code thực tế: **2026-11-05 14:43:07 +07:00** (J-006) — xem mục “Đính chính 14:43” ngay dưới; các dòng cũ bên dưới giữ làm lịch sử.

## Cập nhật 15:29 (J-007) — triển khai D-010 → D-013

Đã code trong repo này (chưa commit tại thời điểm viết dòng này; xem Git cho commit J-007):
- Vòng xem/yêu cầu sửa/bản mới ở Web2; lưu biên bản Web2 tự phát hành bản xem cho khách; khách xác nhận → backend ghi bản đó lên chain rồi khách ký ngầm; không còn bắt tick “đã lưu”; email thông báo (dev-log khi chưa có SMTP).
- Privy JWT-based auth (backend ký RS256 + JWKS, script `privy:keygen`), frontend ví nhúng không đăng nhập thứ hai, ký ngầm.
- UI: khu xác nhận trong tab Hợp đồng của khách; tab “Khách xác nhận biên bản” (quản lý), “Khách xác nhận đối soát” (kế toán); bỏ ô “khách đã ký biên bản” ở tab bàn giao; `/ho-so-xac-nhan` dùng lại các component mới; xóa `PrivyPortal.jsx`.
- SP05 `SP_LapBienBanBanGiaoVao` không còn chặn khi chưa ký giấy; migration `20261105b_payment_simulator.sql`; **đã chạy `avalanche:db:migrate` trên DB local HOMEDORM4** (thêm `PaymentSimOrder`, cập nhật SP05).
- Cổng ví điện tử mô phỏng cho tiền cọc (backend + trang `/thanh-toan-mo-phong/:id` + nút trong phiếu cọc).

Kiểm tra lúc 15:0x–15:2x: `blockchain npm test` 12 pass/1 skip; `TEST_SQL=true npm run test:sql` 1 pass (SQL Server thật); `web/backend npm test` 6 pass; `web/frontend npm run build` qua (cảnh báo chunk lớn có sẵn); `npm run test:avalanche-ui` PASS (Chrome headless, API giả lập trong test); truy vấn đọc `sources.js` trên DB thật đúng (cọc, chính sách, danh sách biên bản chưa gửi, đối soát).

**Chưa kiểm tra:** Privy thật (cần app ID + dán public key vào dashboard), email SMTP thật, luồng lập biên bản Web2 → tự phát hành chạy qua HTTP với DB thật (sẽ tạo dữ liệu thật nên chưa chạy), cổng mô phỏng qua HTTP với phiếu cọc thật, deploy/verify Fuji.

## Đính chính 14:43 (J-006) — code đã có trong repo

- Commit `fadd0ec` (01:39, trên main/origin) **đã có** `blockchain/contracts/DormSettlement.sol` (EIP-712, nonce, deadline, ERC-1271 qua SignatureChecker, không giữ tiền, ghi chú “Adapted from 09f8270”), toolchain Hardhat 3 + solc 0.8.38 + viem, scripts compile/deploy local/Fuji, evidence/confirmation dùng chung; backend `integrations/avalanche/` (relayer ký sẵn raw tx lưu trước khi broadcast, đồng bộ receipt/event, CAS), route `/api/avalanche`, migration `database/migrations/20261105_avalanche.sql`; frontend Privy (`/ho-so-xac-nhan`) và trang Verify (`/kiem-chung-avalanche`).
- Kiểm tra lúc 14:4x: `cd blockchain && npm test` → **11 pass, 0 fail, 1 skip** (test SQL Server bị skip vì không chạy với `.env`). Chưa chạy build frontend, chưa chạy với SQL Server/Privy thật, **chưa deploy/verify Fuji**.
- Khoảng trống so với D-009 thấy khi đọc code: contract chỉ cho `proposeHandover` một lần/hồ sơ (không có phiên bản biên bản bàn giao hay hành động “yêu cầu chỉnh sửa”); chưa có email link; portal là trang riêng có đăng nhập Privy bằng email lần hai, nhân viên nhập tay mã biên bản/chính sách/ảnh; chưa nối vào màn hợp đồng hiện có. Các đề xuất xử lý ghi ở J-006, **chưa chốt**.
- `hackathon/plan.md` đang có thay đổi chưa commit (xóa mục “Tổ chức code đã chọn sau khi đọc Senpai”), không do phiên J-006 tạo; chờ Vy xác nhận.

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
| T-03 | Kiểm tra nền Avalanche cũ để tiếp nối | Đã được nhập/viết lại trong `fadd0ec` (theo ghi chú contract); chưa so diff với nhánh cũ — J-006 | Q-04; so diff/đường dẫn và scope trước khi nhập. Kết quả test cũ không thay test hiện tại. |
| T-04 | Chốt nguồn cọc/policy và dữ liệu demo | Chưa bắt đầu | Q-01/Q-02/Q-05; đã đọc calculator local, chưa chốt ý nghĩa số cọc. |
| T-05 | Thử ví → chữ ký → relayer → receipt | Đang làm: test local qua (J-006); chưa thử Privy thật/Fuji | F-01/F-05; Q-03 nghiêng về Privy theo code, chưa thử khôi phục ví thật. |
| T-06 | Thu gọn contract và thêm xác nhận ký | Đang làm: contract + test local có trong `fadd0ec`; thiếu phiên bản biên bản bàn giao theo D-009 | F-02/F-03/F-04/F-05; bỏ bước tiền/báo trước cũ, test quyền/replay/version/số học. |
| T-07 | Nối UI ba vai trò, SQL, evidence và Verify | Chưa bắt đầu | F-02/F-03/F-04/F-06/F-07/F-08; cần kiểm tra SQL và receipt/event phục hồi. |
| T-08 | Deploy, verify source và nghiệm thu Fuji | Chưa bắt đầu | F-09; chưa có deployment/tx/source verification được xác minh trong repo mới. |
| T-09 | Hồ sơ nộp và demo | Chưa bắt đầu | README setup/ghi công, video 2–3 phút, slides, kiểm tra link; Q-06/Q-07. |
| T-10 | Tổ chức module blockchain sau khi đọc Senpai | Hoàn thành | Khung root + integration client/server, private package chưa có dependencies; 34 link local, JSON, ignore rules và diff đã kiểm tra. Commit mang mã J-004. Không đồng nghĩa hoàn thành tính năng blockchain. |
| T-12 | Cổng ví điện tử mô phỏng cho tiền cọc (D-013) | Đang làm: code + unit test + UI smoke qua (J-007) | Còn chạy thử với phiếu cọc thật qua HTTP; đặt `PAYMENT_SIM_SECRET`. |
| T-14 | Ví nhúng bằng OTP email (D-015) + môi trường test local | Đang làm (J-009, 23:50): code xong; `.env` local trỏ chain Hardhat 31337; `run.ps1` tự mở chain + deploy; backend chạy thật báo `enabled:true, walletAuth:email`; test 12+6 pass, build + smoke qua | **Vy chạy `run.ps1` và thử trên trình duyệt**: lập biên bản → khách nhập OTP → xác nhận. Chưa ai thử OTP Privy thật. |
| T-13 (tạm dừng, chờ Q-10) | Cấu hình Privy JWT + thử khôi phục ví (D-011) | JWT-based auth cần gói Scale trả phí. Đã làm (J-008, 15:44): App ID đã xác minh với Privy (app “HomeStayDorm”), đã điền `.env` local, đã tạo khóa RS256 (`web/backend/secrets/`, ngoài Git), backend ký JWT verify được | Chờ Vy bật JWT-based auth + dán public key trên dashboard (`custom_jwt_auth` đang `false`); sau đó deploy local, bật `AVALANCHE_ENABLED` và thử đăng nhập lại/đổi trình duyệt vẫn cùng ví. |
| T-11 | Nối bàn giao Web2 → email → chữ ký Avalanche theo D-009/D-010 | Đang làm: code + test local xong (J-007); chưa E2E HTTP/Privy/Fuji | Kiểm tra luồng nhân viên lập, khách xem/yêu cầu sửa/ký hoặc mở email sau; quyền, version, trạng thái thực tế vs điện tử, receipt và chống gửi trùng. |

## Kiểm thử: phân biệt nguồn kết quả

| Nguồn | Điều đã biết | Giới hạn |
|---|---|---|
| Phiên cấu trúc lại repo, trước `40acf39` | Frontend `npm run build` qua; backend `node --check` qua; đường dẫn SQL kiểm tra tồn tại; hash 4 file UniHack khi chép trùng nguồn. | Không E2E SQL; build có cảnh báo bundle lớn và `use client`; không phải kiểm thử Avalanche. Hai dòng trắng cuối run.bat/run.ps1 là thay đổi có sẵn, đã giữ lại. |
| Handoff phiên AI cũ, mục 9 | Báo 4 test contract + 3 adapter, build frontend, deploy EVM local qua. | Chỉ là báo cáo lịch sử ở nhánh cũ; chưa chạy lại, chưa bao gồm ví/relayer/scope mới và không chứng minh Fuji. |
| Phiên sổ làm việc | Đọc đủ 5 file hackathon, đối chiếu Git và calculator local. | Kiểm tra tài liệu mới ghi ở J-003; không chạy app/test nghiệp vụ trong đợt chỉ sửa tài liệu. |
| Phiên tổ chức blockchain | Đọc Senpai local tại `cde33571a348c26bae614f11aa31b32487cbc285`: contract, Foundry config, export artifact, ví/ký, relayer/API và README. | Chưa chạy Senpai, chưa kiểm deployment; giữ nguyên thay đổi có sẵn `senpai/web/package-lock.json`. Kết quả kiểm tra khung ghi ở J-004. |

## Bước tiếp theo cho AI

**Sau J-007 (15:29):** (1) T-13 cấu hình Privy và thử thật trên localhost; (2) deploy local rồi chạy E2E HTTP với DB demo (có kế hoạch dọn dữ liệu) cho: lập biên bản → khách sửa/xác nhận → kế toán đối soát v1/v2 → Verify; (3) T-08 deploy + verify Fuji; (4) chạy thử cổng mô phỏng với phiếu cọc demo; (5) T-09 README nộp bài/video. Q-01, Q-08, Q-09 vẫn mở.

**Ưu tiên theo yêu cầu mới (mốc cũ):** đối chiếu code Codex vừa làm với D-009/F-02. Tái dùng UI, API, Privy, relayer và contract thực tế; chỉ bổ sung phần thiếu, test rồi ghi kết quả thật. Đừng coi có bản ghi BG trong SQL là có trang khách xem. Sau đó tiếp tục các nhiệm vụ dưới đây nếu chưa xong.

Mốc cũ (00:50): Bắt đầu T-03: đọc nhánh Avalanche cũ và đối chiếu với scope hiện hành, xác định phần tái sử dụng vào khung đã có; sau đó T-04/T-05. Di chuyển adapter phụ thuộc nghiệp vụ sang integration backend; giữ mã thuần dùng chung ở blockchain/src. Chọn toolchain sau khi rà nền cũ, rồi bổ sung dependency/lockfile, compile/test và cách nối shared vào hai app. Khi bắt tay triển khai, thử một luồng nhỏ trước khi làm nhiều màn hình; không lấy mô tả handoff làm bằng chứng đã tích hợp.

Vướng mắc đang biết nằm ở Q-01 đến Q-07 trong [decisions.md](decisions.md). Chưa có tác vụ triển khai blockchain đang chạy hoặc thay đổi code ứng dụng dở dang do đợt ghi sổ này.
