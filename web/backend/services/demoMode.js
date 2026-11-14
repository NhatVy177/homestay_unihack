// Chế độ demo (mặc định TẮT): bỏ điều kiện "đã đến giờ hẹn" khi Sale ghi kết quả buổi xem.
// Bật bằng DEMO_BO_QUA_GIO_HEN=1 trong .env. Cần DB đã chạy scripts/demo-viewing-time-db.mjs migrate.
export const boQuaGioHenKhiDemo = () => process.env.DEMO_BO_QUA_GIO_HEN === '1';
