# Nhật ký trao đổi và thay đổi

Múi giờ: **Asia/Saigon (UTC+07:00)**. Mục mới thêm ở cuối. Ghi kết luận và thay đổi có ích cho việc tiếp nối; không phải bản sao nguyên văn toàn bộ chat. Những mốc nhập lại được ghi rõ nguồn và độ chính xác thời gian.

## 2026-11-04 (không rõ giờ) — J-001 — Bối cảnh từ phiên AI trước

- Ghi lại: 2026-11-05 00:38:27 +07:00 bởi Codex, từ handoff/plan Vy cung cấp; không có timestamp gốc từng trao đổi.
- Trao đổi/kết luận: tiếp tục HomeStayDorm, Fuji cho bàn giao/đối soát; mục tiêu ví trong app + relayer trả gas, bằng chứng ngay lúc ký; cắt giao dịch báo trước và xác nhận tiền, MoMo tùy chọn, chưa làm point (D-001 đến D-005).
- Nền triển khai được báo: `homedorm/feature/avalanche-settlement` tại `09f8270`, có DormSettlement, adapter, evidence/ABI, scripts/tests và Verify. Handoff báo 4 test contract + 3 adapter và deploy local qua. Chưa xác minh lại ở phiên này.
- File lịch sử: `hackathon/plan.md`, `hackathon/handoff.md` mô tả phần trên; không có diff đầy đủ của phiên cũ để nhận là danh sách file sửa đã được kiểm chứng.
- Còn lại: ví nhúng, EIP-712/relayer, nối SQL/UI, evidence tại bước ký, Fuji và E2E; chốt policy/nguồn cọc. Code cũ dùng msg.sender và còn các bước đã bị cắt khỏi plan.

## 2026-11-05 00:32:50 +07:00 — J-002 — Cấu trúc repo và push sang homestay_unihack

- Thời gian trên lấy từ metadata commit `40acf39`, không phải giờ bắt đầu mọi trao đổi hoặc giờ push; ghi lại lúc 2026-11-05 00:38:27 +07:00.
- Yêu cầu của Vy trong chat: dùng bản `D:\HomeStayDorm`, theo cấu trúc repo mẫu nhưng giữ nền SQL Server local; gom tài liệu UniHack; push sang repo mới `homestay_unihack`.
- Kết luận: D-006. Đổi origin sang repo mới; lịch sử Git vẫn có các commit nền cũ.
- File/nội dung: `Database/` → `database/`, `Web/` → `web/`; sửa `.gitignore`, `run.bat`, `run.ps1`, các đường dẫn migration SQL và thông báo `connection.js`; thay đường dẫn tuyệt đối trong `nhanVienSale/refactor.cjs`, `rewrite.cjs`; cập nhật chú thích `trace-layers.mjs`; thêm README gốc và các file `hackathon/`. Bản gốc 4 file ở Unihack vẫn được giữ, không di chuyển `.git` từ repo tài liệu.
- Kiểm tra đã chạy ở phiên đó: build frontend, cú pháp backend, đường dẫn SQL và hash file chép đều qua; chưa kiểm thử E2E SQL. Giữ hai dòng trắng EOF có sẵn trong run.bat/run.ps1; không coi `git diff --check` lúc đó sạch hoàn toàn.
- Git: `40acf39f7c698f82b45d3f571e6fe8febf3d4ec0` — `chore: prepare HomeStayDorm for UniHack`; main đã push và đối chiếu SHA với origin trong chat trước. Chưa có blockchain trong snapshot này.

## 2026-11-05 00:38:27 +07:00 — J-003 — Tạo sổ làm việc cho các phiên AI tiếp theo

- Người thực hiện: Codex theo yêu cầu Vy trong phiên hiện tại.
- Yêu cầu: đọc kỹ mọi file hackathon, nhất là handoff; tạo cách làm đơn giản kiểu OpenSpec để biết đã thảo luận gì, sẽ thực hiện chức năng nào, sửa file/nội dung nào và thời gian cụ thể.
- Đã đọc: cả 5 file `hackathon/handoff.md`, `plan.md`, `Proposal.md`, `README.md`, `Unihack_Context.md`; đối chiếu Git, cây file, App.jsx/packages và calculator local.
- Kết luận: D-007; dùng 5 file spec và AGENTS. Scope giữ theo plan/handoff; Proposal chứa lựa chọn cũ. Nhánh mới chưa có nền Avalanche được handoff báo ở repo cũ (Q-04). Không nhập code trong đợt tài liệu.
- File/nội dung:
  - `AGENTS.md`: hướng dẫn đọc hồ sơ đầu phiên, cập nhật sau trao đổi/thay đổi, timestamp, kiểm tra và commit/push theo quy ước đã nêu.
  - `spec/README.md`: thứ tự đọc, nguồn ưu tiên, workflow ngắn và mẫu nhật ký; xử lý hash của commit chứa nhật ký.
  - `spec/scope.md`: F-01 đến F-09, nghiệm thu, demo số tiền, ngoài scope/tùy chọn.
  - `spec/decisions.md`: D-001 đến D-007, Q-01 đến Q-07; phân biệt quyết định/đề xuất và nguồn lịch sử.
  - `spec/progress.md`: trạng thái thực tế repo mới, T-01 đến T-09, kết quả kiểm tra theo nguồn và điểm tiếp tục.
  - `spec/journal.md`: nhập các mốc trước có nguồn và ghi đợt hiện tại; không bịa giờ sự kiện cũ.
  - `README.md`: thêm spec/AGENTS vào cây và link bắt đầu cho AI.
  - `hackathon/handoff.md`: thêm chú thích đầu file về repo mới và trạng thái code; giữ nguyên thân bàn giao lịch sử.
  - `hackathon/plan.md`: thêm cập nhật repo/điểm tiếp tục, phân biệt nền Avalanche cũ với bản hiện tại; giữ scope chi tiết.
  - `hackathon/Proposal.md`: đánh dấu tài liệu ý tưởng lịch sử, trỏ tới plan/spec hiện hành.
- Kiểm tra lúc **2026-11-05 00:43:02 +07:00**: 31 link local trong 10 file Markdown hợp lệ; spec có đúng 5 file; `git diff --check` qua cho các file tracked đã sửa. Diff tài liệu gốc chỉ thêm chú thích/link, giữ nội dung lịch sử; không sửa code ứng dụng/SQL. Không chạy lại build/test nghiệp vụ vì đợt này chỉ sửa Markdown. Kiểm tra staged diff được thực hiện trước commit.
- Kết quả: T-02 hoàn thành về nội dung và kiểm tra; `progress.md` đã cập nhật thời gian/trạng thái. Bước tiếp T-03 kiểm tra nhánh Avalanche cũ trước khi tiếp tục tích hợp.
- Git: commit mang mã J-003; xem `git log --all --grep="J-003"`. Trạng thái push được đối chiếu với origin sau khi commit, không tự điền hash chưa tồn tại.
