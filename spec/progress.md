# Tiến độ hiện tại

Cập nhật: **2026-11-11 16:05:24 +07:00** (J-C065, gộp A2 J-X068 vào nhánh của Claude). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

Hạn nộp **21/11/2026 23:59** (mục tiêu nội bộ 20/11). Web2 chạy local. **Contract đã deploy và verify source thật trên Fuji (A2/J-X068)**: `0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C`, block 60882820; Sourcify creation/runtime exact match. Hai ví phụ đã nạp 0,1 AVAX mỗi ví. **Luồng xác nhận của khách mới thử local**, chưa chạy trọn A3 với SQL/SMTP/OTP Privy thật; ba giao dịch hạ tầng A2 không thay kết quả nghiệm thu nghiệp vụ.

**Bước kế:** A3: chạy ứng dụng với env Fuji đã chuẩn bị tại worktree A2, chuẩn bị hợp đồng demo theo Web2 rồi thử bàn giao → đối soát → kiểm chứng. Hỏi Vy trước khi chạy SQL lên HOMEDORM4. Chưa cần xin thêm AVAX ở số dư hiện tại; tiếp tục theo dõi phí thật. Khóa Console do Vy giữ, không gửi qua chat.

## Mức sẵn sàng theo tiêu chí chấm

| Tiêu chí (điểm) | Đã có | Còn thiếu |
|---|---|---|
| Technical (25) | Blockchain 25 pass/1 skip, backend 31 pass/1 skip ở J-X067; build Fuji và gói bàn giao v2 | Chạy trọn luồng thật một lần; README cài DB từ đầu |
| Avalanche (25) | Deploy Fuji + Sourcify exact match + vai trò đọc lại đúng + hai ví phụ có tiền; manifest và explorer thật | **A3: năm giao dịch mẫu nghiệp vụ, OTP Privy/SQL/SMTP/giao diện thật** |
| Creativity (15), Impact (15) | Bài toán thật, luồng D-026 → D-038 đã chốt | Slide nêu người dùng, giới hạn pháp lý, vì sao on-chain |
| Pitch (10) | Bản nháp README nộp bài (đã điền địa chỉ contract, verify, ví vận hành), dàn ý 10 slide, kịch bản video 2:40 (J-C063, J-C065) | 6 link giao dịch nghiệp vụ và phí gas sau A3; ghi công (Q-07); Vy dựng slide và quay video |
| UI/UX (10) | Khung trang mọi vai trò; không gian Sale; bộ danh sách chung (5 màn); màn kiểm tra trả phòng (B3) | B1, B2, B4, B5 còn `style` viết tay |

## Nhánh

| Nhánh | Nội dung | Trạng thái |
|---|---|---|
| `main` (`3725840`) | Đã merge PR #4 chứa nhánh tích hợp và A1/C1/Sale | Gốc tạo nhánh A2, đã kiểm ancestry A1/C1 |
| `chore/fuji-deploy` (Codex) | A2; worktree `D:\HomeStayDorm-fuji-deploy` từ `origin/main` `3725840`; khóa gốc giữ ở A1 | Funding/deploy/verify thật xong; env riêng A2 đã chuẩn bị, config route/roles khớp; chưa restart ứng dụng đầy đủ/A3 |
| `feat/ui-shared-shell` (Claude) | B0: khung chung cho 5 vai trò; bỏ tab của ứng dụng cũ (D-039); sửa lỗi tab kế toán | Chờ Vy merge |
| `feat/ui-list-b1` (Claude) | Tạo từ `feat/ui-shared-shell` (nên chứa luôn B0). Bộ danh sách chung theo mẫu bên Hằng (J-C062); bản nháp hồ sơ nộp D1–D3 (J-C063) | Chờ Vy merge; merge PR này là có cả B0 |
| **`feat/t22-checkout`** (Claude) | Tạo từ `feat/ui-list-b1`, đã gộp `chore/fuji-deploy` (J-C065). **Một PR chứa:** B0, bộ danh sách chung, D1–D3 bản nháp, C2 + B3, A2 | **Chờ Vy merge PR này vào main**; sau đó Codex tạo nhánh mới từ main. C3, C4 làm ở nhánh mới |
| `feat/t22-backend` (Claude) | Khách tự giữ chỗ, từ chối → "Đã xem", "Không thuê nữa", "Khách không đến" | Có code + test đầu vào; SQL chưa chạy lên HOMEDORM4; chưa nối giao diện; chưa gộp vào nhánh tích hợp (việc C5) |
| `docs/review-branch-workflow` | Quy tắc "không push main" | Nội dung đã có trong AGENTS.md; xóa được |

Nhánh tích hợp đã vào main; các nhánh cũ đã gộp có thể được Vy dọn sau. **Mọi nhánh mới tạo từ `origin/main` sau khi đã merge.** AI không tự xóa các nhánh/worktree hoặc bộ khóa đang dùng.

## Thứ tự ưu tiên (D-037, Vy chốt 11/11)

| Ngày | Việc | Trạng thái |
|---|---|---|
| 11–12/11 | **Fuji trước**: A1 ví → faucet → A2 deploy, verify source, đổi `.env` → A3 chạy trọn luồng thật, lưu link giao dịch | A2 deploy/source đã xác minh, env riêng chuẩn bị; tiếp A3 |
| 13–15/11 | Phần T-22 trên đường demo (C2, C3, C4, C6) + giao diện 5 màn demo (B1–B5) | C1 đã xong sớm |
| 16–17/11 | Phần T-22 còn lại nếu kịp (C5); B6, B7; dự phòng | |
| 18–19/11 | README, slide, video (D1–D3); dọn dẹp E1–E3 nếu còn thời gian | |
| 20/11 | Nộp; 21/11 dự phòng | |

## Công việc

| Mã | Việc | Trạng thái | Bước kế |
|---|---|---|---|
| T-08 | Deploy, verify source, nghiệm thu Fuji | A2/J-X068 deploy+source thật và env riêng đã chuẩn bị; [manifest](../blockchain/deployments/fuji.json), [explorer](https://testnet.snowtrace.io/address/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C), [source](https://repo.sourcify.dev/43113/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C) | Chạy phiên ứng dụng đầy đủ với env mới → A3; T-08 chưa nghiệm thu toàn luồng |
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
- Bản A2 `fuji:fund` nạp đủ 0,1 mỗi ví, bỏ qua ví đủ và hỗ trợ `--check`; bản A1 cũ ở worktree chứa khóa vẫn là 0,3. Chạy **script A2 với cwd thư mục khóa A1** theo `blockchain/README.md`, không chạy nhầm npm script A1. Nếu RPC lỗi sau broadcast, kiểm hash/receipt trước khi thử lại.
- Bản ứng dụng đang chạy trước A2 chưa được restart/chuyển cấu hình. Env Fuji đã chuẩn bị riêng ở `D:\HomeStayDorm-fuji-deploy\web\{backend,frontend}\.env`, kèm `.env.local-chain` sao lưu; đều ignore. Config route thật với env A2 trả enabled/43113/address đúng trong tiến trình chỉ đọc, không nối DB hay khởi động scheduler. Không coi đây là ứng dụng đầy đủ đã chạy A3.

## Kiểm tra gần nhất (2026-11-11 15:4x, J-X068)

- `blockchain npm test`: 18 qua, 1 bỏ qua (test SQL), 0 lỗi.
- `web/backend npm test`: 31 qua, 1 bỏ qua, 0 lỗi.
- `web/frontend`: `vite build` qua (cảnh báo kích thước gói); `test:avalanche-ui` qua; `test:handover-ui` qua.
- Nhánh `feat/t22-checkout` (J-C064, 2026-11-11 15:4x): backend `npm test` 36 qua/1 bỏ qua (thêm 5 test C2); build qua; `test:avalanche-ui`, `test:shell-ui`, `test:list-kit`, `test:handover-ui` qua; `ui-checkout-compare.mjs` mới qua ở 1440/390px (dữ liệu giả). Migration `checkout-photos:db:migrate` chạy 2 lần trên HOMEDORM4: bảng 9 cột, 0 dòng.
- Nhánh `feat/ui-list-b1` (J-C062, 2026-11-11 15:1x): build qua; `test:avalanche-ui` qua; `test:shell-ui` qua; `test:list-kit` mới qua (Kế toán xác nhận tiền về, tiền mặt chờ nộp quỹ, Quản lý duyệt nhận cọc, trạng thái đang tải; 1440 và 390px; dữ liệu giả).
- Nhánh `feat/ui-shared-shell` (J-C061): build qua; `test:avalanche-ui`, `test:handover-ui` qua; `test:shell-ui` mới qua (5 vai trò dùng chung khung, menu điện thoại mở/chuyển/đóng bằng Escape, mở được mọi tab không khóa của khách, Sale, quản lý, kế toán; Admin chỉ kiểm khung và menu); 14 ảnh `ui-screens` không lỗi, không tràn ngang; backend 31 qua.
- **Không chạy**: test cần SQL Server, luồng qua giao diện với tài khoản thật, Privy thật, Fuji. Các script chụp ảnh giao diện của Codex (`ui-sale-*.mjs`) không chạy lại.
- Fuji RPC: hai receipt funding và receipt deploy success; đọc manager/accountant đúng, code 7.016 bytes. Nạp lại chế độ `--check` bỏ qua cả hai ví đủ tiền; không có giao dịch gửi thêm.
- Sourcify API v2: creation/runtime exact match, đúng chain/address/creation tx; `verify --check` input khớp manifest. Không suy ra explorer khác đã index source.
- Config route HTTP 200 với env A2: enabled=true, chain 43113, contract khớp. Kiểm bằng router thật trong tiến trình riêng; chưa chạy index.js/SQL/scheduler.
- Frontend build với env Fuji thật pass (cảnh báo chunk), browser trang kiểm chứng 1440/390 có link đúng contract thật, không JS exception/cuộn ngang; 2 ảnh/report `web/frontend/.ui-screens/a2-fuji-live/` (không commit). Chưa upload bằng chứng nghiệp vụ hoặc thử OTP.
- Test tự động gần nhất thuộc **J-X067**, không chạy lại ở J-X068 vì không sửa source: blockchain 25 pass/1 skip SQL, hai file tiện ích Fuji 10/10; backend 31 pass/1 skip SQL; frontend smoke pass. Không biến kết quả trước thành test vừa chạy.
- Không chạy SQL/migration, SMTP/Privy thật hoặc trọn luồng người thuê; không sửa contract/ABI/backend lockfile.

## Môi trường local (không chứa giá trị bí mật)

- Env gốc/ứng dụng trước A2 vẫn giữ chain local. Worktree A2 có env riêng Fuji 43113 và địa chỉ manifest, ba khóa vận hành đúng vai trò; giữ `PRIVY_AUTH_MODE=email`, SQL/SMTP/Privy khác từ cấu hình gốc; `.env.local-chain` sao lưu. Chưa restart phiên backend/frontend đầy đủ với env này.
- Ví Fuji: khóa gốc `D:\HomeStayDorm-fuji\blockchain\.env` và `.fuji-backend-env.local` (ignore). Deployer/manager `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f` còn **0,1499999997396256 AVAX**; accountant `0x9F86a6119723f46d2e8236C2935f660918cCbf0D` và relayer `0x8C8D363E9430bD7e8ED72752Fb1356Bec0fe62f9` mỗi ví **0,1 AVAX** (RPC J-X068). Manifest lưu hai hash funding và deploy, không có khóa bí mật.
- HOMEDORM4: đã có hai bảng mới của C1 (`DepositPolicySnapshot`, `SignedContractEvidence`); 2 phiếu cọc, 0 hợp đồng. Dữ liệu giao dịch đã dọn ngày 06/11 (J-030).
- Thư mục làm việc: `D:\HomeStayDorm` (`feat/ui-refresh-1`), `-audit` (nhánh tích hợp), `-fuji` (bộ khóa A1), `-fuji-deploy` (A2), `-handover`, `-sale`, `-t22`, `-ui` (AI khác). Không nhập thay đổi giữa các worktree ngoài quy trình review.

## Câu hỏi còn mở

Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Q-01 đã chốt ở D-034/D-038; Q-02 đã đóng ở D-038.
