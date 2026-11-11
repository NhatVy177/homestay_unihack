# Cấu hình chi tiết

Tách từ README cũ ngày 11/11/2026 (J-C063) để README gốc ngắn gọn cho giám khảo. Nội dung giữ nguyên ý; khi đổi cấu hình, sửa file này.

Không ghi giá trị bí mật vào tài liệu. Khóa ví, `PAYMENT_SIM_SECRET`, mật khẩu SMTP và khóa Privy chỉ nằm trong `.env` trên máy chạy (đã bị Git bỏ qua).

## Chạy local

Yêu cầu: Node.js 24, npm và SQL Server đã cấu hình theo `web/backend/.env.example`.

Trên Windows, chạy một trong hai lệnh tại thư mục gốc:

```powershell
.\run.ps1
```

```bat
run.bat
```

Hoặc chạy riêng từng phần:

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

## Lịch xem phòng — C5-a / D-026

Trong `web/backend`, `npm run viewing-status:db:check` chỉ đọc định nghĩa 8 SP và liệt kê khối tự chuyển Đã xem còn tồn tại. Sau khi Vy cho phép chạy lên HOMEDORM4, `npm run viewing-status:db:migrate` gỡ đúng các khối cũ, giữ phần SP còn lại (kể cả thay đổi của migration mới hơn), mở rộng trạng thái Khách không đến và thêm `SP_GhiNhanKetQuaBuoiXem` trong cùng transaction. Định nghĩa không đúng mẫu sẽ báo lỗi để xem lại; không tự thay cả SP bằng bản nguồn cũ. Migration không ghi trạng thái lịch/phiếu cũ và chạy lại được.

Triển khai đồng thời backend/frontend mới và restart mọi backend cũ đang nối cùng DB; tiến trình cũ còn giữ hàm JS/scheduler tự đánh dấu trong bộ nhớ. Sale phụ trách ghi kết quả sau buổi xem ở Lịch hẹn xem phòng; backend kiểm lại quyền, chi nhánh, giờ hẹn và trạng thái dù gọi API trực tiếp. Không đổi quy tắc đặt lịch từ ngày mai, 07:00–17:00; không sửa ngày SQL để đi tắt A3.

Kiểm thử riêng SQL: `C5A_SQL_TEST=true` rồi `node --test test/viewing-status-sql.test.mjs` với cấu hình kết nối local. Test tạo/xóa CSDL riêng `HOMEDORM_C5A_TEST_*`, cần quyền tạo CSDL; không đưa fixture vào HOMEDORM4. Test thường bỏ qua ca này, kết quả chạy riêng phải báo tách biệt. Ảnh UI dùng API giả không thay nghiệm thu A3 thật.

## Xác nhận bàn giao/đối soát trên Avalanche và thanh toán mô phỏng

Luồng theo D-009 → D-013 trong [spec/decisions.md](../spec/decisions.md). Quản lý lập biên bản bàn giao Web2, hệ thống tự gửi bản xem vào tab **Hợp đồng** của khách kèm email. Khách **xác nhận** hoặc **yêu cầu chỉnh sửa**; khi khách yêu cầu sửa, quản lý phát hành bản mới. Chỉ bản khách xác nhận mới được ghi lên Avalanche: khách ký bằng ví nhúng trong tài khoản, ứng dụng trả phí gas. Kế toán gửi bảng đối soát cọc; khách đồng ý hoặc phản hồi. Mọi phiên bản đều được giữ và tự kiểm chứng được tại `/kiem-chung-avalanche`. Khi chưa cấu hình, Web2 vẫn chạy bình thường và phần xác nhận tự ẩn.

1. **CSDL:** chạy `cd web/backend && npm run avalanche:db:migrate`. Lệnh này thêm bảng xác nhận và thanh toán mô phỏng, mở rộng `HoaDon.PhuongThucThanhToan` và cập nhật các SP liên quan. Gói bàn giao v2 (C1) cần thêm `npm run handover-bundle:db:migrate`.
2. **Contract:** `cd blockchain && npm install && npm test`.
   - Local: `npm run chain` (cửa sổ riêng) rồi `npm run deploy:local`.
   - Fuji: tạo ví bằng `npm run fuji:keygen`, chia AVAX thử bằng `npm run fuji:fund`, rồi deploy theo [blockchain/README.md](../blockchain/README.md). Verify source bằng `artifacts/standard-input.json`.
3. **Backend `web/backend/.env`:** `AVALANCHE_ENABLED=true`, `AVALANCHE_CONTRACT_ADDRESS`, khóa thử của manager/accountant/relayer (chỉ đặt trên server).
   - Ví nhúng: tạo app trên Privy, đặt `PRIVY_APP_ID`. Mặc định `PRIVY_AUTH_MODE=email`: khách nhập mã OTP email một lần khi xác nhận (gói Privy miễn phí).
   - Nếu có gói Privy Scale: chạy `npm run privy:keygen`, dán public key vào Dashboard (JWT-based auth, claim `sub`), rồi đặt `PRIVY_AUTH_MODE=jwt` và `PRIVY_JWT_PRIVATE_KEY_FILE`.
   - **Chain local:**
     - Đặt `AVALANCHE_CHAIN_ID=31337`, `AVALANCHE_RPC_URL=http://127.0.0.1:8545`, `AVALANCHE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3` và khóa ví dev công khai của Hardhat (chỉ dùng local).
     - Khi thấy cấu hình này, `run.ps1` tự mở cửa sổ chain và deploy contract (`npm run local:ensure`).
     - Chain local mất dữ liệu khi tắt, nên hồ sơ xác nhận tạo trước đó không dùng tiếp được.
   - **Fuji:** đặt `AVALANCHE_CHAIN_ID=43113`, `AVALANCHE_RPC_URL`, `AVALANCHE_CONTRACT_ADDRESS` và ba khóa vận hành lấy từ `blockchain/.fuji-backend-env.local`.
   - Email: không đặt `SMTP_HOST` thì email chỉ in ra console; `MAIL_REDIRECT_TO` gom email demo về một hộp thư.
4. **Frontend `web/frontend/.env`:** `VITE_PRIVY_APP_ID`, `VITE_AVALANCHE_CONTRACT_ADDRESS`, `VITE_AVALANCHE_CHAIN_ID` (và `VITE_AVALANCHE_RPC_URL` khi dùng Fuji).
5. **Thanh toán cọc, khoản thu kỳ đầu và hóa đơn tháng bằng ví điện tử (mô phỏng):**
   - Bật mặc định. Đặt `PAYMENT_SIM_SECRET` (ít nhất 16 ký tự).
   - Khách mở phiếu cọc hoặc vào tab **Hợp đồng** để trả khoản thu kỳ đầu. Sau khi IPN thành công, hóa đơn kỳ đầu thành "Đã TT" và quản lý có thể bàn giao. Kế toán vẫn thu tay bằng tiền mặt hoặc chuyển khoản như trước.
   - Đây là cổng tự dựng để demo, không phải API của nhà cung cấp thật và không nhận tiền thật.
   - API: `GET/POST /api/thanh-toan-mo-phong/thu-nhan-phong/:maHopDong` (xem khoản phải thu hoặc tạo đơn, chỉ chủ hợp đồng).
6. **Đặt cọc (D-023):**
   - Chạy `cd web/backend && npm run auto-deposit:db:migrate` một lần để có tài khoản hệ thống `NVAUTO`, rồi `npm run deposit-flow:db:migrate`. Hai lệnh migration có thể chạy lại.
   - Sale chọn hình thức và giường khi gửi yêu cầu. Quản lý nhận email; khi quản lý duyệt, hệ thống tạo phiếu và chốt trong một transaction.
   - Mốc thời gian: yêu cầu chờ quá 8 giờ thì nhắc quản lý một lần, quá 12 giờ thì tự từ chối. Phiếu đã phát hành có hạn trả 24 giờ; hệ thống nhắc khách khi còn tối đa 3 giờ.
   - Tiền mặt do Sale thu kèm ảnh biên nhận, kế toán đánh dấu đã nộp quỹ. Chuyển khoản tay do kế toán xác nhận.
   - `DAT_COC_YEU_CAU_INTERVAL_MS` và `DAT_COC_HET_HAN_INTERVAL_MS` đặt chu kỳ quét (mặc định 300000 ms). `AVALANCHE_APP_ORIGIN` hoặc `CLIENT_URL` đặt gốc link email.
7. **Nhận phòng (D-024):**
   - Sau bước 6, chạy `cd web/backend && npm run residence-flow:db:migrate` (có thể chạy lại). Kiểm tra SQL trên dữ liệu tổng hợp, có rollback: `npm run residence-flow:db:verify`.
   - Hồ sơ đủ điều kiện được `NVAUTO` duyệt; trường hợp khác chuyển quản lý kèm lý do.
   - Email được gửi khi: cọc đã trả, có thành viên bị từ chối, lập hợp đồng, gần ngày nhận phòng mà chưa trả kỳ đầu, và khi kỳ đầu đã trả.

## Kiểm thử

| Phần | Lệnh | Ghi chú |
|---|---|---|
| Contract và luồng tích hợp trên chain local | `cd blockchain && npm test` | |
| SQL | `TEST_SQL=true npm run test:sql` | Cần SQL Server |
| Backend | `cd web/backend && npm test` | |
| Luồng đặt cọc | `node scripts/deposit-flow-verify.mjs` | Tạo hồ sơ tạm rồi rollback; cần SQL Server |
| Frontend | `cd web/frontend && npm run build && npm run test:avalanche-ui` | |
| Giao diện, dùng API giả | `npm run test:handover-ui`, `npm run test:shell-ui`, `npm run test:list-kit` | Cần server Vite đang chạy |
