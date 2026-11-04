# Quyết định và câu hỏi còn mở

Ghi nhận ban đầu: **2026-11-05 00:38:27 +07:00**. Các quyết định 04/11 được nhập lại từ plan/handoff, không biết giờ trao đổi gốc. “Theo handoff” không có nghĩa phiên này đã kiểm tra nguồn bên ngoài.

## Quyết định đang áp dụng

| Mã | Ngày sự kiện / nguồn | Kết luận và lý do |
|---|---|---|
| D-001 | 2026-11-04, không rõ giờ; plan §1, handoff §1, §6 | Tiếp tục HomeStayDorm cho bài solo; thêm xác nhận bàn giao/đối soát có phiên bản trên Fuji. Các hướng trong Proposal là lịch sử nghiên cứu, không phải sản phẩm đang xây. |
| D-002 | 2026-11-04, không rõ giờ; plan §3, handoff §7 | Ví trong app + app trả gas là mục tiêu MVP. Ưu tiên thử SDK và khôi phục; chưa chọn nhà cung cấp. Thay lựa chọn cũ để gasless sau; ví ngoài chỉ là công cụ thử nội bộ nếu cần. |
| D-003 | 2026-11-04, không rõ giờ; plan §3 | Khách ký đúng snapshot đang xem, browser tự tính hash; tải bằng chứng ngay lúc ký và hoàn thiện sau receipt. Verify độc lập để khách không phụ thuộc việc quản lý còn cung cấp file. |
| D-004 | 2026-11-04, không rõ giờ; plan §3, handoff §7 | Cắt bước báo trả và khai báo/xác nhận thanh toán on-chain; giữ thanh toán Web2. MoMo/simulator chỉ là tùy chọn; không thêm point/escrow/NFT/L1/AI phân xử vào MVP. |
| D-005 | 2026-11-04, không rõ giờ; plan §4, §8 | Demo đầu tiên dùng hợp đồng đủ hạn, cọc giả 3 triệu, v2 hoàn 2,5 triệu. Tái sử dụng calculator; policy hash chỉ ràng buộc tài liệu. Nguồn cọc và quy tắc thực tế vẫn cần chốt ở Q-01/Q-02. |
| D-006 | 2026-11-05, không rõ giờ trao đổi; chat hiện tại, commit `40acf39` | Repo làm việc chuyển sang `NhatVy177/homestay_unihack`, local `D:\HomeStayDorm`, nhánh main lúc chuyển. Cấu trúc `database/`, `web/`, `hackathon/`, bỏ docs học phần; giữ SQL Server. Origin đã đổi; lịch sử Git cũ vẫn được giữ trong repo mới. |
| D-007 | 2026-11-05; yêu cầu hiện tại, ghi lúc 00:38:27 +07:00 | Dùng `spec/` đơn giản và AGENTS.md để nối tiếp giữa các AI: ghi scope, quyết định, tiến độ, đường dẫn/nội dung đã sửa và nhật ký giờ Việt Nam. Tên thư mục/cách chia 5 file là lựa chọn triển khai của AI cho yêu cầu này. |
| D-008 | 2026-11-05 00:48:51 +07:00; yêu cầu Vy và đọc Senpai local `cde3357` | Tạo module `blockchain/` ở root cùng repo để chứa contract/test/scripts/shared/deployments; integration client ở frontend, integration server ở backend. Senpai dùng Next.js gom web/API còn HomeStayDorm có hai app riêng. Đây là lựa chọn tổ chức code trong quyền Vy giao; không đổi scope D-001–D-005. Mới tạo khung, chưa nhập nền cũ hoặc chọn toolchain/SDK. |
| D-009 | 2026-11-05, Vy chốt qua trao đổi; ghi lúc 02:13:15 +07:00 | **Sinh viên nhận phòng với nhân viên hướng dẫn trực tiếp; nhân viên lập biên bản Web2, khách tự xem/phản hồi/ký điện tử để hoàn tất xác nhận trên Avalanche.** Nếu chưa ký tại chỗ, gửi email link cho khách đăng nhập/ký sau. Phân biệt bàn giao thực tế và ký điện tử; không tự check-in, không ký giấy song song trong MVP, không nhân viên ký hộ hoặc email = chữ ký. Chỉ receipt/event hợp lệ mới xác nhận hoàn tất. Bổ sung D-001/D-003 và thay giả định fallback ký giấy từng thảo luận nhưng chưa ghi thành quyết định. 24h chỉ là đề xuất nhắc. |

Khi thay đổi một quyết định, thêm mã mới cùng thời gian, lý do, nguồn và mã bị thay thế; cập nhật nhãn quyết định cũ thành “được thay bởi D-xxx”. Không xóa lịch sử hoặc mặc định gợi ý AI/BTC là yêu cầu của Vy.

## Câu hỏi và phụ thuộc chưa giải quyết

| Mã | Nội dung cần rõ | Ai/nguồn giải quyết | Ảnh hưởng |
|---|---|---|---|
| Q-01 | `tienCocBanDau` có phải cọc thực tế còn giữ sau cấn trừ? Nguồn trường nào là đúng? | Vy + kiểm tra luồng SQL/repository | F-02/F-03; chưa dùng hồ sơ thật để cam kết tiền khi chưa rõ. |
| Q-02 | Dùng logic 80/100/50/70% theo calculator hiện tại hay quy định thời gian báo trước trong mô tả cũ? | Vy xác nhận nghiệp vụ + code/SQL | Không tự kết hợp hai chính sách; demo đủ hạn theo D-005. |
| Q-03 | SDK ví nào, cơ chế giữ/khôi phục khóa, loại EOA/smart account, chi phí/cấu hình? | Thử nghiệm kỹ thuật với tài khoản cấu hình phù hợp | F-01/F-05; chưa có lựa chọn nhà cung cấp. |
| Q-04 | Nền Avalanche cũ `09f8270` còn truy cập được và tái sử dụng được đến đâu? | Kiểm tra nhánh cũ ở repo homedorm trong đợt triển khai tiếp | Chưa nhập code; phải rà scope và đường dẫn `Web/` → `web/` trước khi tích hợp. |
| Q-05 | SQL/dữ liệu demo, RPC và AVAX thử cho deploy/relayer đã sẵn sàng chưa? | Kiểm tra môi trường thực tế | E2E/Fuji; không yêu cầu khóa bí mật qua chat. |
| Q-06 | Giờ đóng cổng, cổng nộp cuối cùng, lịch final? | Thông báo BTC hiện hành | Tài liệu 31/10 và handoff có mức xác nhận khác nhau. 20/11 là mục tiêu nội bộ, chưa xác minh lại deadline trong phiên này. |
| Q-07 | Ghi công cụ thể và phạm vi đồng ý của thành viên nhóm cũ? | Vy + thành viên liên quan | README/nộp bài; handoff chưa có xác nhận tất cả đã đồng ý. Không tự gửi tin nhắn. |
| Q-08 | Email provider và email liên hệ thực nhận link/OTP trong môi trường demo? | Codex rà code/env, Vy xác nhận nếu cần | F-02; không dùng email seed giả để giả định có email thật; không gửi secret qua chat. |
| Q-09 | Có nhắc sau 24h hay deadline cứng khác không? | Vy chốt sau | F-02; mặc định chưa tự hủy/khóa hoặc ký thay khi quá hạn. |

Theo handoff §4, BTC đã trả lời cho dùng dự án cũ/thi solo và hướng Web2 → Web3 phù hợp. Không mở lại cùng câu hỏi xin phép; Q-06/Q-07 là các thông tin còn thiếu riêng biệt.
