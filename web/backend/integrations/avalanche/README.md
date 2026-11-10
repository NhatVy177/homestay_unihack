# Tích hợp Avalanche phía backend

Đã có adapter SQL, workflow review/version, relayer, receipt recovery và test chain local. Chưa nghiệm thu Fuji hoặc trọn luồng thật qua SQL/Privy. Xem [cấu trúc blockchain](../../../../blockchain/README.md).

Các phần tại đây:

- Adapter: chuyển kết quả calculator/repository hiện có thành snapshot; C1 dùng `PhieuDatCoc.SoTienCoc` theo D-034, chưa xử lý hoàn một phần D-026.
- RPC client và relayer: kiểm tra chữ ký/quyền, gửi giao dịch được phép, trả gas; khóa nằm ở môi trường server.
- Đồng bộ: đọc receipt/event, kiểm tra đúng deployment/hồ sơ/version, cập nhật SQL qua repository và phục hồi khi chain thành công nhưng SQL lỗi.

Routes/controllers/middleware vẫn theo các thư mục hiện tại của backend; service gọi integration khi cần. Calculator ở `services/doiSoatCalculator.service.js` tiếp tục là nguồn nghiệp vụ, không chuyển vào shared browser code. Mã phụ thuộc SQL hoặc môi trường server không được xuất qua `blockchain/src/`.

Backend dùng package `@homestaydorm/settlement` trong `blockchain/` cho ABI, canonical snapshot, hash và typed data.

## C1: gói bàn giao v2

`contractEvidence.js` lấy điều khoản thực từ `HopDongThue` và tiền cọc theo phiếu; chỉ whitelist mã hợp đồng, giá thuê, ngày bắt đầu/kết thúc, kỳ thanh toán và tiền cọc. Không lấy họ tên/CCCD/điện thoại vào payload. `signedContract` chỉ có tên file do hệ thống đặt và SHA-256 bytes file. Các attachment ảnh tình trạng phòng giữ cơ chế cũ.

`policyVersion` là 8 ký tự hex đầu SHA-256 UTF-8 của đúng `policyText`, dùng làm nhãn hiển thị. **Không thay thuật toán `policyHash` hoặc contract:** policy document đầy đủ (text/version) vẫn được băm cùng salt như trước. Snapshot chính sách được giữ cố định theo phiếu, dùng chung cho phiếu khách, email cọc và bàn giao. Hồ sơ cũ được đánh dấu cần khách đứng tên xác nhận chính sách bổ sung; không giả lập lịch sử đã đọc chính sách lúc cọc.

Trước khi chạy code C1 với DB thật, **hỏi Vy**, rồi từ `web/backend` chạy:

```powershell
npm run handover-bundle:db:migrate
```

Lệnh cần `.env` DB hợp lệ; không tự sao chép secrets giữa worktree. File [migration](../../../../database/avalanche/20261111_handover_evidence.sql) tạo hai bảng `DepositPolicySnapshot` và `SignedContractEvidence`, đánh dấu phiếu hiện có cần xác nhận bổ sung (chỉ lúc tạo bảng). Không đổi số tiền, trạng thái hợp đồng hoặc bản Avalanche cũ. Có thể chạy lại. Chưa chạy migration không được coi C1 đã nghiệm thu SQL.

Sau migration:

1. Khách mở chi tiết **phiếu cọc**, đọc chính sách/phiên bản; với phiếu cũ tích đã đọc và bấm **Xác nhận chính sách**. Chỉ chủ phiếu được xác nhận, không có ký hộ/ghi hồi tố.
2. Sale mở **Lập hợp đồng → Xem hợp đồng**, tải ảnh/PDF đã ký (PNG/JPG/WebP/PDF, tối đa 5 MB).
3. Quản lý phát hành bàn giao như cũ. Thiếu ảnh hoặc xác nhận thì dừng với thông báo. Hồ sơ review v1 chưa lên chuỗi cần phát hành bản sửa v2, giữ lịch sử v1. V1 đã lên chuỗi/khóa không đổi.

File ký nằm riêng tại `web/backend/secrets/signed-contracts/`, bị Git bỏ qua, không dưới public `/uploads`. API metadata/download kiểm tra khách đứng tên hoặc nhân viên đúng chi nhánh; upload chỉ Sale đúng chi nhánh. Sau khi có draft v2 hoặc bản đã khóa không được thay ảnh. File cũ được giữ riêng cho bằng chứng/lịch sử; sao lưu cùng DB khi chuyển máy. Bộ JSON không chứa file hợp đồng gốc.

API bổ sung (đều qua xác thực của `/api/hop-dong`):

- `GET /phieu-coc/:id/chinh-sach`, `POST /phieu-coc/:id/chinh-sach/xac-nhan` với `{version}`.
- `GET /:id/ban-ky`, `POST /:id/ban-ky` multipart field `file`, `GET /:id/ban-ky/file` tải riêng có quyền truy cập.

Kiểm tra tự động: `blockchain npm test`, `web/backend npm test`, `web/frontend npm run build`, `npm run test:avalanche-ui`, `npm run test:handover-ui`. Ca UI C1 dùng API giả và Hardhat trong bộ nhớ; ảnh ở `web/frontend/.ui-screens/c1/`, không phải SQL/Fuji thật.
