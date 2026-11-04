# Tích hợp Avalanche phía trình duyệt

Khung chuẩn bị, chưa có SDK ví, nút ký hoặc Verify hoạt động. Xem [cấu trúc blockchain](../../../../../blockchain/README.md).

Khi triển khai, đặt tại đây các hàm nối SDK ví, chứng minh kiểm soát ví, ký đúng snapshot người dùng xem, đọc chain và xuất/đọc file bằng chứng. Components/pages tiếp tục ở vị trí tương ứng trong frontend.

Tái sử dụng ABI và định nghĩa snapshot/hash/typed data/evidence ở `blockchain/src/` khi package được nối; tránh hai phiên bản tính hash ở browser và server. Verify dùng file người dùng giữ + RPC với deployment đáng tin cậy.

Chỉ nhận cấu hình public. Không import relayer, private key, Node filesystem, SQL, scripts deploy hay bộ artifact chứa bytecode. Chưa thay dependency, Vite config hoặc route UI trong đợt dựng khung.
