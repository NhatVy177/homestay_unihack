# Tiến độ hiện tại

Cập nhật: **2026-11-11 13:41:52 +07:00** (J-X067). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

Hạn nộp **21/11/2026 23:59** (mục tiêu nội bộ 20/11). Web2 chạy được trên máy local. Luồng hợp đồng Avalanche **mới chạy local (Hardhat 31337)**. RPC Fuji đã xác nhận deployer nhận **0,05 AVAX** từ faucet; accountant và relayer vẫn 0. A2 có code/test chuẩn bị nhưng chưa gửi funding/deploy, chưa có contract/source verification Fuji, chưa thử OTP Privy hoặc trọn luồng SQL/SMTP/giao diện thật. Đây vẫn là rủi ro lớn nhất vì Technical + Avalanche chiếm 50/100 điểm.

**Việc đang chờ Vy:** chuyển thêm 0,3 AVAX thử C-Chain từ ví Console đã nhận faucet sang deployer `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f`. Nạp hai ví phụ cần 0,2 AVAX cộng phí, hiện thiếu ít nhất 0,15 cộng gas; đây là tiền dự phòng, không phải phí deploy. Vy đã cho tiếp tục code A2; chưa cần mua AVAX thật. Khóa Console do Vy giữ, không gửi qua chat. Ví Console/P-Chain không tự cộng vào số dư deployer C-Chain.

## Mức sẵn sàng theo tiêu chí chấm

| Tiêu chí (điểm) | Đã có | Còn thiếu |
|---|---|---|
| Technical (25) | Contract + 18 test, backend 31 test, build frontend qua; gói bàn giao v2 có điều khoản hợp đồng | Chạy trọn luồng thật một lần; README cài DB từ đầu |
| Avalanche (25) | Contract EIP-712, relayer trả gas, ví nhúng, trang kiểm chứng (chạy local); ví Fuji đã tạo | **Faucet → deploy + verify source Fuji → giao dịch thật, link explorer** |
| Creativity (15), Impact (15) | Bài toán thật, luồng D-026 → D-038 đã chốt | Slide nêu người dùng, giới hạn pháp lý, vì sao on-chain |
| Pitch (10) | Kịch bản video 2:50 đề xuất ở J-041 (chưa chốt) | Slide, video, README nộp |
| UI/UX (10) | Khung trang mọi vai trò; không gian Sale đã làm lại | 5 màn trên đường demo (B1–B5) còn `style` viết tay |

## Nhánh

| Nhánh | Nội dung | Trạng thái |
|---|---|---|
| `main` (`3725840`) | Đã merge PR #4 chứa nhánh tích hợp và A1/C1/Sale | Gốc tạo nhánh A2, đã kiểm ancestry A1/C1 |
| **`integration/2026-11-11`** (Claude) | Gộp 5 nhánh UI/audit/A1/C1/Sale | Đã vào main; không tự merge/push main |
| `chore/fuji-deploy` (Codex) | A2; worktree `D:\HomeStayDorm-fuji-deploy` từ `origin/main` `3725840`; khóa giữ ở worktree A1 | Code/test chuẩn bị; chờ đủ AVAX để funding/deploy/verify/config thật |
| `feat/t22-backend` (Claude) | Khách tự giữ chỗ, từ chối → "Đã xem", "Không thuê nữa", "Khách không đến" | Có code + test đầu vào; SQL chưa chạy lên HOMEDORM4; chưa nối giao diện; chưa gộp vào nhánh tích hợp (việc C5) |
| `docs/review-branch-workflow` | Quy tắc "không push main" | Nội dung đã có trong AGENTS.md; xóa được |

Nhánh tích hợp đã vào main; các nhánh cũ đã gộp có thể được Vy dọn sau. **Mọi nhánh mới tạo từ `origin/main` sau khi đã merge.** AI không tự xóa các nhánh/worktree hoặc bộ khóa đang dùng.

## Thứ tự ưu tiên (D-037, Vy chốt 11/11)

| Ngày | Việc | Trạng thái |
|---|---|---|
| 11–12/11 | **Fuji trước**: A1 ví → faucet → A2 deploy, verify source, đổi `.env` → A3 chạy trọn luồng thật, lưu link giao dịch | A1 xong; deployer 0,05 AVAX; A2 code/test chuẩn bị, chờ nạp thêm |
| 13–15/11 | Phần T-22 trên đường demo (C2, C3, C4, C6) + giao diện 5 màn demo (B1–B5) | C1 đã xong sớm |
| 16–17/11 | Phần T-22 còn lại nếu kịp (C5); B6, B7; dự phòng | |
| 18–19/11 | README, slide, video (D1–D3); dọn dẹp E1–E3 nếu còn thời gian | |
| 20/11 | Nộp; 21/11 dự phòng | |

## Công việc

| Mã | Việc | Trạng thái | Bước kế |
|---|---|---|---|
| T-08 | Deploy, verify source, nghiệm thu Fuji | A2/J-X067: funding nạp đủ 0,1 mỗi ví/skip ví đủ; deploy có check/pending/role readback; Sourcify v2 exact-match verifier; test local qua. Deployer 0,05 AVAX, chưa deploy | Nạp thêm → funding → deploy → verify thật → env/config → A3 |
| T-11 / T-14 | Bàn giao Web2 → email → OTP → ký | Có code, test tự động qua, **chưa chạy thật** | Chạy thật trong A3 |
| T-22 | Luồng D-026 → D-038 | C1 xong code + test + migration HOMEDORM4 (J-X061, J-X062); 4 mục giữ chỗ có code backend ở `feat/t22-backend`; còn lại chưa làm | Bảng mức ưu tiên bên dưới |
| T-21 | Giao diện | Khung, token, form, danh sách (D-032, D-033); không gian Sale làm lại (D-035, D-036, J-X064 → J-X066) | B1–B5, rồi B7 (việc nhỏ còn lại của Sale) |
| T-09 | Hồ sơ nộp | Chưa bắt đầu | D1–D3 |
| T-04 | Nguồn tiền cọc và dữ liệu demo | Nguồn cọc đã chốt (D-034, D-038). HOMEDORM4 có 2 phiếu cọc, **0 hợp đồng** | Tạo một hợp đồng demo bằng luồng Web2 trước A3 |
| T-13 | Privy JWT (bỏ OTP) | Tạm dừng, chờ BTC (Q-10) | Giữ OTP |

## T-22 theo mức ưu tiên (D-037)

| Mức | Mục | Quyết định | Trạng thái |
|---|---|---|---|
| **Phải có** (trên đường demo) | Điều khoản hợp đồng + phiên bản chính sách + mã băm ảnh hợp đồng vào gói bàn giao | D-027, D-031, D-034 | **Xong code + test (C1)**; migration đã chạy; chưa chạy thật qua giao diện |
| | Màn kiểm tra trả phòng so trước/sau | D-030 | Chưa làm (C2) |
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

## Lưu ý khi chạy thật (từ đợt xem code J-C060)

- **Bàn giao giờ cần 2 điều kiện trước** (C1, D-034): khách đã thấy bản chính sách lưu theo phiếu cọc (2 phiếu cũ phải bấm xác nhận bổ sung), và Sale đã tải ảnh hợp đồng đã ký ở màn Lập hợp đồng. Thiếu thì màn quản lý báo lý do, biên bản chưa tới khách.
- **Sale không còn lối đăng ký trả phòng** (D-036): khách tự gửi yêu cầu trả phòng trên cổng khách.
- Không gian Sale mới chỉ thử với API giả; chưa thử bằng tài khoản Sale thật.
- Bản A2 `fuji:fund` nạp đủ 0,1 mỗi ví, bỏ qua ví đủ và hỗ trợ `--check`; bản A1 cũ ở worktree chứa khóa vẫn là 0,3. Chạy **script A2 với cwd thư mục khóa A1** theo `blockchain/README.md`, không chạy nhầm npm script A1. Nếu RPC lỗi sau broadcast, kiểm hash/receipt trước khi thử lại.
- Kiểm tra mới J-X067: blockchain 25 pass/1 skip SQL, 10/10 ca tiện ích Fuji chạy lại sau sửa chẩn đoán số dư; backend 31 pass/1 skip SQL; frontend build và `test:avalanche-ui` pass. Link explorer trang Verify đúng ở 1440/390, không JS exception/cuộn ngang; 2 ảnh/report tại `web/frontend/.ui-screens/a2-verify/` dùng địa chỉ giả, không phải deployment. Style inline trang Verify 0→0. `deploy --check` đọc Fuji 43113 và ước tính 1.599.089 gas, không gửi; `fund --check` dừng vì thiếu ít nhất 0,15 AVAX cộng gas; `verify --check` dừng đúng vì chưa có manifest. Không chạy SQL/migration, không đổi env đang chạy, không source verification thật; script verifier kiểm bằng HTTP fixture.

## Kiểm tra gần nhất (2026-11-11 09:3x, chạy trên nhánh tích hợp, J-C060)

- `blockchain npm test`: 18 qua, 1 bỏ qua (test SQL), 0 lỗi.
- `web/backend npm test`: 31 qua, 1 bỏ qua, 0 lỗi.
- `web/frontend`: `vite build` qua (cảnh báo kích thước gói); `test:avalanche-ui` qua; `test:handover-ui` qua.
- **Không chạy**: test cần SQL Server, luồng qua giao diện với tài khoản thật, Privy thật, Fuji. Các script chụp ảnh giao diện của Codex (`ui-sale-*.mjs`) không chạy lại.

## Môi trường local (không chứa giá trị bí mật)

- `web/backend/.env`: chain local `31337`, `PRIVY_AUTH_MODE=email`, SMTP đã cấu hình, ví mô phỏng bật. `MAIL_REDIRECT_TO` đang tắt; email nhân viên trong DB trỏ về hộp thư thử của Vy.
- Ví Fuji: `D:\HomeStayDorm-fuji\blockchain\.env` và `.fuji-backend-env.local` (bị Git bỏ qua). Deployer kiêm manager `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f`; accountant `0x9F86a6119723f46d2e8236C2935f660918cCbf0D`; relayer `0x8C8D363E9430bD7e8ED72752Fb1356Bec0fe62f9`. Đọc RPC trong J-X067: deployer 0,05 AVAX, hai ví phụ 0; chỉ đọc, chưa chuyển hoặc deploy.
- HOMEDORM4: đã có hai bảng mới của C1 (`DepositPolicySnapshot`, `SignedContractEvidence`); 2 phiếu cọc, 0 hợp đồng. Dữ liệu giao dịch đã dọn ngày 06/11 (J-030).
- Thư mục làm việc: `D:\HomeStayDorm` (`feat/ui-refresh-1`), `-audit` (nhánh tích hợp), `-fuji` (bộ khóa A1), `-fuji-deploy` (A2), `-handover`, `-sale`, `-t22`, `-ui` (AI khác). Không nhập thay đổi giữa các worktree ngoài quy trình review.

## Câu hỏi còn mở

Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Q-01 đã chốt ở D-034/D-038; Q-02 đã đóng ở D-038.
