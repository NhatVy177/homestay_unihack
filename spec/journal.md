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

## 2026-11-05 00:48:51 +07:00 — J-004 — Đọc Senpai và tách module blockchain

- Người thực hiện: Codex theo yêu cầu Vy đọc `D:\Nam4\Contest\senpai`, đánh giá cấu trúc Avalanche và tổ chức riêng nếu phù hợp.
- Căn cứ: Senpai local HEAD `cde33571a348c26bae614f11aa31b32487cbc285`; đọc README, package, Foundry config, MiuCoin, script export artifact, ví/ký, relayer và API session. Chưa chạy app/test hoặc xác minh deployment Senpai. Có thay đổi sẵn trong `web/package-lock.json` của Senpai, không sửa repo tham khảo.
- Kết luận D-008: Senpai gom Next.js nên đặt contract dưới web; HomeStayDorm React/Express riêng phù hợp `blockchain/` ở root. Ví và relayer vẫn chạy ở đúng app. Chỉ tạo khung phân trách nhiệm; không copy token/x402/vault, chưa nhập nhánh `09f8270`, chưa chọn SDK/toolchain và chưa deploy.
- File và nội dung:
  - `blockchain/README.md`: sơ đồ, phân trách nhiệm, chiều phụ thuộc, quy ước ABI/deployment và đối chiếu Senpai; ghi rõ trạng thái khung.
  - `blockchain/package.json`: private ESM package, chưa có dependencies/scripts runtime. `blockchain/.gitignore`: output, secrets, dữ liệu chain local.
  - `blockchain/contracts/.gitkeep`, `test/.gitkeep`, `scripts/.gitkeep`, `src/abi/.gitkeep`, `deployments/.gitkeep`: giữ các vị trí dự kiến trong Git.
  - `web/backend/integrations/avalanche/README.md`: adapter, relayer và đồng bộ server; calculator vẫn thuộc services.
  - `web/frontend/src/lib/avalanche/README.md`: vị trí ví/ký/đọc chain/evidence client; pages/components vẫn ở frontend.
  - `README.md`, `web/CauTrucThuMuc.txt`: cây thư mục mới và trạng thái chạy; loại đường dẫn skeleton lỗi thời khỏi cây thư mục.
  - `hackathon/plan.md`, `spec/scope.md`: thêm tổ chức code, giữ phạm vi F-01–F-09.
  - `spec/decisions.md`, `spec/progress.md`, `spec/journal.md`: D-008, T-10, phân biệt khung mới với nền cũ chưa nhập và nhật ký đợt này.
- Kiểm tra lúc **2026-11-05 00:50:10 +07:00**: 34 link local hợp lệ; package JSON parse được, private ESM đúng; 7 đường dẫn thử cho env/output/local deployment bị ignore, ABI/deployment Fuji/source placeholder không bị ignore; `git diff --check` qua. Senpai vẫn chỉ có thay đổi package-lock tồn tại trước phiên. Không chạy lại build/test ứng dụng hoặc thêm tests vì chỉ thêm khung/Markdown, không đổi import/dependency/runtime web. Trước commit kiểm tra staged diff bao gồm các file mới.
- Kết quả: T-10 hoàn thành phần tổ chức thư mục; đã cập nhật progress. Chưa có contract/test nghiệp vụ/deployment để báo chạy thành công.
- Bước tiếp: T-03 kiểm tra nền cũ; sau đó chọn toolchain và nối các phần theo scope. T-10 không thay nghiệm thu F-01–F-09.
- Git: commit mang mã J-004; tra bằng `git log --all --grep="J-004"`; báo hash và trạng thái push sau khi thực hiện.

## 2026-11-05 02:13:15 +07:00 — J-005 — Chốt nhân viên bàn giao, sinh viên ký điện tử qua link email khi cần

- Người thực hiện: ChatGPT theo yêu cầu của Vy; thời gian trên là lúc ghi hồ sơ, không phải giờ của mọi trao đổi trước.
- Yêu cầu: cập nhật quyết định để AI khác hiểu và push lên repo, viết prompt Codex sửa code. HomeStayDorm phục vụ sinh viên, nhân viên vẫn dẫn xem phòng; khách phải tự ký điện tử, nếu chưa ký tại chỗ thì gửi email link để ký sau. Không chọn tự check-in hay fallback giấy song song trong MVP.
- Kết luận: D-009, F-02; tách bàn giao thực tế với xác nhận chain, khách có quyền phản hồi/sửa phiên bản; email/link/OTP không là chữ ký; 24h chỉ là gợi ý, Q-08/Q-09 còn mở.
- File/nội dung: hackathon/plan.md (luồng sản phẩm), spec/scope.md (nghiệm thu F-02), spec/decisions.md (D-009 và Q-08/Q-09), spec/progress.md (đầu việc và giới hạn snapshot code), spec/journal.md (mục này).
- Kiểm tra: chỉ so nội dung tài liệu; chưa chạy build/test app hay Fuji. Chưa kiểm code local mà Codex vừa hoàn thành; phải đọc source và git status trước khi sửa.
- Bước tiếp: Codex kiểm code thực tế, triển khai phần thiếu UI khách, email, phiên bản/phản hồi, chữ ký/receipt, test quyền và trạng thái; cập nhật nhật ký.
- Git: thay đổi tài liệu trên main bằng một commit J-005; đối chiếu SHA commit với nhánh main sau push.

## 2026-11-05 14:43:07 +07:00 — J-006 — Claude đọc dự án, đối chiếu code và đánh giá plan theo góp ý BTC

- Người thực hiện: Claude (Claude Code) theo yêu cầu Vy.
- Yêu cầu: đọc hackathon/ và spec/, đánh giá việc áp dụng Avalanche trong plan đã hợp lý chưa. Vy gửi 2 ảnh chat với BTC (05/11, ~13:42–13:50): solo/nhiều project/dùng project cũ OK; README cần setup + công nghệ; tham khảo repo Senpai; ví nên nhúng trong tài khoản, không MetaMask/Core; có thể tạo token demo, ví dụ point tích điểm/hoàn phí ra point đổi quà/giảm giá; Web2 nên hoàn thiện thêm thanh toán MoMo giả lập; BTC đánh giá toàn bộ sản phẩm, Web3 chỉ cần áp dụng vừa đủ, không làm ảnh hưởng UX Web2, “người dùng không biết đây là web3”. **Vy nói rõ đây là gợi ý của BTC, chưa chốt.**
- Kiểm tra thực tế: main = origin, HEAD `e4b5d98`; commit `fadd0ec` đã có contract/relayer/Privy/Verify (progress.md cũ ghi chưa có — đã đính chính). `blockchain: npm test` → 11 pass, 1 skip (SQL), 0 fail. Chưa build frontend, chưa chạy SQL/Privy thật, chưa Fuji.
- Đánh giá (đề xuất của Claude, **chưa chốt**):
  - Use case bàn giao/đối soát cọc có phiên bản + Verify là phần Web3 có ý nghĩa, đúng quy tắc không giữ tiền/không PII; chất lượng kỹ thuật contract/relayer tốt.
  - Lệch với góp ý UX của BTC: portal riêng, đăng nhập Privy bằng email lần hai, hiện địa chỉ ví/“liên kết ví”/tx hash, bắt buộc tải file + tick “đã lưu” trước khi ký, nhân viên nhập tay mã biên bản/chính sách/ảnh. Đề xuất: Privy custom auth dùng phiên HomeStayDorm (ví tạo ngầm), nút “Xác nhận biên bản” đặt trong màn hợp đồng có sẵn, chi tiết blockchain gom vào mục “Thông tin xác thực”, phát hành on-chain tự động từ thao tác Web2, gửi bằng chứng qua email sau receipt thay cho bước tick bắt buộc.
  - Lệch giữa D-009 và contract: biên bản bàn giao không có phiên bản/yêu cầu sửa trên chain. Đề xuất: vòng yêu cầu chỉnh sửa làm ở Web2, chỉ bản cuối khách chấp nhận mới lên chain.
  - Scope: còn ~16 ngày, ưu tiên nối UI vào luồng Web2, deploy + verify Fuji, README/video. MoMo giả lập có thể nâng lên việc nhỏ sau khi Fuji chạy (BTC chấm cả Web2). Token point: chưa nên làm trong MVP; nếu làm thì là ưu đãi riêng, không thay tiền cọc phải hoàn bằng point.
- File và nội dung: `spec/progress.md` — thêm mục “Đính chính 14:43” (code đã có, kết quả test, khoảng trống D-009, plan.md có thay đổi chưa commit không do phiên này), sửa trạng thái T-03/T-05/T-06; `spec/journal.md` — mục này. Không sửa plan/scope/decisions vì chưa có quyết định mới.
- Câu hỏi chờ Vy: (1) đưa vòng sửa biên bản về Web2? (2) dùng Privy custom auth bỏ đăng nhập lần hai? (3) MoMo giả lập vào scope chính hay giữ tùy chọn? (4) point bỏ hay dự phòng? (5) thay đổi chưa commit trong `hackathon/plan.md` có phải Vy chủ động xóa?
- Git: commit chỉ gồm 2 file spec trên, mã J-006; không gom thay đổi `hackathon/plan.md`.

## 2026-11-05 15:29:43 +07:00 — J-007 — Vy chốt D-010 → D-014; Claude triển khai và kiểm thử local

- Người thực hiện: Claude (Claude Code) theo yêu cầu Vy. Trao đổi lúc ~14:5x: Vy hỏi “ví nhúng là gì” (đã giải thích: ví tạo sẵn trong tài khoản app, dịch vụ ví giữ khóa; kết hợp relayer thì người dùng không cần cài ví/mua AVAX), đồng ý các nhận xét J-006 và yêu cầu triển khai; trả lời (1) được, (2) được, (3) MoMo giả lập vào scope chính làm nhỏ, (4) point để dự phòng, (5) không chủ động xóa mục trong plan.md.
- Kết luận: D-010, D-011, D-012, D-013, D-014 (spec/decisions.md, ghi lúc 14:58:04). Mục “Tổ chức code…” trong `hackathon/plan.md` được thêm lại nguyên văn bằng Edit (lệnh `git checkout` bị chặn bởi chế độ an toàn).
- Phát hiện thêm khi đọc code: tab bàn giao Web2 và SP05 bắt buộc “khách đã ký biên bản” (ký giấy) — trái D-009; trang khách thật là `KhachHangPortalPage.jsx` (trang `KhachDangThuePage.jsx` chỉ là mẫu tĩnh, không sửa); backend chưa có thư viện email.
- File và nội dung:
  - Backend Avalanche: `web/backend/integrations/avalanche/service.js` (viết lại theo D-010/D-012: `publish` tự phát hành bản xem, `requestChange`, `revise`, `remind`, `statements`; `prepare` ghi bản đã xem lên chain rồi trả typed data; bỏ yêu cầu `savedCopy`; ghi lịch sử email), `sources.js` (cọc từ `PhieuDatCoc.SoTienCoc`, chính sách sinh từ `QuyDinhHoanCoc`, biên bản chưa gửi, liên hệ khách, danh sách đối soát), mới `index.js` (cấu hình + hook sau khi lập biên bản Web2), `notifications.js` (mẫu email, không chứa nội dung biên bản), `privy-jwt.js` (JWT RS256 + JWKS); `routes/avalanche.routes.js` (route mới, JWKS công khai, token Privy chỉ cho khách).
  - Email: mới `web/backend/integrations/mail/mailer.js` (SMTP hoặc dev-log, `MAIL_REDIRECT_TO`); thêm dependency `nodemailer@10.1.7` (pin, bản phát hành 18/10) vào `web/backend/package.json` + lockfile.
  - Web2 bàn giao: `services/nhanPhong.service.js` (bỏ chặn chưa ký giấy, lưu `daKyBienBan=false`), `controllers/nhanPhong.controller.js` (gọi hook, trả `xacNhanDienTu`), `database/SP_NhanPhong/sp_lap_bien_ban_ban_giao.sql` (SP05 bỏ kiểm tra `@DaKyBienBan`).
  - Thanh toán mô phỏng: mới `database/migrations/20261105b_payment_simulator.sql`, `web/backend/integrations/payment-sim/service.js`, `sql.js`, `routes/thanhToanMoPhong.routes.js`; `index.js` gắn route `/api/thanh-toan-mo-phong`.
  - Script/cấu hình: `scripts/avalanche-db.mjs` (migrate chạy cả migration mới + batch SP05 lấy từ file SP; kiểm tra trạng thái SP), mới `scripts/privy-jwt-keygen.mjs`, `package.json` (scripts `test`, `privy:keygen`), `.env.example` (Privy, SMTP, simulator), `.gitignore` (`secrets/`, `outbox/`).
  - Frontend: mới `src/components/xacNhan/` (`AccountSignerProvider.jsx`, `signerContext.js`, `HopDongXacNhanSection.jsx`, `QuanLyXacNhanTab.jsx`, `KeToanXacNhanTab.jsx`, `DocumentView.jsx`, `xacNhan.css`), `src/lib/avalanche/api.js`, `src/pages/thanhToanMoPhong/` (trang + CSS); sửa `KhachHangPortalPage.jsx` (khu xác nhận trong tab Hợp đồng, `?tab=`, nút ví điện tử mô phỏng), `NhanVienQuanLyPage.jsx`/`NhanVienKeToanPage.jsx` (tab mới thay link rời), `BanGiaoPhongTab.jsx` (bỏ ô ký giấy, báo kết quả gửi khách), `App.jsx` (route `/thanh-toan-mo-phong/:id`), `pages/avalanche/AvalanchePortal.jsx` (dùng component mới); xóa `pages/avalanche/PrivyPortal.jsx`; `scripts/avalanche-smoke.mjs` (kỳ vọng UI mới + trang cổng mô phỏng).
  - Test: `blockchain/test/workflow.test.mjs` (luồng mới, quyền, bản cũ, email không là chữ ký, thiếu ví); mới `web/backend/test/payment-sim.test.mjs`, `privy-and-mail.test.mjs`.
  - Tài liệu: `README.md` (công nghệ + hướng dẫn setup Avalanche/Privy/email/simulator/test), `hackathon/plan.md`, `spec/scope.md` (F-01/F-02/F-06, thêm F-10/F-11), `spec/decisions.md`, `spec/progress.md`, `spec/journal.md`.
- DB local: đã chạy `npm run avalanche:db:migrate` trên HOMEDORM4 — tạo bảng `PaymentSimOrder`, cập nhật SP05; kiểm tra lại báo `electronic-confirmation`. (Lần kiểm tra đầu báo sai do điều kiện LIKE khớp nhầm `-99`; đã sửa điều kiện.)
- Kiểm tra: `blockchain npm test` 12 pass/0 fail/1 skip; `TEST_SQL=true npm run test:sql` 1 pass; `web/backend npm test` 6 pass; import các module backend OK; `web/frontend npm run build` qua; `npm run test:avalanche-ui` PASS; truy vấn đọc `sources.js` trên DB thật trả đúng dữ liệu (khách mẫu không có email → cần `MAIL_REDIRECT_TO` khi demo). `git diff --check` qua.
- Chưa kiểm tra: Privy thật, SMTP thật, E2E HTTP lập biên bản → tự phát hành với DB thật, cổng mô phỏng với phiếu cọc thật, Fuji.
- Còn lại: T-13 (Privy), E2E local, T-08 Fuji, T-09 hồ sơ nộp. Q-01/Q-08/Q-09 vẫn mở.
- Git: commit mã J-007 trên main, không gồm file ngoài đợt này.

## 2026-11-05 15:44:12 +07:00 — J-008 — Cấu hình Privy App ID và khóa JWT trên máy local

- Người thực hiện: Claude theo yêu cầu Vy.
- Trao đổi: Vy gửi một chuỗi `0x…` tưởng là App ID; Claude kiểm tra trên Fuji (chỉ đọc) thấy đó là địa chỉ ví thường, chưa có số dư/giao dịch, không phải App ID. Vy gửi ảnh App ID đúng của app Privy “HomeStayDorm”.
- Kiểm tra: gọi endpoint công khai của Privy với App ID → HTTP 200, đúng app “HomeStayDorm”; cấu hình hiện tại `custom_jwt_auth=false` (chưa bật JWT-based auth), `allowed_domains` trống.
- File/cấu hình (đều nằm ngoài Git, không ghi giá trị bí mật vào hồ sơ): `web/frontend/.env` đã có sẵn đúng `VITE_PRIVY_APP_ID`; nối thêm `PRIVY_APP_ID`, `PRIVY_JWT_PRIVATE_KEY_FILE` vào `web/backend/.env`; chạy `npm run privy:keygen` tạo `web/backend/secrets/privy-jwt-private.pem`. Trong repo chỉ sửa `spec/progress.md` (T-13) và mục này.
- Kết quả: backend ký JWT RS256 (`sub`, `iss=homestaydorm`, `aud`=App ID, hạn 10 phút), chữ ký verify được bằng JWKS, JWKS không chứa phần khóa riêng.
- Còn lại: Vy bật JWT-based auth trên dashboard và dán public key (claim `sub`); giữ App Secret ở nơi an toàn (code không dùng tới); sau đó deploy local + bật `AVALANCHE_ENABLED` để thử luồng ví thật.

## 2026-11-05 23:50:00 +07:00 — J-009 — JWT Privy cần gói trả phí; chuyển sang OTP email (D-015) và dựng môi trường test local

- Người thực hiện: Claude theo yêu cầu Vy. Thời gian trên là lúc ghi; trao đổi diễn ra từ sau J-008.
- Trao đổi: Vy không tìm thấy mục JWT trong Privy Dashboard (đã xem tab Login methods, Advanced; ô tìm kiếm có "Authentication > JWT" nhưng không mở được). Claude tra tài liệu Privy: JWT-based auth yêu cầu gói **Scale** (trả phí). Đưa 3 hướng: A OTP email (miễn phí), B nâng gói, C tự giữ khóa (không khuyên). Vy hỏi khi nào nhập email (trả lời: chỉ khi bấm xác nhận lần đầu, không đổi đăng nhập HomeStayDorm), cách trả lời giám khảo (OTP = xác thực lại trước khi ký liên quan tiền cọc; nói thật về giới hạn gói miễn phí), và đồng ý **hướng A**. Vy sẽ hỏi BTC xem có cấp gói không (Q-10; tin mẫu đã đưa trong chat). Gợi ý dashboard: bật "Disable confirmation modals", có thể tắt External wallets.
- Kết luận: D-015 (tạm thay D-011), Q-10.
- File và nội dung:
  - `web/frontend/src/components/xacNhan/AccountSignerProvider.jsx`: thêm chế độ email (headless `useLoginWithEmail`, tự `createWallet` vì đăng nhập headless không tự tạo ví, liên kết ngầm, đăng xuất phiên Privy cũ khác email tài khoản khi mở trang); giữ chế độ jwt.
  - `web/frontend/src/components/xacNhan/HopDongXacNhanSection.jsx`: khung nhập mã OTP (`EmailCodeGate`), nhớ thao tác khách vừa bấm và tự chạy tiếp khi sẵn sàng (đọc signer mới nhất qua ref); luôn bọc ví khi có App ID. `xacNhan.css`: kiểu khung mã.
  - `web/backend/routes/avalanche.routes.js`: `/config` trả `walletAuth` ('email' mặc định, 'jwt' khi `PRIVY_AUTH_MODE=jwt` + có khóa); `/privy/token` chỉ dùng ở chế độ jwt. `web/backend/.env.example`: thêm `PRIVY_AUTH_MODE`.
  - `blockchain/scripts/deploy.mjs`: deploy local được ghi đè bản ghi (chain local nằm trong RAM), Fuji vẫn chặn ghi đè. Mới `blockchain/scripts/ensure-local.mjs` + script `local:ensure` trong `blockchain/package.json`: chờ chain, deploy nếu chain mới, báo lỗi nếu chain đã dùng mà thiếu contract.
  - `run.ps1`: nếu backend `.env` có `AVALANCHE_CHAIN_ID=31337` thì tự mở cửa sổ chain (khi cổng 8545 chưa mở) và chạy `local:ensure` trước khi bật backend/frontend.
  - `web/frontend/scripts/avalanche-smoke.mjs`: tự build bản không cấu hình vào thư mục tạm (không phụ thuộc `.env` local), dọn sau khi chạy.
  - Ngoài Git: `web/backend/.env` thêm cấu hình chain local 31337 (khóa ví dev **công khai** của Hardhat #0/#1/#3), `PRIVY_AUTH_MODE=email`, `PAYMENT_SIM_SECRET` ngẫu nhiên; `web/frontend/.env` thêm chain ID/RPC/địa chỉ contract local. Không ghi giá trị bí mật vào hồ sơ.
  - Tài liệu: `README.md` (bước 3: OTP mặc định, JWT khi có gói, chain local), `hackathon/plan.md`, `spec/scope.md` (F-01), `spec/decisions.md`, `spec/progress.md` (T-13 tạm dừng, T-14).
- Kiểm tra: chạy chain local + deploy ra `0x5FbDB2315678afecb367f032d93F642f64180aa3`; manager/accountant của contract khớp ví dev #0/#1; `local:ensure` nhận contract đã có; backend chạy thật: `/api/avalanche/config` → `enabled:true, walletAuth:email`, `/cases` và `/privy/token` khi chưa đăng nhập → 401, IPN chữ ký sai → 401. Sau đó tắt backend/chain. `blockchain npm test` 12 pass/1 skip; `web/backend npm test` 6 pass; frontend build qua; smoke UI PASS (sau khi sửa script).
- Chưa kiểm tra: OTP Privy thật trên trình duyệt (cần Vy nhận mã email), luồng đầy đủ qua giao diện với DB thật, Fuji.
- Còn lại: Vy chạy `run.ps1` và thử; nhận phản hồi BTC (Q-10); T-08 Fuji.
- Git: commit mã J-009 trên main.

## 2026-11-05 17:31:24 +07:00 — J-010 — Bắt buộc email khi khách đăng ký tài khoản (D-016)

- Người thực hiện: Claude theo yêu cầu Vy.
- Trao đổi: Vy hỏi form "Tạo tài khoản mới" có nên bắt buộc email. Claude đề xuất bắt buộc + đúng định dạng + không trùng (OTP và thông báo đi qua email; ví nhúng gắn với email). Vy đồng ý → D-016.
- Đính chính: mốc `23:50:00` ở J-009 và D-015 là ghi sai; giờ máy lúc ghi J-010 là 17:31 cùng ngày, nên J-009 diễn ra trước 17:31 ngày 05/11 (không rõ giờ chính xác).
- File và nội dung:
  - `database/SP_Chung/auth.sql` (`SP_DangKy`): bắt buộc email, kiểm tra định dạng, chặn email đã dùng cho tài khoản khác (mã lỗi 50002 → HTTP 409); khi khách đã có hồ sơ (nhân viên tạo trước) thì email tài khoản ghi đè email cũ.
  - `web/backend/services/auth.service.js`: kiểm tra thiếu/sai định dạng email trước khi gọi SP.
  - `web/frontend/src/pages/TrangChu.jsx`: ô Email có dấu `*`, `required`, `maxLength=100`.
  - Hồ sơ: `spec/decisions.md` (D-016), `spec/scope.md` (F-01), `hackathon/plan.md`, `spec/progress.md` (T-15).
- Không thêm UNIQUE ở bảng `NguoiDung`: DB local đã có 1 email trùng giữa 2 tài khoản; nhiều SP của nhân viên (đặt cọc, khách mới, admin) cập nhật email khách và sẽ lỗi khó hiểu nếu có ràng buộc.
- Kiểm tra: áp `SP_DangKy` vào DB local; thiếu email → 50001, sai định dạng (2 kiểu) → 50001, trùng → 50002, hợp lệ → tạo được (trong transaction đã rollback, không còn dữ liệu thử). `web/backend npm test` pass; frontend build qua. Chưa thử bằng giao diện.
- Còn lại: Vy quyết có sửa 1 email trùng và 8 tài khoản thiếu email trong DB local không (không tự sửa). Các việc của J-009 vẫn giữ nguyên.
