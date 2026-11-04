# Phạm vi chức năng hiện hành

Ghi nhận: **2026-11-05 00:38:27 +07:00**. Tóm tắt từ [plan](../hackathon/plan.md), mục 1, 3, 4 và 8; [handoff](../hackathon/handoff.md), mục 6–9. Trạng thái triển khai xem [progress.md](progress.md).

## Mục tiêu và người dùng

Tiếp tục nền HomeStayDorm React/Vite + Express + SQL Server. Avalanche lưu lịch sử xác nhận bàn giao và đối soát cọc có phiên bản để khách biết ví nào đã đồng ý bản nào và tự đối chiếu file bằng chứng đã giữ.

MVP: một chi nhánh, ba vai trò **quản lý – kế toán – khách thuê**, dữ liệu giả, mục tiêu chạy Fuji. Quản lý và kế toán cùng thuộc phía vận hành. Phần Web2 hiện có tiếp tục xử lý đăng ký, cọc, hợp đồng, hóa đơn và thanh toán.

## Các chức năng cần thực hiện

Vị trí code theo D-008: contract/test/toolchain/shared nằm trong [blockchain/](../blockchain/README.md); ví/ký ở frontend, adapter/relayer ở backend. Đã tạo khung thư mục, chưa triển khai F-01–F-09; không thay đổi phạm vi nghiệm thu dưới đây.

| Mã | Chức năng / người thao tác | Điều kiện nghiệm thu |
|---|---|---|
| F-01 | Ví trong tài khoản — khách thuê | Khách thiết lập ví ngay trong app; liên kết tài khoản bằng phiên hợp lệ + challenge ký một lần; thử đăng nhập lại/khôi phục. Không gửi khóa khách cho backend; thay ví không đổi người ký hồ sơ cũ. SDK và loại ví chưa chọn. |
| F-02 | Xác nhận bàn giao — quản lý lập, khách xác nhận | Hiển thị hiện trạng, chính sách và cọc còn giữ; cùng snapshot được hiển thị, băm tại browser và ký. Khách lưu bản sao tại bước xác nhận; receipt/event đúng mới báo đã ghi nhận. |
| F-03 | Lập đối soát có phiên bản — kế toán | Snapshot khoản trừ, hoàn/thu thêm dựa trên calculator Web2; lưu phiên bản/hash và kiểm tra tổng, số học. Chốt nguồn cọc thực tế trước khi nối dữ liệu; không tự sao chép toàn bộ chính sách sang Solidity. |
| F-04 | Phản đối → sửa → đồng ý — khách/kế toán | Phản đối ràng buộc đúng bản và hash lý do; con người xem xét, tạo v2 giữ v1; khách ký đúng bản hiện hành. Chặn sửa bản đã chấp nhận và hành động sai thứ tự/quyền. |
| F-05 | App trả gas qua relayer | Chữ ký EIP-712 ràng buộc action, hồ sơ, version/hash, nonce, deadline và domain chain/contract. Kiểm tra EOA hoặc ERC-1271 theo ví đã chọn; chặn replay/sai signer. Relayer có quyền gửi, không ký thay khách; giới hạn yêu cầu/gas. |
| F-06 | Xuất bộ bằng chứng tại bước ký | Có nội dung, salt, mã hồ sơ, version, commitment, chain ID, contract, manifest và bản gốc file cần đối chiếu. Bản trước receipt ghi chưa xác nhận; bản sau bổ sung tx/event. Không chỉ lưu URL đính kèm có thể hết hạn. |
| F-07 | Verify độc lập — người giữ file | File + RPC đủ để kiểm tra, không xin lại tài liệu từ API quản lý. Dùng deployment đáng tin cậy để đối chiếu contract; chỉ rõ file bị sửa/thiếu, phiên bản cũ, trạng thái hiện tại và lỗi đọc RPC. |
| F-08 | Đồng bộ chain – SQL và trạng thái UI | Chỉ thành công sau receipt + event đúng. Gửi lặp không tạo bản ghi trùng; chain thành công/SQL lỗi có cách đọc lại để phục hồi. Lưu chain ID, contract, tx hash, log index; phân biệt đang gửi/thất bại/đã ghi nhận. |
| F-09 | Triển khai và demo Fuji | Contract deploy và verify source; ABI/address/UI thống nhất; chạy luồng đầy đủ ba vai trò, có tx thật, test phù hợp, README setup và bằng chứng demo. Local pass không thay thế nghiệm thu này. |

## Luồng demo đã thống nhất trong plan

1. Bàn giao ghi nệm đã rách, cọc còn giữ **3.000.000 VND giả lập**, demo hợp đồng đủ hạn/tỷ lệ 100%.
2. Kế toán lập v1: trừ 500.000 VND khoản khác + 400.000 VND vết rách; số hoàn dự kiến 2.100.000 VND.
3. Khách phản đối bằng biên bản cũ; con người xem xét; kế toán lập v2 bỏ 400.000 VND.
4. Khách lưu bằng chứng và xác nhận v2, hoàn dự kiến **2.500.000 VND**.
5. Verify file đúng, sửa một số để thấy lệch, mở tx và source trên explorer. Hồ sơ/giao dịch chuẩn bị trước phải nói rõ.

“Đã thống nhất đối soát” không đồng nghĩa “đã nhận tiền”. Chain không xác định sự thật về vết rách, không phân xử hoặc tự chuyển khoản hoàn.

## Ngoài MVP và phần tùy chọn

- Ngoài MVP: escrow/giữ hoặc chuyển tiền, NFT, token point, L1 riêng, AI phân xử; giao dịch riêng cho báo trả/thời gian báo trước; khai báo đã trả/đã nhận tiền on-chain.
- Tùy chọn sau khi luồng chính đạt nghiệm thu: simulator thanh toán hoặc MoMo sandbox. Ghi rõ mô phỏng hay API sandbox thật; nếu làm, kiểm tra callback đúng tiền/trạng thái và chống trùng. Chưa có task triển khai bắt buộc.
- Không chuyển nền SQL Server sang Supabase trong đợt chuẩn bị này.

## Điều kiện xuyên suốt

Không đưa CCCD, địa chỉ, tài khoản ngân hàng, ảnh hoặc nội dung biên bản lên chain. Chain chỉ giữ ID khó đoán, ví, commitment, version/state và số tiền tối thiểu cần thiết. Không khẳng định hash/salt bảo đảm ẩn danh hoặc chữ ký tự chứng minh hiệu lực pháp lý.

Kiểm thử cần phủ sai quyền/chữ ký, replay/hết hạn/sai domain, sai version/hash, tổng tiền và làm tròn, sửa file/thiếu salt/ảnh, relayer timeout/gas, SQL lệch chain và khôi phục ví. Ghi kết quả thực tế ở nhật ký; chưa có kết quả cho bộ yêu cầu này trong repo hiện hành.
