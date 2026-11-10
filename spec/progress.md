# Tiến độ hiện tại

Cập nhật: **2026-11-11 00:59:24 +07:00** (J-X061). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát và đề xuất: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

Hạn nộp **21/11/2026 23:59** (mục tiêu nội bộ 20/11). Web2 chạy được trên máy local. Phần Avalanche **mới chạy trên chain local (Hardhat 31337)**: chưa deploy Fuji, chưa có giao dịch Fuji nào, chưa ai thử mã OTP Privy thật, chưa chạy trọn luồng bàn giao → đối soát → kiểm chứng qua giao diện với SQL Server thật. Đây là rủi ro lớn nhất vì hai tiêu chí Technical + Avalanche chiếm 50/100 điểm.

## Mức sẵn sàng theo tiêu chí chấm

| Tiêu chí (điểm) | Đã có | Còn thiếu |
|---|---|---|
| Technical (25) | C1: blockchain 15 pass, backend 31 pass, mỗi bộ 1 skip SQL; build và hai bộ smoke UI qua | Chạy trọn luồng thật một lần; áp dụng/kiểm tra migration C1 sau khi Vy cho phép; README cài DB từ đầu |
| Avalanche (25) | Contract EIP-712, relayer trả gas, ví nhúng, trang kiểm chứng (chạy local) | **Deploy + verify source Fuji, giao dịch thật, link explorer** |
| Creativity (15), Impact (15) | Bài toán thật, luồng D-026 → D-031 đã chốt | Slide nêu người dùng, giới hạn pháp lý, vì sao on-chain |
| Pitch (10) | Kịch bản video 2:50 đề xuất ở J-041 (chưa chốt) | Slide, video, README nộp |
| UI/UX (10) | Khung trang mọi vai trò đã đổi (T-21) | Các màn trên đường demo còn nhiều `style` viết tay |

## Nhánh đang mở

| Nhánh | Nội dung | Trạng thái |
|---|---|---|
| `main` (`dcc1a59`) | Đã có T-19, T-20, T-21 đợt đầu, hồ sơ D-026 → D-032 | Gốc để tạo nhánh mới |
| `feat/ui-refresh-1` (Codex) | Thẻ tổng quan + thanh tìm kiếm danh sách (D-033, J-056), J-057 | 2 commit chưa vào `main`; **đã gộp sẵn vào `chore/audit-cleanup`** nên merge nhánh nào trước cũng không xung đột |
| `feat/t22-backend` (Claude) | Khách tự giữ chỗ, từ chối → "Đã xem", "Không thuê nữa", "Khách không đến" | Có code + test đầu vào; **SQL chưa chạy lên HOMEDORM4**, chưa nối giao diện |
| `chore/audit-cleanup` (Claude) | Rà soát 11/11: dọn file thừa, AGENTS.md, skill giao diện, file này | Chờ Vy xem |
| `chore/fuji-setup` (Codex) | A1 tại `D:\HomeStayDorm-fuji`, riêng từ `923a665` | Đã push `d338e15` (J-X058); có script và ví local, chờ faucet, chưa deploy |
| `feat/t22-handover-bundle` (Codex) | C1 tại `D:\HomeStayDorm-handover`, riêng từ `923a665` theo yêu cầu Vy | Có code/test (J-X061); D-034 đã chốt tại `ba33162`. **Chưa chạy migration HOMEDORM4**, chờ Vy cho phép, chưa nghiệm thu DB/Fuji |
| `docs/review-branch-workflow` | Quy tắc "không push main" | Nội dung đã đưa vào AGENTS.md mới; có thể xóa nhánh |

Nhánh đã merge, có thể xóa trên GitHub: `feat/t20-checkin-deposit-fixes`, `docs/d026-flow-redesign`.

## Thứ tự ưu tiên (đề xuất của Claude ở J-C059, **chờ Vy chốt**; thay lịch D-025 nếu được chốt)

| Ngày | Việc | Vì sao |
|---|---|---|
| 11–12/11 | **Fuji trước**: ví thử + AVAX faucet, deploy, verify source, đổi `.env`, chạy trọn luồng thật một lần (OTP Privy thật), lưu link giao dịch | 50 điểm phụ thuộc; chưa từng chạy thật nên chưa biết sẽ hỏng ở đâu |
| 13–15/11 | Phần T-22 **nằm trên đường demo** + làm lại giao diện 6 màn demo | Giám khảo nhìn thấy trong video |
| 16–17/11 | Phần T-22 còn lại nếu kịp; dự phòng sửa lỗi | Web2 phía trước chỉ lên slide (D-018) |
| 18–19/11 | README (cài từ đầu, phần có sẵn/phần mới, giới hạn), slide, video | Hồ sơ nộp |
| 20/11 | Nộp; 21/11 dự phòng | |

## Công việc

| Mã | Việc | Trạng thái | Bước kế |
|---|---|---|---|
| T-08 | Deploy, verify source, nghiệm thu Fuji | A1 code/test xong trên nhánh riêng `chore/fuji-setup` (`d338e15`); ba ví local có số dư 0, chưa deploy | Vy xin faucet cho deployer, funding sau; A2/A3 chưa làm |
| T-11 / T-14 | Bàn giao Web2 → email → OTP → ký | Có code, test tự động qua, **chưa chạy thật** | Chạy thật trong việc A3 |
| T-22 | Luồng D-026 → D-031 | C1 có code/test trên nhánh riêng; 4 mục đầu có code backend ở `feat/t22-backend`; SQL hai nhánh chưa áp dụng | Xin phép migration C1 và kiểm tra thật; phần còn lại theo bảng dưới |
| T-21 | Giao diện | Đợt đầu xong (khung, token, form, danh sách); Vy tạm dừng để làm A1 rồi C1 | Chờ xong hai việc trước khi tiếp tục UI |
| T-09 | Hồ sơ nộp | Chưa bắt đầu | Việc D1–D3 |
| T-04 | Nguồn tiền cọc (Q-01) và dữ liệu demo | C1 đã chốt dùng `SoTienCoc`, chưa trừ hoàn một phần (D-034) | Chốt nguồn sau hoàn/cấn trừ khi làm phần D-026 ngoài C1; chuẩn bị demo trước Fuji |
| T-13 | Privy JWT (bỏ OTP) | Tạm dừng, chờ BTC (Q-10) | Giữ OTP |

Việc đã xong trước 11/11 (T-01, T-02, T-10, T-12, T-15 → T-20): xem file lưu trữ.

## T-22 chia theo mức ưu tiên (đề xuất, chờ Vy chốt)

| Mức | Mục | Quyết định | Trạng thái |
|---|---|---|---|
| **Phải có** (trên đường demo) | Điều khoản hợp đồng + phiên bản chính sách + mã băm ảnh hợp đồng vào gói bàn giao | D-027, D-031, D-034 | C1 có code/test: v2, ảnh ký private, hồ sơ cũ cần xác nhận chính sách; migration chưa chạy |
| | Màn kiểm tra trả phòng so trước/sau | D-030 | Chưa làm |
| | Bản nháp đối soát tự soạn; phiếu thu nợ và phiếu hoàn cọc khác loại | D-030 | Chưa làm |
| | Tự thanh lý 3 trường hợp + gói bằng chứng cuối | D-030, D-031 | Chưa làm |
| | Danh sách "Chờ khách xác nhận", nhắc 24/72 giờ | D-028 | Có nút nhắc tay; chưa tự nhắc |
| **Nên có** | Khách tự giữ chỗ; từ chối → "Đã xem"; "Không thuê nữa"; "Khách không đến" | D-026 | Có code backend, chưa chạy SQL, chưa có giao diện |
| | Chính sách hoàn cọc trên phiếu và email cọc | D-031, D-034 | Có code/test C1, snapshot cố định theo phiếu; chưa nghiệm thu SQL/SMTP thật |
| | Thẻ "Kích hoạt xác nhận điện tử" sau khi trả cọc | D-028 | Chưa làm |
| **Để sau nếu trễ** | Khách tự khai người ở; thành viên bị loại hoàn 80%; hợp đồng "Chờ ký" | D-026, D-027 | Chưa làm |
| | Hóa đơn tháng qua ví; trang "Khoản dự kiến trừ" | D-029 | Chưa làm |
| | Đổi người đại diện bằng email mời | D-026 | Giữ cách tạm |
| **Sau bản thi** | Mốc chuỗi 3 | D-031 | Không làm |

## Kiểm tra gần nhất — C1 (J-X061, 2026-11-11)

- `blockchain npm test`: 15 qua, 1 bỏ qua SQL, 0 lỗi; v1/v2 cùng verify trên contract không đổi, sửa điều khoản/hash/chính sách bị phát hiện; review v1 phải có bản sửa v2, giữ lịch sử.
- `web/backend npm test`: 31 qua, 1 bỏ qua SQL, 0 lỗi; policy bất biến, quyền chủ phiếu/chi nhánh/Sale, chặn thiếu ảnh/xác nhận và file sai hash, không đưa PII/bytes ảnh ký vào payload, email đúng snapshot, multipart từ chối file quá giới hạn.
- `web/frontend npm run build` và `npm run test:avalanche-ui`: qua; còn cảnh báo thư viện/chunk lớn.
- `npm run test:handover-ui`: qua, 12 ảnh tại `web/frontend/.ui-screens/c1/` (6 trạng thái × 1440px/390px), report JSON không JS exception/cuộn ngang. Component xác nhận/upload dùng API giả; trang verify dùng RPC Hardhat trong bộ nhớ và kiểm thật commitment v1/v2. Không phải tài khoản/SQL/SMTP/Privy/Fuji thật.
- Không thay contract Solidity hoặc backend lockfile; `git diff --check` pass. Chưa chạy SQL/migration. Các ca SQL vẫn bỏ qua, cần Vy cho phép trước HOMEDORM4.

## Môi trường local (không chứa giá trị bí mật)

- `web/backend/.env`: chain local `31337`, `PRIVY_AUTH_MODE=email`, SMTP đã cấu hình, ví mô phỏng bật. `MAIL_REDIRECT_TO` đang tắt; email nhân viên trong DB trỏ về hộp thư thử của Vy.
- Nhánh A1 riêng `chore/fuji-setup`: đã có hai file khóa bị ignore ở `D:\HomeStayDorm-fuji\blockchain`; không có file này tại worktree C1 và không chép qua. Deployer/manager `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f`, số dư Fuji 0 tại kiểm tra A1; chưa gửi giao dịch. Chi tiết và test A1 ở commit `d338e15`/J-X058, chưa được tích hợp vào nhánh C1.
- HOMEDORM4 đã dọn dữ liệu giao dịch ngày 06/11 (J-030); có vài hồ sơ thử tạo sau đó. Bản sao lưu trước khi dọn: xem file lưu trữ.

## Câu hỏi còn mở

C1 đã được Vy chốt hai điểm tại D-034/J-X060 và đã triển khai code/test trên worktree/nhánh riêng:

1. **Q-01/C1:** giữ `PhieuDatCoc.SoTienCoc`, chưa trừ hoàn một phần.
2. **Hồ sơ cũ:** bắt buộc bổ sung ảnh ký và khách xác nhận chính sách trước v2. Không tự hồi tố thời điểm đã xem chính sách hoặc sửa bản v1 đã khóa.

**Bước tiếp C1:** chờ Vy cho phép chạy `handover-bundle:db:migrate` với cấu hình HOMEDORM4; file `database/avalanche/20261111_handover_evidence.sql` tạo hai bảng mới, đánh dấu phiếu cũ cần xác nhận bổ sung, không đổi tiền/trạng thái hợp đồng. Sau đó kiểm tra SQL và để Vy dùng tài khoản thật xác nhận chính sách/tải ảnh/phát hành v2. Chưa thực hiện thao tác đó; code/test pass không đồng nghĩa nghiệm thu SQL/Fuji.

Q-01 còn mở ngoài phạm vi C1 (hoàn/cấn trừ D-026); Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Các đề xuất mới chờ Vy chốt: mục 4 của [audit-2026-11-11.md](audit-2026-11-11.md).
