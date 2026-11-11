# Blockchain — HomeStayDorm

Contract `DormSettlement.sol`, canonical evidence/hash và EIP-712 dùng chung với frontend/backend. Đã có compile, ABI, test và deploy local; **chưa có deployment hoặc giao dịch Fuji được nghiệm thu**. Không giữ/chuyển tiền cọc trên chuỗi.

## Chuẩn bị ví Fuji (A1)

Dùng Node 24, chạy từ `blockchain/`:

```powershell
npm ci
npm --prefix ../web/backend ci
npm --prefix ../web/frontend ci
npm test
npm run fuji:keygen
```

Script tạo ba ví mới: deployer kiêm manager, accountant và relayer. Console chỉ hiện ba địa chỉ công khai. Khóa được lưu ở:

- `.env`: `FUJI_DEPLOYER_PRIVATE_KEY`, `FUJI_MANAGER_ADDRESS`, `FUJI_ACCOUNTANT_ADDRESS`, `FUJI_RPC_URL`.
- `.fuji-backend-env.local`: `AVALANCHE_MANAGER_PRIVATE_KEY`, `AVALANCHE_ACCOUNTANT_PRIVATE_KEY`, `AVALANCHE_RELAYER_PRIVATE_KEY`. Vy tự chép các dòng này vào `web/backend/.env` khi chuyển cấu hình sang Fuji ở A2.

Hai file đều bị Git bỏ qua. Không gửi nội dung qua chat, không chụp màn hình khóa, không đặt trong biến `VITE_*`. Cất bản sao an toàn của cả hai file trước khi chuyển worktree/máy. File local không tự đi theo nhánh khi checkout ở worktree khác.

Nếu `.env` đã có khóa hoặc `.fuji-backend-env.local` đã tồn tại, script từ chối ghi đè. Cấu hình không liên quan trong `.env` được giữ lại. Không xóa file ví cũ chỉ để chạy lại keygen.

Lấy **địa chỉ deployer / manager** in trên console để xin AVAX thử tại [Avalanche Console](https://build.avax.network/console) hoặc [faucet Team1VN](https://team1vn.xyz/faucet.html). Không cần xin riêng cho hai ví còn lại.

Khi deployer đã có **hơn 0,6 AVAX thử và đủ phí gas**, chạy:

```powershell
npm run fuji:fund
```

Script kiểm tra RPC đúng Fuji (chain ID `43113`), in số dư ba ví, kiểm tra tiền và phí ước tính trước khi gửi, chuyển **0,3 AVAX thử mỗi ví** cho accountant và relayer, đợi receipt thành công rồi in số dư mới. Deployer giữ phần còn lại cho deploy và thao tác manager. Nếu chưa có tiền hoặc không đủ, script dừng trước giao dịch đầu tiên và nhắc xin faucet. Có thể đặt `FUJI_RPC_URL` trong `.env` hoặc môi trường tiến trình.

**Mỗi lần chạy thành công chuyển thêm 0,3 AVAX cho mỗi ví**; không phải lệnh kiểm tra số dư thuần túy. Nếu RPC lỗi giữa chừng, kiểm tra số dư và transaction trên explorer trước khi chạy lại để tránh chuyển lặp. Lỗi thư viện được rút gọn, không in raw exception chứa khóa.

A1 chỉ chuẩn bị ví và script chia tiền thử, **không deploy**, không đổi `.env` đang chạy của backend/frontend. Deploy và verify source thuộc A2; `deploy:fuji` hiện cần nạp biến môi trường theo hướng dẫn A2 trước khi chạy.

## Code và kiểm tra

| Thư mục | Nội dung |
|---|---|
| `contracts/` | Solidity; không đổi contract trong A1/C1 |
| `src/` | Canonical snapshot, hash, typed data, evidence và ABI cho Node/browser |
| `scripts/` | Compile, deploy, local chain, keygen/funding Fuji |
| `test/` | Contract, workflow, HTTP và các hàm dùng chung; SQL là kiểm tra riêng |
| `deployments/` | Manifest công khai; `local/` bị ignore, Fuji chỉ ghi khi deploy thật |

`npm test` compile rồi chạy test tự động, gồm keygen trong thư mục tạm, từ chối ghi đè và funding dùng client giả (không chuyển AVAX thật). `npm run chain` chạy Hardhat local; `npm run deploy:local` deploy local. `artifacts/` và dependencies không commit. SQL không chạy trong A1; hỏi Vy trước khi dùng HOMEDORM4.

Backend tích hợp ở `web/backend/integrations/avalanche/`, browser ở `web/frontend/src/lib/avalanche/`. Shared không import ngược web, filesystem hay khóa riêng. Theo dõi phạm vi tại [scope](../spec/scope.md), [tiến độ](../spec/progress.md) và [việc cho agent](../spec/viec-cho-agent.md).
