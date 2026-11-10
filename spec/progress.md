# Tiến độ hiện tại

Cập nhật: **2026-11-11 00:27:35 +07:00** (J-X058). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát và đề xuất: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

Hạn nộp **21/11/2026 23:59** (mục tiêu nội bộ 20/11). Web2 chạy được trên máy local. Phần Avalanche **mới chạy trên chain local (Hardhat 31337)**: chưa deploy Fuji, chưa có giao dịch Fuji nào, chưa ai thử mã OTP Privy thật, chưa chạy trọn luồng bàn giao → đối soát → kiểm chứng qua giao diện với SQL Server thật. Đây là rủi ro lớn nhất vì hai tiêu chí Technical + Avalanche chiếm 50/100 điểm.

## Mức sẵn sàng theo tiêu chí chấm

| Tiêu chí (điểm) | Đã có | Còn thiếu |
|---|---|---|
| Technical (25) | Contract + 12 test, backend 25 test, build frontend qua | Chạy trọn luồng thật một lần; README cài DB từ đầu |
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
| `chore/fuji-setup` (Codex) | A1: keygen và chia AVAX thử; worktree `D:\HomeStayDorm-fuji`, gốc `923a665` của audit-cleanup theo yêu cầu Vy | Code/test A1 xong (J-X058), ví chờ faucet; chưa chuyển AVAX hoặc deploy |
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
| T-08 | Deploy, verify source, nghiệm thu Fuji | A1 đã có script keygen/fund và ba ví local trong worktree Fuji; số dư 0, chưa có `deployments/fuji.json` | Vy xin faucet cho deployer; sau A1 làm C1 theo yêu cầu, chưa thực hiện A2/deploy |
| T-11 / T-14 | Bàn giao Web2 → email → OTP → ký | Có code, test tự động qua, **chưa chạy thật** | Chạy thật trong việc A3 |
| T-22 | Luồng D-026 → D-031 | Đang làm: 4 mục đầu có code backend (nhánh `feat/t22-backend`); còn lại chưa làm | Chia mức ưu tiên bên dưới |
| T-21 | Giao diện | Đợt đầu xong (khung, token, form, danh sách); Vy tạm dừng để làm A1 rồi C1 | Sau hai việc này mới tiếp tục UI |
| T-09 | Hồ sơ nộp | Chưa bắt đầu | Việc D1–D3 |
| T-04 | Nguồn tiền cọc (Q-01) và dữ liệu demo | Chưa chốt | Cần trước khi tạo hồ sơ demo trên Fuji |
| T-13 | Privy JWT (bỏ OTP) | Tạm dừng, chờ BTC (Q-10) | Giữ OTP |

Việc đã xong trước 11/11 (T-01, T-02, T-10, T-12, T-15 → T-20): xem file lưu trữ.

## T-22 chia theo mức ưu tiên (đề xuất, chờ Vy chốt)

| Mức | Mục | Quyết định | Trạng thái |
|---|---|---|---|
| **Phải có** (trên đường demo) | Điều khoản hợp đồng + phiên bản chính sách + mã băm ảnh hợp đồng vào gói bàn giao | D-027, D-031 | Chưa làm |
| | Màn kiểm tra trả phòng so trước/sau | D-030 | Chưa làm |
| | Bản nháp đối soát tự soạn; phiếu thu nợ và phiếu hoàn cọc khác loại | D-030 | Chưa làm |
| | Tự thanh lý 3 trường hợp + gói bằng chứng cuối | D-030, D-031 | Chưa làm |
| | Danh sách "Chờ khách xác nhận", nhắc 24/72 giờ | D-028 | Có nút nhắc tay; chưa tự nhắc |
| **Nên có** | Khách tự giữ chỗ; từ chối → "Đã xem"; "Không thuê nữa"; "Khách không đến" | D-026 | Có code backend, chưa chạy SQL, chưa có giao diện |
| | Chính sách hoàn cọc trên phiếu và email cọc | D-031 | Chưa làm |
| | Thẻ "Kích hoạt xác nhận điện tử" sau khi trả cọc | D-028 | Chưa làm |
| **Để sau nếu trễ** | Khách tự khai người ở; thành viên bị loại hoàn 80%; hợp đồng "Chờ ký" | D-026, D-027 | Chưa làm |
| | Hóa đơn tháng qua ví; trang "Khoản dự kiến trừ" | D-029 | Chưa làm |
| | Đổi người đại diện bằng email mời | D-026 | Giữ cách tạm |
| **Sau bản thi** | Mốc chuỗi 3 | D-031 | Không làm |

## Kiểm tra gần nhất (2026-11-11, chạy lại trong J-C059)

Kiểm tra mới A1/J-X058 tại worktree Fuji: blockchain 15 pass/1 skip SQL/0 fail (thêm 3 ca keygen/funding); backend 25 pass/1 skip SQL/0 fail; frontend build và `test:avalanche-ui` pass. Không dùng SQL thật hoặc gửi giao dịch Fuji. Các kết quả J-C059 dưới đây là mốc trước A1, không phải kiểm tra mới.

- `blockchain npm test`: 12 qua, 1 bỏ qua (test SQL), 0 lỗi.
- `web/backend npm test`: 25 qua, 1 bỏ qua trên `feat/ui-refresh-1`; 28 qua, 1 bỏ qua trên `feat/t22-backend`.
- `web/frontend vite build`: qua; gói chính 1,1 MB, có cảnh báo kích thước.
- **Không chạy lại**: `test:avalanche-ui`, các test cần SQL Server, luồng qua giao diện.

## Môi trường local (không chứa giá trị bí mật)

- `web/backend/.env`: chain local `31337`, `PRIVY_AUTH_MODE=email`, SMTP đã cấu hình, ví mô phỏng bật. `MAIL_REDIRECT_TO` đang tắt; email nhân viên trong DB trỏ về hộp thư thử của Vy.
- Worktree `D:\HomeStayDorm-fuji`: đã có `blockchain/.env` và `.fuji-backend-env.local`, cả hai bị ignore. Deployer/manager `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f`; accountant `0x9F86a6119723f46d2e8236C2935f660918cCbf0D`; relayer `0x8C8D363E9430bD7e8ED72752Fb1356Bec0fe62f9`. Đọc RPC xác nhận chain 43113 và cả ba số dư 0; `fuji:fund` dừng vì chưa có AVAX, chưa gửi giao dịch. Khóa không đi theo Git/worktree; giữ hai file local tại đây.
- HOMEDORM4 đã dọn dữ liệu giao dịch ngày 06/11 (J-030); có vài hồ sơ thử tạo sau đó. Bản sao lưu trước khi dọn: xem file lưu trữ.

## Câu hỏi còn mở

Q-01 (nguồn tiền cọc), Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Các đề xuất mới chờ Vy chốt: mục 4 của [audit-2026-11-11.md](audit-2026-11-11.md).
