# HomeStayDorm

Hệ thống quản lý thuê phòng HomeStayDorm, được dùng làm nền tảng cho bài thi Team1 Vietnam UniHack 2026 và phần tích hợp Avalanche.

## Cấu trúc repository

```text
HomeStayDorm/
├─ database/       # Schema, seed data, stored procedures và trigger SQL Server
├─ blockchain/     # Khung riêng: contract, test, scripts, shared và deployment
├─ web/
│  ├─ backend/     # REST API Node.js + Express
│  ├─ frontend/    # React + Vite
│  └─ scripts/     # Công cụ hỗ trợ phân tích code
├─ hackathon/      # Bối cảnh, proposal và kế hoạch UniHack/Avalanche
├─ spec/           # Phạm vi, quyết định, tiến độ và nhật ký làm việc
├─ .agents/skills/ # Quy chuẩn giao diện cho AI (homestaydorm-ui)
├─ AGENTS.md       # Hướng dẫn AI đọc và cập nhật hồ sơ mỗi phiên
├─ run.bat         # Chạy nhanh trên Command Prompt
└─ run.ps1         # Chạy nhanh trên PowerShell
```

Phần Avalanche nằm trong [module riêng](blockchain/README.md) (contract `DormSettlement`, Hardhat 3 + solc 0.8.38 + viem). Ví nhúng/ký ở `web/frontend/src/components/xacNhan/` và `web/frontend/src/lib/avalanche/`; relayer, đồng bộ và email ở `web/backend/integrations/avalanche/`. Trạng thái thực tế (đã test gì, đã lên Fuji chưa) theo [spec/progress.md](spec/progress.md).

**Công nghệ:** React 18 + Vite, Node.js 24 + Express, SQL Server; Avalanche Fuji C-Chain, Solidity 0.8.38, OpenZeppelin EIP-712, viem; Privy embedded wallet (khách nhập mã OTP email một lần; JWT-based auth chỉ bật được khi có gói Privy Scale); nodemailer.

## Triển khai Fuji (A2)

Đã deploy thật ngày 11/11/2026 trên **Avalanche Fuji C-Chain (43113)**:

- Contract: [`0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C`](https://testnet.snowtrace.io/address/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C).
- [Giao dịch deploy thành công](https://testnet.snowtrace.io/tx/0x40dd64ee77434c21b0e47242d2edda9f8d4a0d9a448a77cd8905b101b4dd945e), block `60882820`.
- [Mã nguồn trên Sourcify](https://repo.sourcify.dev/43113/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C): creation/runtime **exact match**; không suy ra explorer khác đã index source.
- [Manifest công khai](blockchain/deployments/fuji.json) lưu compiler, constructor, source commit, receipt và hai giao dịch nạp ví vận hành. Khóa/env không nằm trong Git.

Cấu hình Fuji và bản sao cấu hình local cũ đã chuẩn bị riêng tại worktree A2; kiểm route config thật với env mới và đọc manager/accountant trên chain đã khớp. **Chưa restart ứng dụng đầy đủ hoặc nghiệm thu A3** (SQL/SMTP/OTP Privy, bàn giao → đối soát → kiểm chứng tài liệu qua giao diện). Theo [tiến độ](spec/progress.md) và [hướng dẫn A2](blockchain/README.md#deploy-và-verify-fuji-a2).

## Chạy local

Yêu cầu: Node.js, npm và SQL Server đã được cấu hình theo `web/backend/.env.example`.

Trên Windows, chạy một trong hai lệnh tại thư mục gốc:

```powershell
.\run.ps1
```

hoặc:

```bat
run.bat
```

Có thể chạy riêng từng phần:

```powershell
cd web/backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Xác nhận bàn giao/đối soát trên Avalanche và thanh toán mô phỏng

Luồng (D-009 → D-013 trong [spec/decisions.md](spec/decisions.md)): quản lý lập biên bản bàn giao Web2 → hệ thống tự gửi bản xem vào tab **Hợp đồng** của khách (kèm email) → khách **xác nhận** hoặc **yêu cầu chỉnh sửa** → quản lý phát hành bản mới → chỉ bản khách xác nhận được ghi lên Avalanche, khách ký bằng ví nhúng trong tài khoản, ứng dụng trả phí gas. Kế toán gửi bảng đối soát cọc; khách đồng ý hoặc phản hồi; mọi phiên bản được giữ và tự kiểm chứng được tại `/kiem-chung-avalanche`. Khi chưa cấu hình, Web2 vẫn chạy bình thường và phần xác nhận tự ẩn.

1. **CSDL** (thêm bảng xác nhận/thanh toán mô phỏng, mở rộng `HoaDon.PhuongThucThanhToan` và cập nhật các SP liên quan): `cd web/backend && npm run avalanche:db:migrate`.
2. **Contract**: `cd blockchain && npm install && npm test`. Local: `npm run chain` (cửa sổ riêng) rồi `npm run deploy:local`. Fuji: dùng bộ khóa thử gốc, `npm run fuji:fund -- --check`, nạp hai ví phụ nếu đủ tiền, rồi `npm run deploy:fuji` và `npm run verify:fuji`; chi tiết và cách dùng khác worktree ở [blockchain/README.md](blockchain/README.md).
3. **Backend** `web/backend/.env`: `AVALANCHE_ENABLED=true`, `AVALANCHE_CONTRACT_ADDRESS`, khóa thử của manager/accountant/relayer (chỉ trên server). Ví nhúng: tạo app trên Privy, đặt `PRIVY_APP_ID`; mặc định `PRIVY_AUTH_MODE=email` (khách nhập mã OTP email một lần khi xác nhận, gói Privy miễn phí). Nếu có gói Privy Scale: `npm run privy:keygen`, dán public key vào Dashboard (JWT-based auth, claim `sub`), đặt `PRIVY_AUTH_MODE=jwt` và `PRIVY_JWT_PRIVATE_KEY_FILE`.
   - **Chain local:** đặt `AVALANCHE_CHAIN_ID=31337`, `AVALANCHE_RPC_URL=http://127.0.0.1:8545`, `AVALANCHE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3` và khóa ví dev công khai của Hardhat (chỉ dùng local). `run.ps1` khi thấy cấu hình này sẽ tự mở cửa sổ chain và deploy contract (`npm run local:ensure`). Chain local mất dữ liệu khi tắt: hồ sơ xác nhận tạo trước đó sẽ không dùng tiếp được. Email: không đặt `SMTP_HOST` thì chỉ in ra console; `MAIL_REDIRECT_TO` gom email demo về một hộp thư.
4. **Frontend** `web/frontend/.env`: `VITE_PRIVY_APP_ID`, `VITE_AVALANCHE_CONTRACT_ADDRESS`, `VITE_AVALANCHE_CHAIN_ID`.
5. **Thanh toán cọc và khoản thu kỳ đầu bằng ví điện tử (mô phỏng)**: bật mặc định; đặt `PAYMENT_SIM_SECRET` (≥ 16 ký tự). Khách mở phiếu cọc hoặc vào tab **Hợp đồng** để trả khoản thu kỳ đầu; sau IPN thành công, hóa đơn kỳ đầu thành “Đã TT” và quản lý có thể bàn giao. Kế toán vẫn thu tay bằng tiền mặt/chuyển khoản như trước. Cổng tự dựng để demo, không phải API của nhà cung cấp thật và không nhận tiền thật. API mới: `GET/POST /api/thanh-toan-mo-phong/thu-nhan-phong/:maHopDong` (xem khoản phải thu/tạo đơn, chỉ chủ hợp đồng).
6. **Đặt cọc (D-023)**: chạy `cd web/backend && npm run auto-deposit:db:migrate` một lần để có tài khoản hệ thống `NVAUTO`, rồi `npm run deposit-flow:db:migrate` để thêm lựa chọn cọc, sổ email, theo dõi nộp quỹ và các SP mới. Hai lệnh migration có thể chạy lại. Sale chọn hình thức/giường khi gửi; quản lý nhận email, duyệt là tạo phiếu và chốt trong một transaction. Yêu cầu chờ quá 8 giờ nhắc quản lý một lần, quá 12 giờ tự từ chối; phiếu đã phát hành có hạn trả 24 giờ, nhắc khách khi còn tối đa 3 giờ. Tiền mặt do Sale thu kèm ảnh biên nhận, kế toán đánh dấu đã nộp quỹ; chuyển khoản tay do kế toán xác nhận. Link email mở đúng phiếu sau đăng nhập. `DAT_COC_YEU_CAU_INTERVAL_MS` và `DAT_COC_HET_HAN_INTERVAL_MS` đặt chu kỳ quét (mặc định 300000 ms); `AVALANCHE_APP_ORIGIN` hoặc `CLIENT_URL` đặt gốc link email. `MAIL_REDIRECT_TO` nên trỏ tới hộp thư demo để tránh gửi tới địa chỉ dữ liệu mẫu. Công tắc tự chốt cũ trong Admin không còn tham gia luồng này.
7. **Nhận phòng (D-024)**: sau bước 6, chạy `cd web/backend && npm run residence-flow:db:migrate` để áp SP tự duyệt cư trú theo ngoại lệ; có thể chạy lại. Kiểm tra SQL trên dữ liệu tổng hợp có rollback bằng `npm run residence-flow:db:verify`. Hồ sơ đủ điều kiện được `NVAUTO` duyệt, trường hợp khác chuyển quản lý kèm lý do; email gửi khi cọc đã trả, có thành viên bị từ chối, lập hợp đồng, gần ngày nhận phòng mà chưa trả kỳ đầu, và khi kỳ đầu đã trả. Mail theo `MAIL_REDIRECT_TO` và chống lặp theo lần gửi duyệt; cần cấu hình SMTP để gửi thật.

Kiểm thử: `cd blockchain && npm test` (contract + luồng tích hợp trên chain local), `TEST_SQL=true npm run test:sql` (cần SQL Server), `cd web/backend && npm test && node scripts/deposit-flow-verify.mjs` (script cuối tạo hồ sơ tạm và rollback; cần SQL Server), `cd web/frontend && npm run build && npm run test:avalanche-ui`.

## Tài liệu UniHack

- [Tiến độ hiện tại](spec/progress.md), [luồng và quyết định đã gộp](spec/luong-tong-hop.md), [nhật ký có thời gian](spec/journal.md); cách ghi hồ sơ ở [spec/README.md](spec/README.md).
- [Tổng quan cuộc thi](hackathon/README.md)
- [Kế hoạch thực hiện](hackathon/plan.md)
- [Proposal](hackathon/Proposal.md)
- [Bối cảnh Avalanche](hackathon/Unihack_Context.md)
