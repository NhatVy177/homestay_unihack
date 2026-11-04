# Tích hợp Avalanche phía backend

Khung chuẩn bị, chưa có relayer hoặc adapter chạy thật. Xem [cấu trúc blockchain](../../../../blockchain/README.md).

Khi triển khai, đặt tại đây:

- Adapter: chuyển kết quả calculator/repository hiện có thành snapshot; chốt `tienCocBanDau`/cọc còn giữ trước khi nối dữ liệu thật.
- RPC client và relayer: kiểm tra chữ ký/quyền, gửi giao dịch được phép, trả gas; khóa nằm ở môi trường server.
- Đồng bộ: đọc receipt/event, kiểm tra đúng deployment/hồ sơ/version, cập nhật SQL qua repository và phục hồi khi chain thành công nhưng SQL lỗi.

Routes/controllers/middleware vẫn theo các thư mục hiện tại của backend; service gọi integration khi cần. Calculator ở `services/doiSoatCalculator.service.js` tiếp tục là nguồn nghiệp vụ, không chuyển vào shared browser code. Mã phụ thuộc SQL hoặc môi trường server không được xuất qua `blockchain/src/`.

Backend dùng lại định nghĩa ABI/snapshot/typed data/evidence trong `blockchain/src/` khi đã có và đã cấu hình package dependency. Chưa thay package.json hoặc import runtime của backend trong đợt này.
