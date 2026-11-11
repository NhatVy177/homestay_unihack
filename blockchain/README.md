# Blockchain — HomeStayDorm

Contract `DormSettlement.sol`, canonical evidence/hash và EIP-712 dùng chung với frontend/backend. Đã deploy trên **Fuji 43113** ở `0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C` (J-X068); [Sourcify](https://repo.sourcify.dev/43113/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C) xác nhận creation/runtime exact match. Manifest và hai giao dịch nạp ví ở [deployments/fuji.json](deployments/fuji.json). **Chưa nghiệm thu A3 với người thuê/SQL/OTP thật.** Không giữ/chuyển tiền cọc trên chuỗi.

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

Theo bước A2 mới, hai ví phụ cần **mỗi ví tối thiểu 0,1 AVAX thử**. Deployer cần đủ khoản còn thiếu của hai ví cộng phí gas, và giữ tiền cho deploy/manager. Kiểm tra trước rồi mới gửi:

```powershell
npm run fuji:fund -- --check
npm run fuji:fund
```

Script kiểm tra RPC đúng Fuji (`43113`), in số dư ba ví, bỏ qua ví đã có từ 0,1 AVAX; ví có ít hơn chỉ nhận phần còn thiếu để đạt 0,1. Kiểm tra đủ tiền cho cả đợt và dự phòng gấp đôi phí ước tính trước giao dịch đầu tiên; đợi từng receipt trước khi gửi tiếp. `--check` không gửi giao dịch. Có thể đặt `FUJI_RPC_URL` trong `.env` hoặc môi trường tiến trình.

Chạy lại sau khi hai ví đủ tiền không gửi thêm. Nếu RPC lỗi sau khi broadcast, giữ mã giao dịch đã in và kiểm tra receipt trên explorer trước khi chạy lại; giao dịch còn pending có thể chưa phản ánh trong số dư. Lỗi thư viện được rút gọn, không in raw exception chứa khóa.

A1 chỉ chuẩn bị ví và script. A2 bổ sung deploy, source verification và hướng dẫn cấu hình bên dưới; trạng thái chạy thật xem `spec/progress.md`.

## Deploy và verify Fuji (A2)

Từ `blockchain/` có bộ khóa Fuji gốc trong `.env` và `.fuji-backend-env.local`, sau khi hai ví phụ được nạp:

```powershell
npm run compile
node --env-file=.env scripts/deploy.mjs fuji --check
npm run deploy:fuji
npm run verify:fuji
```

`deploy:fuji` tự nạp `.env`. `--check` chỉ đọc chain/số dư và ước tính phí, không deploy. Script từ chối sai mạng, vai trò trùng/zero, thiếu gas hoặc manifest Fuji đã tồn tại. Sau broadcast lưu mã giao dịch vào `deployments/fuji.pending.json` (ignore); nếu đọc receipt lỗi, chạy lại sẽ theo mã cũ. Sau receipt thành công và đọc `manager()`/`accountant()` khớp mới ghi manifest công khai `deployments/fuji.json`. Không xóa manifest để deploy lại; hồ sơ chain local cũ không được chuyển thành hồ sơ Fuji.

Verify dùng [Sourcify API v2](https://docs.sourcify.dev/docs/api/) (không dùng API v1 đã ngừng), hỗ trợ chain 43113. Gửi `artifacts/standard-input.json`, solc 0.8.38, optimizer 200, EVM Cancun và creation transaction; constructor `(manager, accountant)` lưu công khai trong manifest. SHA-256 input phải khớp lúc deploy. Job ID được lưu để chạy tiếp khi chờ lâu; chỉ đánh dấu `sourceVerification: verified` khi **creation và runtime đều exact match**, đúng chain/address/creation tx. Manifest có link Sourcify và explorer; xác minh ở Sourcify không đồng nghĩa explorer khác đã index source. Lỗi/chưa có manifest không được báo đã verify.

### Worktree A2 và bộ khóa ở thư mục A1

Không tạo lại khóa hoặc in nội dung hai file. Bộ khóa vẫn ở `D:\HomeStayDorm-fuji\blockchain`; code A2 ở `D:\HomeStayDorm-fuji-deploy\blockchain`. Cài dependencies/compile/test trong worktree A2, rồi chạy code mới với thư mục hiện hành là chỗ chứa khóa gốc:

```powershell
$fujiCode = 'D:\HomeStayDorm-fuji-deploy\blockchain'
Set-Location 'D:\HomeStayDorm-fuji\blockchain'
node "$fujiCode/scripts/fuji-fund.mjs" --check
# Chỉ chạy khi kiểm tra đủ tiền và không có giao dịch pending chưa rõ kết quả:
node "$fujiCode/scripts/fuji-fund.mjs"
node --env-file=.env "$fujiCode/scripts/deploy.mjs" fuji --check
node --env-file=.env "$fujiCode/scripts/deploy.mjs" fuji
node "$fujiCode/scripts/verify-fuji.mjs"
```

Artifacts và manifest nằm trong worktree A2; khóa ở nguyên thư mục A1. `sourceCommit` lấy từ worktree chứa code, không lấy từ thư mục khóa.

### Chuyển ứng dụng sau khi deploy và verify thành công

1. Sao lưu env hiện tại của backend/frontend thành `.env.local-chain` tại đúng thư mục tương ứng (đã ignore). Chưa đổi cấu hình ứng dụng khi chưa có contract thật và manifest xác nhận.
2. Backend `.env`: `AVALANCHE_ENABLED=true`, `AVALANCHE_CHAIN_ID=43113`, `AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc`, `AVALANCHE_CONTRACT_ADDRESS` lấy từ manifest; ba khóa `AVALANCHE_*_PRIVATE_KEY` lấy **tại máy** từ `.fuji-backend-env.local`. Giữ cấu hình SQL/SMTP/Privy khác; không gửi khóa qua chat. Giữ `PRIVY_AUTH_MODE=email` theo D-015.
3. Frontend `.env`: cùng chain/RPC/contract ở `VITE_AVALANCHE_CHAIN_ID`, `VITE_AVALANCHE_RPC_URL`, `VITE_AVALANCHE_CONTRACT_ADDRESS`; giữ `VITE_PRIVY_APP_ID`, tuyệt đối không thêm private key vào `VITE_*`.
4. Khởi động lại backend, build/chạy frontend. `GET /api/avalanche/config` phải trả đúng chain 43113/address; đọc `manager()`/`accountant()` khớp manifest. Quản lý/kế toán có link giao dịch Fuji; trang kiểm chứng có link contract khi cấu hình Fuji hợp lệ. Hồ sơ local có thể báo "Deployment đã đổi" đúng thiết kế, không sửa dữ liệu cũ.
5. A3 mới nghiệm thu OTP Privy, SQL/SMTP/giao diện và trọn luồng thật. Không coi compile/test/mock là kết quả đó.

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
