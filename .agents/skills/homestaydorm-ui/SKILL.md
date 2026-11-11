---
name: homestaydorm-ui
description: Quy chuẩn giao diện HomeStayDorm (React + CSS thường). Dùng khi sửa hoặc thêm bất kỳ màn hình, component, CSS nào trong web/frontend.
---

# Giao diện HomeStayDorm

Ứng dụng nghiệp vụ nhiều vai trò (khách, Sale, quản lý, kế toán, Admin), không phải trang quảng bá. Mục tiêu: người lạ theo được luồng, trạng thái chờ/lỗi rõ, nhất quán giữa các màn.

## Ràng buộc cứng

- **CSS thường + biến trong `src/styles/tokens.css`.** Không thêm Tailwind, thư viện UI, thư viện animation, font mới.
- **Chỉ đổi trình bày.** Giữ nguyên API, route, props, state, điều kiện hiển thị, chữ nghiệp vụ, `onSubmit`/`onClick`. Không đổi logic ký/verify trong `src/components/xacNhan/` và `src/lib/avalanche/`.
- **Không chép code** từ `D:\Nam4\Contest\Homestay-Dorm` (repo không có license). Chỉ học cách bố trí.
- Khách không thấy ví, địa chỉ, mã giao dịch, tên mạng (D-017). Phần đó chỉ ở tab quản lý/kế toán và trang kiểm chứng.

## Dùng lại trước khi viết mới

- Token: màu `--color-*`, bo góc `--radius-*`, khoảng cách `--space-*`, `--control-height`, cỡ icon `--icon-*`.
- Lớp chung trong `src/styles/`:
  - `global.css`: `ui-btn` (`--primary`, `--secondary`, `--ghost`, `--danger`, `--sm`), `ui-card`, `ui-table`, `ui-badge` (`--success`, `--warning`, `--danger`, `--info`, `--neutral`), `ui-input`, `ui-textarea`, `ui-tabs`, `ui-stat`, `ui-empty`.
  - `patterns.css`: `ui-form-field`, `ui-field-control`, `ui-required`, `ui-form-stepper`, `ui-dialog-heading`, `ui-icon--sm/--lg`.
  - `lists.css`: `ui-overview-grid`, `ui-overview-card`, `ui-list-toolbar`, `ui-list-search`, `ui-list-table-card`, `ui-list-count`, `ui-list-alert`, `ui-pagination`; ô bảng `ui-num` (số tiền, cột hành động canh phải), `ui-cell-code`, `ui-cell-main`, `ui-cell-sub` (`--warning`, `--strong`). Bảng `ktp-table`/`ui-table`/`admin-table` trong khung đã có sẵn tiêu đề cột, khoảng cách, màu hover; không viết lại.
  - `shell.css`: khung trang, thanh bên, đầu trang.
- Component: `src/components/common/` — `PageHeader`, `OverviewCards` (truyền `activeKey` + `onSelect` để thẻ lọc được như chip), `StatusBadge` (có `tone` khi nhãn không nằm trong bảng màu sẵn), `StatusFilterTabs`, `ListSearch` (+ `ListCount`), `TableState` (`kind` = loading/error/empty), `ListPagination`, `EmptyState`, `FormInput`, `Icon`, `ResultModal`, `BranchChip`.
- Mẫu một màn danh sách (theo bên Hằng): `OverviewCards` bấm được → `ui-list-toolbar` gồm `ListSearch` + `StatusFilterTabs` (+ `ListCount` nếu không phân trang) → `ktp-table-section ui-list-table-card` chứa bảng, `TableState`, `ListPagination`. Nút trong bảng: `ui-btn ui-btn--sm` (`--primary` cho việc cần làm, `--secondary` cho xem).

Thiếu thì thêm vào lớp/component chung, không viết riêng trong trang.

## Khi sửa một màn

1. **Bỏ `style={{...}}`** trong file đang sửa: chuyển sang lớp chung hoặc lớp của trang, dùng token. Màu, cỡ chữ, khoảng cách viết tay là lỗi.
2. Mỗi màn có đúng một tiêu đề trang, một hành động chính (nút đậm), các hành động phụ là nút viền.
3. Bảng: tiêu đề cột chữ thường in hoa nhỏ, số tiền canh phải, trạng thái dùng `StatusBadge`. Màn hẹp: bảng cuộn trong thẻ, trang không cuộn ngang.
4. Form: nhãn phía trên ô nhập, dấu bắt buộc, lỗi ngay dưới ô, nhóm trường theo ý nghĩa, nút gửi ở cuối bên phải.
5. Đủ 4 trạng thái: đang tải, rỗng (`EmptyState` + việc nên làm tiếp), lỗi (nói rõ làm gì tiếp), thành công.
6. Icon nét viền từ `Icon`, cỡ theo token; không dùng emoji làm icon.
7. Chữ tiếng Việt có dấu, câu ngắn, không thuật ngữ blockchain ở màn khách.

## Kiểm tra trước khi báo xong

- `npm run build` trong `web/frontend` qua.
- `npm run test:avalanche-ui` qua (màn xác nhận không hỏng).
- Mở màn ở 1440px và 390px: không tràn ngang, không lỗi console.
- Đếm `style={{` trong file đã sửa: báo số trước và sau.
