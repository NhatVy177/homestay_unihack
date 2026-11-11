# Tiến độ hiện tại

Cập nhật: **2026-11-11 10:11 +07:00** (J-C061). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

Hạn nộp **21/11/2026 23:59** (mục tiêu nội bộ 20/11). Web2 chạy được trên máy local. Phần Avalanche **mới chạy trên chain local (Hardhat 31337)**: đã có 3 ví Fuji nhưng **số dư bằng 0**, chưa deploy, chưa có giao dịch Fuji nào, chưa ai thử mã OTP Privy thật, chưa chạy trọn luồng bàn giao → đối soát → kiểm chứng qua giao diện với SQL Server thật. Đây vẫn là rủi ro lớn nhất vì Technical + Avalanche chiếm 50/100 điểm.

**Việc đang chờ Vy:** xin AVAX thử cho ví deployer `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f` tại https://build.avax.network/console hoặc https://team1vn.xyz/faucet.html, rồi giao việc A2.

## Mức sẵn sàng theo tiêu chí chấm

| Tiêu chí (điểm) | Đã có | Còn thiếu |
|---|---|---|
| Technical (25) | Contract + 18 test, backend 31 test, build frontend qua; gói bàn giao v2 có điều khoản hợp đồng | Chạy trọn luồng thật một lần; README cài DB từ đầu |
| Avalanche (25) | Contract EIP-712, relayer trả gas, ví nhúng, trang kiểm chứng (chạy local); ví Fuji đã tạo | **Faucet → deploy + verify source Fuji → giao dịch thật, link explorer** |
| Creativity (15), Impact (15) | Bài toán thật, luồng D-026 → D-038 đã chốt | Slide nêu người dùng, giới hạn pháp lý, vì sao on-chain |
| Pitch (10) | Bản nháp README nộp bài, dàn ý 10 slide, kịch bản video 2:40 (J-C063) | Điền địa chỉ contract, 6 link giao dịch, phí gas sau A2/A3; ghi công (Q-07); Vy dựng slide và quay video |
| UI/UX (10) | Khung trang mọi vai trò; không gian Sale đã làm lại | 5 màn trên đường demo (B1–B5) còn `style` viết tay |

## Nhánh

| Nhánh | Nội dung | Trạng thái |
|---|---|---|
| `main` (`3725840`) | Đã có nhánh tích hợp `integration/2026-11-11` (PR #4): ui-refresh-1, audit, A1, C1, không gian Sale | Gốc cho mọi nhánh mới |
| `feat/ui-shared-shell` (Claude) | B0: khung chung cho 5 vai trò; bỏ tab của ứng dụng cũ (D-039); sửa lỗi tab kế toán | Chờ Vy merge |
| `feat/ui-list-b1` (Claude) | Tạo từ `feat/ui-shared-shell` (nên chứa luôn B0). Bộ danh sách chung theo mẫu bên Hằng (J-C062); bản nháp hồ sơ nộp D1–D3 (J-C063) | Chờ Vy merge; merge PR này là có cả B0 |
| `feat/t22-checkout` (Claude) | Tạo từ `feat/ui-list-b1`. C2 + B3: màn kiểm tra trả phòng so trước/sau, ảnh lúc trả phòng (J-C064); tiếp theo C3, C4 trên cùng nhánh | Đang làm; bảng `KiemTraTraPhongAnh` đã tạo trên HOMEDORM4 |
| `feat/t22-backend` (Claude) | Khách tự giữ chỗ, từ chối → "Đã xem", "Không thuê nữa", "Khách không đến" | Có code + test đầu vào; SQL chưa chạy lên HOMEDORM4; chưa nối giao diện; chưa gộp vào nhánh tích hợp (việc C5) |
| `docs/review-branch-workflow` | Quy tắc "không push main" | Nội dung đã có trong AGENTS.md; xóa được |

Sau khi merge nhánh tích hợp, xóa được trên GitHub: 5 nhánh đã gộp, `feat/t20-checkin-deposit-fixes`, `docs/d026-flow-redesign`, `docs/review-branch-workflow`. **Mọi nhánh mới tạo từ `origin/main` sau khi đã merge.**

## Thứ tự ưu tiên (D-037, Vy chốt 11/11)

| Ngày | Việc | Trạng thái |
|---|---|---|
| 11–12/11 | **Fuji trước**: A1 ví → faucet → A2 deploy, verify source, đổi `.env` → A3 chạy trọn luồng thật, lưu link giao dịch | A1 xong; chờ faucet |
| 13–15/11 | Phần T-22 trên đường demo (C2, C3, C4, C6) + giao diện 5 màn demo (B1–B5) | C1 đã xong sớm |
| 16–17/11 | Phần T-22 còn lại nếu kịp (C5); B6, B7; dự phòng | |
| 18–19/11 | README, slide, video (D1–D3); dọn dẹp E1–E3 nếu còn thời gian | |
| 20/11 | Nộp; 21/11 dự phòng | |

## Công việc

| Mã | Việc | Trạng thái | Bước kế |
|---|---|---|---|
| T-08 | Deploy, verify source, nghiệm thu Fuji | A1 xong (J-X058): script `fuji:keygen`, `fuji:fund`, 3 ví trong `D:\HomeStayDorm-fuji\blockchain` (file bị Git bỏ qua). Số dư 0, chưa deploy | Vy xin faucet → A2 → A3 |
| T-11 / T-14 | Bàn giao Web2 → email → OTP → ký | Có code, test tự động qua, **chưa chạy thật** | Chạy thật trong A3 |
| T-22 | Luồng D-026 → D-038 | C1 xong code + test + migration HOMEDORM4 (J-X061, J-X062); 4 mục giữ chỗ có code backend ở `feat/t22-backend`; còn lại chưa làm | Bảng mức ưu tiên bên dưới |
| T-21 | Giao diện | Khung, token, form, danh sách (D-032, D-033); không gian Sale (D-035, D-036); **B0 xong (J-C061)**: cả 5 vai trò dùng chung một khung `WorkspaceShell`; **bộ danh sách chung (J-C062)**: ô tìm kiếm có nút xóa, thẻ tổng quan bấm để lọc, nhãn trạng thái có icon, hàng đang tải/lỗi/rỗng, phân trang; đã áp vào 5 màn danh sách không thuộc việc của Codex | Claude: B1, B5, B2. Codex: B7, và B3/B4 gộp vào C2/C3 |
| T-09 | Hồ sơ nộp | Chưa bắt đầu | D1–D3 |
| T-04 | Nguồn tiền cọc và dữ liệu demo | Nguồn cọc đã chốt (D-034, D-038). HOMEDORM4 có 2 phiếu cọc, **0 hợp đồng** | Tạo một hợp đồng demo bằng luồng Web2 trước A3 |
| T-13 | Privy JWT (bỏ OTP) | Tạm dừng, chờ BTC (Q-10) | Giữ OTP |

## T-22 theo mức ưu tiên (D-037)

| Mức | Mục | Quyết định | Trạng thái |
|---|---|---|---|
| **Phải có** (trên đường demo) | Điều khoản hợp đồng + phiên bản chính sách + mã băm ảnh hợp đồng vào gói bàn giao | D-027, D-031, D-034 | **Xong code + test (C1)**; migration đã chạy; chưa chạy thật qua giao diện |
| | Màn kiểm tra trả phòng so trước/sau | D-030 | **Xong code + test (C2, J-C064)**; bảng ảnh đã tạo; HOMEDORM4 chưa có phiếu trả phòng của hợp đồng nên chưa thử dữ liệu thật |
| | Bản nháp đối soát tự soạn; thu thêm qua ví | D-030 | Chưa làm (C3) |
| | Tự thanh lý 3 trường hợp + gói bằng chứng cuối + "Thanh lý không có xác nhận của khách" | D-030, D-031, D-038 | Chưa làm (C4) |
| | Điều khoản xác nhận điện tử trong mẫu hợp đồng; ô đồng ý dữ liệu cá nhân | D-038 | Chưa làm (C6) |
| | Danh sách "Chờ khách xác nhận", nhắc 24/72 giờ | D-028 | Có nút nhắc tay; chưa tự nhắc (trong C4) |
| **Nên có** | Khách tự giữ chỗ; từ chối → "Đã xem"; "Không thuê nữa"; "Khách không đến" | D-026 | Có code backend, chưa chạy SQL, chưa có giao diện (C5) |
| | Chính sách hoàn cọc trên phiếu và email cọc | D-031, D-034 | **Xong code + test (C1)**; chưa thử SMTP thật |
| | Thẻ "Kích hoạt xác nhận điện tử" sau khi trả cọc | D-028 | Chưa làm |
| **Để sau nếu trễ** | Khách tự khai người ở; thành viên bị loại hoàn 80%; hợp đồng "Chờ ký" | D-026, D-027 | Chưa làm |
| | Hóa đơn tháng qua ví; trang "Khoản dự kiến trừ" | D-029 | Chưa làm |
| | Đổi người đại diện bằng email mời | D-026 | Giữ cách tạm |
| **Sau bản thi** | Mốc chuỗi 3; cấp lại ví khi mất email (P-04) | D-031 | Không làm |

## Chia việc giữa Claude và Codex (Vy chia lại 2026-11-11 15:3x, J-C064; thay bảng J-C061)

Nguyên tắc: mỗi file chỉ một người sửa. Chi tiết và prompt: [viec-cho-agent.md](viec-cho-agent.md).

| Người | Việc |
|---|---|
| **Claude** | Chuỗi trả phòng: C2 + B3 (xong), C3 + B4, C4; hồ sơ nộp D1–D3 (bản nháp xong, điền số liệu Fuji sau); C5 đề xuất làm sau C4 |
| **Codex** | Fuji A2, A3 trước; sau đó giao diện B1, B2, B5, B7 và C6; dọn dẹp E1–E3 |
| **Vy** | Faucet; merge PR; chạy luồng thật cùng A3 (OTP, các vai trò); trả lời Q-07; dựng slide, quay video |

## Lưu ý khi chạy thật (từ đợt xem code J-C060)

- **Bàn giao giờ cần 2 điều kiện trước** (C1, D-034): khách đã thấy bản chính sách lưu theo phiếu cọc (2 phiếu cũ phải bấm xác nhận bổ sung), và Sale đã tải ảnh hợp đồng đã ký ở màn Lập hợp đồng. Thiếu thì màn quản lý báo lý do, biên bản chưa tới khách.
- **Sale không còn lối đăng ký trả phòng** (D-036): khách tự gửi yêu cầu trả phòng trên cổng khách.
- Không gian Sale mới chỉ thử với API giả; chưa thử bằng tài khoản Sale thật.
- **Đã sửa lỗi có sẵn trên `main`** (J-C061): tab "Tiền mặt chờ nộp quỹ" của kế toán bị trắng trang khi mở do thiếu `import React`. Cổng khách trên điện thoại trước đây không có menu; nay có.
- Đã bỏ trang `/dashboard` của ứng dụng cũ (HappyRoom) và 3 tab giữ chỗ trống của khách ("Phòng/Giường của tôi", "Hóa đơn", "Bảo trì"). Tab "Thanh lý trả phòng" của quản lý còn giữ cho tới khi C4 làm xong tự thanh lý (D-039).
- `fuji:fund` gửi 0,3 AVAX cho mỗi ví phụ và **chạy lại sẽ gửi tiếp**; cần ví deployer có hơn 0,6 AVAX. Việc A2 có bước sửa (giảm còn 0,1 và bỏ qua ví đã có tiền).

## Kiểm tra gần nhất (2026-11-11 09:3x, chạy trên nhánh tích hợp, J-C060)

- `blockchain npm test`: 18 qua, 1 bỏ qua (test SQL), 0 lỗi.
- `web/backend npm test`: 31 qua, 1 bỏ qua, 0 lỗi.
- `web/frontend`: `vite build` qua (cảnh báo kích thước gói); `test:avalanche-ui` qua; `test:handover-ui` qua.
- Nhánh `feat/t22-checkout` (J-C064, 2026-11-11 15:4x): backend `npm test` 36 qua/1 bỏ qua (thêm 5 test C2); build qua; `test:avalanche-ui`, `test:shell-ui`, `test:list-kit`, `test:handover-ui` qua; `ui-checkout-compare.mjs` mới qua ở 1440/390px (dữ liệu giả). Migration `checkout-photos:db:migrate` chạy 2 lần trên HOMEDORM4: bảng 9 cột, 0 dòng.
- Nhánh `feat/ui-list-b1` (J-C062, 2026-11-11 15:1x): build qua; `test:avalanche-ui` qua; `test:shell-ui` qua; `test:list-kit` mới qua (Kế toán xác nhận tiền về, tiền mặt chờ nộp quỹ, Quản lý duyệt nhận cọc, trạng thái đang tải; 1440 và 390px; dữ liệu giả).
- Nhánh `feat/ui-shared-shell` (J-C061): build qua; `test:avalanche-ui`, `test:handover-ui` qua; `test:shell-ui` mới qua (5 vai trò dùng chung khung, menu điện thoại mở/chuyển/đóng bằng Escape, mở được mọi tab không khóa của khách, Sale, quản lý, kế toán; Admin chỉ kiểm khung và menu); 14 ảnh `ui-screens` không lỗi, không tràn ngang; backend 31 qua.
- **Không chạy**: test cần SQL Server, luồng qua giao diện với tài khoản thật, Privy thật, Fuji. Các script chụp ảnh giao diện của Codex (`ui-sale-*.mjs`) không chạy lại.

## Môi trường local (không chứa giá trị bí mật)

- `web/backend/.env`: chain local `31337`, `PRIVY_AUTH_MODE=email`, SMTP đã cấu hình, ví mô phỏng bật. `MAIL_REDIRECT_TO` đang tắt; email nhân viên trong DB trỏ về hộp thư thử của Vy.
- Ví Fuji: `D:\HomeStayDorm-fuji\blockchain\.env` và `.fuji-backend-env.local` (bị Git bỏ qua). Deployer kiêm manager `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f`; accountant `0x9F86a6119723f46d2e8236C2935f660918cCbf0D`; relayer `0x8C8D363E9430bD7e8ED72752Fb1356Bec0fe62f9`. Số dư deployer lúc 09:3x ngày 11/11: 0.
- HOMEDORM4: đã có hai bảng mới của C1 (`DepositPolicySnapshot`, `SignedContractEvidence`); 2 phiếu cọc, 0 hợp đồng. Dữ liệu giao dịch đã dọn ngày 06/11 (J-030).
- Thư mục làm việc: `D:\HomeStayDorm` (Codex, `feat/ui-refresh-1`), `-audit` (nhánh tích hợp), `-fuji`, `-handover`, `-sale`, `-t22`.

## Câu hỏi còn mở

Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Q-01 đã chốt ở D-034/D-038; Q-02 đã đóng ở D-038.
