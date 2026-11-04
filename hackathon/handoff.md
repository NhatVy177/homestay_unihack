# Bàn giao cuộc trò chuyện — HomeStayDorm × Avalanche / UniHack 2026

> Cập nhật tiếp nối **2026-11-05 00:38:27 +07:00**: repo làm việc đã chuyển sang `NhatVy177/homestay_unihack`, local `D:\HomeStayDorm`. Đọc [sổ làm việc](../spec/README.md) và [tiến độ hiện tại](../spec/progress.md) trước. Phần bên dưới là bàn giao từ phiên cũ: nền Avalanche ở `homedorm/feature/avalanche-settlement` được nhắc đến **chưa có trong main repo mới tại mốc kiểm tra `40acf39`**. Các đường dẫn `Web/` trong bản cũ tương ứng `web/` ở repo mới. Giữ nguyên phần gốc để tra nguồn trao đổi.

Cập nhật **05/11/2026, giờ Việt Nam**. Tài liệu để chuyển sang một tài khoản GPT khác, bao gồm bối cảnh, lựa chọn đã thống nhất trong plan và trạng thái triển khai thực tế. Đây là ảnh chụp trạng thái tại thời điểm bàn giao; khi làm tiếp phải đọc Git hiện tại và [plan.md](plan.md).

## 1. Người dùng, mục tiêu và cách làm việc

Người dùng tên Vy, GitHub **NhatVy177**, đang chuẩn bị thi **UniHack 2026 theo hình thức solo**. Xưng hô thân mật “t/m” được; giải thích blockchain bằng tiếng Việt dễ hiểu. Vy đã làm nhiều UI/UX, frontend/backend và nghiệp vụ Web2; phần cần được giải thích kỹ hơn là blockchain, Solidity, Avalanche, ví và chữ ký.

Mục tiêu: tận dụng HomeStayDorm đang có, tích hợp Avalanche có ích, tạo bài thi đủ hoàn thiện và dễ demo. Đã cân nhắc ý tưởng mới nhưng lựa chọn hiện hành là tiếp tục HomeStayDorm.

Các yêu cầu làm việc Vy đã nêu:
- Mỗi khi đề xuất/chỉnh ý tưởng, cập nhật cùng một `plan.md` để dễ chia sẻ; tránh sinh nhiều bản plan mâu thuẫn.
- **Sau mỗi đợt thay đổi hoàn tất: kiểm tra phù hợp, commit và push lên GitHub**, rồi báo repo/nhánh/commit. Nếu push lỗi phải nói rõ.
- Tác giả commit là **NhatVy177**, dùng danh tính đã xác minh trong lịch sử repo. Từng bị cấu hình cloud ghi “Dell Laptop”; đã sửa metadata và push lại. Không lặp lại lỗi đó.
- Phân biệt việc đã làm, mới nằm trong kế hoạch và thông tin chưa xác nhận. Không báo dApp đã chạy Fuji khi mới test local.
- Tiếp tục từ code và plan đã có. Vy từng yêu cầu bắt đầu triển khai và đã có nền code; không khởi động lại dự án từ đầu khi chỉ chuyển tài khoản.

## 2. Repo, nhánh và môi trường

- Tài liệu: https://github.com/NhatVy177/unihack-2026
- Plan hiện hành: https://github.com/NhatVy177/unihack-2026/blob/main/plan.md
- Bản bàn giao này: https://github.com/NhatVy177/unihack-2026/blob/main/handoff.md
- Code HomeStayDorm: https://github.com/NhatVy177/homedorm
- **Code Avalanche nằm trên nhánh `feature/avalanche-settlement`**, không phải chỉ đọc `main`:
  https://github.com/NhatVy177/homedorm/tree/feature/avalanche-settlement

Mốc kiểm tra khi lập bàn giao:
- Nền Web2: `d1dd520b4e55377ffe1821b178c4c89dd48db08c`.
- Code Avalanche: `09f8270` — Add Avalanche settlement foundation and evidence verifier.
- Plan đã push trước bản bàn giao: `05ca674` — Consolidate HomeStayDorm plan with embedded wallets and sponsored confirmations.
- Commit code cũ `ecf1c6f` đã đổi thành `09f8270` sau sửa tác giả. Một số lời trao đổi cũ vẫn dùng hash trước khi sửa.

Workspace cũ có `/workspace/unihack-2026` (nhánh local `work`, push `HEAD:main`) và `/workspace/homedorm` (nhánh feature trên). Tài khoản GPT mới không tự có các thư mục, quyền GitHub, file đính kèm hoặc credentials của phiên cũ.

Ban đầu Vy hỏi dùng folder `D:\HomeStayDorm`. Sau đó đã upload bản local mới lên repo `homedorm` và xác nhận bản này chạy tốt, không cần tiếp tục lo về lỗi từ lần chuyển Supabase trước đây. Cloud không tự truy cập được đường dẫn ổ D trên máy Vy.

Từng yêu cầu setup cloud bằng skill `cloud-environment-onboarding:setup`. Phiên cũ dùng môi trường managed cloud có network policy; khi push trong sandbox lỗi kết nối proxy đã dùng cơ chế quyền mạng được môi trường hỗ trợ, giữ nguyên proxy. Không suy ra tài khoản GPT mới có cùng môi trường/quyền.

Vy muốn xem cây thư mục bằng cách bấm vào file. Đã hướng dẫn GitHub nhấn phím `.` hoặc mở:
- https://github.dev/NhatVy177/unihack-2026
- https://github.dev/NhatVy177/homedorm/tree/feature/avalanche-settlement

GitHub.dev hiển thị bản đã push; không phải trạng thái mọi file chưa commit trong cloud.

## 3. Nguồn đã trao đổi

- Tài liệu nền trong repo: `README.md`, `Unihack_Context.md`, `Proposal.md`.
- Hai bản paste ban đầu: mô tả quy trình HomeStayDorm và đề xuất của Claude.
- Nhiều ảnh slide workshop do Vy gửi, cùng ảnh phản hồi người Vy giới thiệu là BTC.
- Website: https://team1vn.xyz/
- Link slide Claude: https://claude.ai/artifact/C9TgqbnLkS7bqc5Ldic66r#slide-8eab752d1830
- Một lần phản biện gồm sáu điểm của Claude và bản paste mới đề xuất sửa plan theo ví nhúng/relayer.

Website/link Claude từng không truy cập được trong môi trường cũ; ảnh do Vy gửi là căn cứ bổ sung. Không nhận là đã xác minh toàn bộ nguồn chỉ vì có URL. Tài khoản mới có thể cần Vy gửi lại ảnh nếu muốn kiểm tra nguyên văn; bản này ghi lại những nội dung đã trao đổi.

## 4. Cuộc thi và phản hồi BTC

Theo Vy nghe tại workshop, có thể lấy một dự án Web2 rồi thêm khoảng 5–10% hoặc nhiều hơn chức năng Avalanche. Không có định nghĩa tỷ lệ, không quy thành phần trăm dòng code; bài cần đủ hoàn thiện.

Ảnh rubric:
- Technical implementation: 25.
- Avalanche integration: 25.
- Creativity & innovation: 15.
- Impact & use case: 15.
- Presentation & pitching: 10.
- UI/UX & demo: 10.

Vy nói vòng 1 quan trọng hai tiêu chí đầu. Ảnh BTC chưa xác nhận cách chia điểm nền cũ/phần mới; câu “chấm toàn bộ sản phẩm” trong bản Claude là thông tin chưa có nguồn trực tiếp trong cuộc trò chuyện.

Slide yêu cầu dApp trên L1 riêng/Fuji/C-Chain mainnet; repo có README; repo public hoặc thêm `tuantqse90` nếu private; slide Canva/Google Slides; video 2–3 phút. Nêu vấn đề trong 30 giây đầu, demo một luồng hoàn chỉnh. Có contract của mình, **verify source trên explorer**. Được dùng AI nhưng phải giải thích được. Giám khảo phải mở được mọi link.

Slide ghi **by 21 November**, nộp tại team1vn.xyz. Mục tiêu nội bộ là 20/11; chưa xác nhận giờ đóng cổng, múi giờ hoặc có cần Builder Hub. Không mặc định được dùng trọn ngày 21/11 làm dự phòng.

Vy đã gửi BTC bốn nhóm câu hỏi: dùng dự án nhóm để thi solo; README/ghi công/sự đồng ý; cách chấm phần cũ/mới; use case on-chain không giữ hay chuyển tiền có phù hợp không. Ảnh phản hồi ngày 04/11:
1. Được nộp solo và có thể nộp nhiều project.
2. README có thể nhờ AI đọc code rồi viết; quan trọng là setup/run rõ và nêu công nghệ.
3. Được mang project cũ, BTC không làm gắt điểm này trong cuộc thi sinh viên.
4. Hướng Web2 đưa sang Web3 một cách hợp lý là phù hợp.

Ảnh sau BTC còn gợi ý:
- Nhúng ví vào tài khoản, tránh bắt người dùng cài MetaMask/Core.
- Có thể tạo token thử; token có thể là point tích lũy, đổi quà/giảm giá.
- Có thể thêm thanh toán MoMo giả lập hoặc API thử.

Đây là **gợi ý**, không phải lệnh làm tất cả và không bảo đảm thêm tính năng nào sẽ tăng điểm. Không cần tiếp tục xin BTC chấp thuận lại solo/dự án cũ, hay xin duyệt từng lựa chọn kỹ thuật.

## 5. Nguồn gốc HomeStayDorm

Stack: **React/Vite + Express + SQL Server**. Chức năng sẵn có bao phủ đăng ký thuê, đặt cọc, hợp đồng, nhận phòng/bàn giao, hóa đơn, trả phòng và đối soát cọc.

Vy là leader, trực tiếp làm gần như toàn bộ nền tảng UI/UX, frontend/backend và nghiệp vụ từ trước cuộc thi; một số phần có đóng góp của thành viên nhóm. Không mô tả Vy chỉ sửa vài phần, cũng không khẳng định toàn bộ code là của một mình Vy.

BTC cho dùng nền cũ và thi solo. Chưa có xác nhận trong chat rằng tất cả thành viên đã đồng ý cho sử dụng phần họ đóng góp. Giữ việc ghi công và thống nhất phạm vi sử dụng/chia sẻ repo với họ. Đã soạn mẫu hỏi trong plan, không tự gửi tin nhắn cho BTC hay thành viên.

Phương án tách contract/Verify thành dApp độc lập với dữ liệu giả chỉ là dự phòng nếu vướng quyền dùng một phần code, không phải nhánh đang triển khai song song.

## 6. Use case Avalanche hiện hành

**Avalanche gắn chủ yếu vào xác nhận bàn giao lúc nhận phòng và đối soát cọc lúc trả phòng.** Nó không thu/giữ cọc và không tự chuyển tiền hoàn.

Mô tả dễ hiểu: app có thêm lịch sử xác nhận chung để chứng minh ví nào đã đồng ý phiên bản tài liệu nào, giao dịch được ghi nhận khi nào, và bản cung cấp lại có khớp bản đã xác nhận hay không.

Luồng:
1. Quản lý lập biên bản ban đầu, chính sách và số cọc thực tế còn giữ; khách xem, lưu bản sao và xác nhận.
2. Khi trả phòng, kế toán lập bảng đối soát v1, có các khoản trừ và số tiền hoàn/thu thêm.
3. Khách phản đối hoặc xác nhận đúng phiên bản. Nếu sửa thì tạo v2, giữ v1 trong lịch sử; không được ghi đè bản đã chấp nhận.
4. Khách tự kiểm tra file bằng chứng với contract; nội dung thay đổi sẽ không khớp.
5. Thanh toán tiền tiếp tục qua Web2/kênh hiện có.

Một chi nhánh, ba vai trò **quản lý – kế toán – khách**. Quản lý và kế toán cùng thuộc phía vận hành.

Chain không biết hiện trạng thật, ai làm hỏng phòng, chuyển khoản đã về hay người cầm ví có tư cách pháp lý gì. Nó không phân xử tranh chấp hoặc thay hợp đồng thuê. Không kết luận chữ ký on-chain chắc chắn có/không có giá trị pháp lý khi chưa được đánh giá.

Giá trị so với database: lịch sử chung mà bên vận hành khó âm thầm sửa và khách có thể tự đối chiếu. Database audit, PDF có chữ ký và timestamp bên thứ ba cũng giải quyết được một phần. Không nói chain tuyệt đối bất biến hay app có tính năng chỉ Avalanche mới làm được. Đo phí/thời gian Fuji của chính demo trước khi đưa số lên slide.

## 7. Các quyết định kỹ thuật mới nhất

**Ví trong app + app trả gas là mục tiêu bản thi**, thay cho lựa chọn cũ là ví thử trực tiếp trước và gasless để sau:
- Ưu tiên thử SDK ví nhúng hỗ trợ Fuji và EIP-712, rõ mô hình giữ/khôi phục khóa. Chưa chọn SDK/nhà cung cấp.
- Không chốt tự dựng ví mã hóa bằng PIN ngắn như Claude đề xuất: phải giải quyết bảo vệ khóa, backup và mất dữ liệu trình duyệt.
- Liên kết ví với tài khoản vẫn cần challenge ký và phiên đăng nhập hợp lệ. Không tự coi ví có trong DB là thuộc khách.
- Khách chủ động xác nhận từng bản. Khóa khách không gửi cho backend ứng dụng. UI đơn giản nhưng không giấu việc người dùng đang đồng ý nội dung/số tiền nào.
- Backend làm relayer nhận chữ ký rồi gửi giao dịch/trả gas; không ký thay khách.
- Contract kiểm tra đúng signer, loại hành động, hồ sơ, phiên bản/hash, nonce, hạn dùng; ràng buộc domain với chain ID và contract.
- Chọn kiểm tra EOA hoặc ERC-1271 theo loại ví thực tế; `msg.sender` của relayer không phải khách.
- UI/SQL chỉ xác nhận thành công khi receipt và event hợp lệ; xử lý gửi lặp, timeout, lỗi relayer và trường hợp chain thành công nhưng SQL chưa đồng bộ.

**Bằng chứng là phần bắt buộc ngay khi ký:**
- Trình duyệt tính hash từ cùng snapshot đang hiển thị. Không đưa một hash backend gửi mà chưa đối chiếu cho khách ký.
- Cho lưu bản sao trước/ngay lúc xác nhận; sau receipt bổ sung thông tin giao dịch.
- Bundle có nội dung, salt, chain ID, contract, mã hồ sơ, phiên bản và commitment; kèm tài liệu gốc/manifest hash nếu có file, không chỉ URL có thể hết hạn.
- Khách Verify bằng file đã giữ + RPC, không cần xin lại tài liệu từ server quản lý.
- Việc trình duyệt phát lệnh download không bảo đảm người dùng giữ file lâu dài.
- CCCD, địa chỉ, tài khoản ngân hàng, ảnh, nội dung riêng tư ở ngoài chain; chain có ID, ví, hash, số tiền tối thiểu, phiên bản/trạng thái. Demo dùng dữ liệu giả.

**Thu gọn scope:**
- Bỏ giao dịch on-chain riêng cho báo trả phòng/thời điểm báo trước trong MVP.
- Bỏ khai báo đã chuyển tiền/xác nhận đã nhận tiền khỏi scope on-chain MVP.
- MoMo giả lập/sandbox chỉ là phần thêm sau khi luồng chính đạt nghiệm thu. Simulator tự dựng phải ghi là mô phỏng, không gọi là API MoMo thật; callback phải kiểm tra tiền/trạng thái và chống trùng.
- Token point chưa nằm trong bản thi dự kiến. Nếu làm sau, point là ưu đãi riêng, không thay tiền cọc phải hoàn.
- Không thêm escrow, NFT, L1 riêng hay AI phân xử vào scope hiện tại.

## 8. Chính sách cọc: thông tin đã đọc và điều chưa chốt

Nguồn code: `Web/backend/services/doiSoatCalculator.service.js`.
- Cọc chưa ký hợp đồng: tỷ lệ hoàn 80%.
- Hợp đồng hết hạn: 100%.
- Trả sớm, ở dưới 6 tháng: 50%; từ 6 tháng: 70%.
- Tháng tính bằng `calculateStayMonths`, không tự quy thành 180 ngày.
- Sau tỷ lệ, tiếp tục trừ nợ thuê/dịch vụ/sửa chữa/phạt.

Đây là logic quan sát từ code; mô tả cũ có nhắc `QuyDinhHoanCoc` theo thời gian báo trước. **Cần chốt quy tắc thực tế với Vy**, không tự kết hợp hai cách.

Adapter hiện lấy `tienCocBanDau`; phải kiểm tra đó có phải cọc thực tế còn giữ sau cấn trừ hay không. Không đoán cọc bằng `monthlyRent × 2 × beds` từ plan Claude cũ.

Contract hiện tự tính `refund=max(depositHeld-deductions,0)` và `topUp=max(deductions-depositHeld,0)`. Adapter đưa phần cọc không đủ điều kiện hoàn vào khoản trừ chính sách. Contract **chưa tự thực thi tỷ lệ 80/50/70/100**; policy hash chỉ ràng buộc tài liệu, không tự chạy luật trong tài liệu. Tránh chép toàn bộ logic sang Solidity làm hai nơi lệch nhau. Demo đầu tiên dùng hợp đồng đủ hạn/tỷ lệ 100%.

## 9. Code thực tế đã có, chưa có và cách kiểm tra

Các file quan trọng trên nhánh feature:
- `blockchain/contracts/DormSettlement.sol`.
- `blockchain/src/homedorm-adapter.js`.
- `blockchain/src/evidence.js`, `blockchain/src/abi.js`.
- `blockchain/scripts/`: compile, node local, deploy.
- `blockchain/test/`: contract và adapter.
- `Web/frontend/src/pages/avalanche/AvalancheVerifyPage.jsx` và CSS.
- `Web/backend/services/doiSoatCalculator.service.js`: nghiệp vụ cũ.
- `README.md` và `blockchain/README.md`: cách chạy/trạng thái.

Route Verify: `/kiem-chung-avalanche`. Contract address đáng tin cậy lấy từ cấu hình deployment, không tin riêng địa chỉ trong file người dùng upload.

Theo kết quả phiên trước: **4 test contract + 3 test adapter đã qua**, frontend build qua, deploy EVM local thành công. Đây là kết quả trước khi sửa scope, không phải kiểm thử mới cho ví/relayer chưa viết.

Lệnh theo README (Node 24):
```sh
cd blockchain
npm ci
npm test
# Hai terminal nếu cần node/deploy local:
npm run chain
npm run deploy:local

# Build giao diện:
cd ../Web/frontend
npm ci
npm run build
```

**Rất quan trọng: plan đi trước code.** Code hiện còn dùng `msg.sender`, `requestCheckout`, `reportPayment`, `confirmPayment` và bước đóng hồ sơ. Chưa chỉnh theo scope mới.

Chưa có: ví nhúng, EIP-712 cho các hành động, relayer, liên kết ví–tài khoản, nút ký nối SQL, xuất bằng chứng ngay lúc ký, Fuji deployment/source verification, kiểm thử end-to-end HomeStayDorm với SQL Server. Chưa có SDK đã chọn hay địa chỉ contract Fuji.

Fuji chain ID `43113`, RPC mặc định `https://api.avax-test.network/ext/bc/C/rpc`. Script Fuji cần ví thử có test AVAX và địa chỉ quản lý/kế toán. Frontend dùng `VITE_AVALANCHE_CHAIN_ID`, `VITE_AVALANCHE_CONTRACT_ADDRESS`, tùy chọn RPC. **Không đưa private key vào Git, biến VITE hoặc chat**; dùng nơi lưu bí mật của môi trường.

README code còn mô tả trạng thái có bước thanh toán vì code chưa thay đổi; cần cập nhật cùng lần triển khai tiếp theo, không hiểu đó là quyết định đảo scope.

## 10. Senpai và ý kiến Claude

Senpai: https://github.com/tuantqse90/senpai — repo tham khảo do người bên BTC dùng giới thiệu workshop, không phải bài bắt chước hay tiêu chí chấm. Đã đọc bản `cde33571a348c26bae614f11aa31b32487cbc285`; chưa chạy thử/kiểm chứng deployment.
- Sản phẩm phỏng vấn tiếng Anh với AI/giọng nói.
- Dùng token MIU thử và EIP-3009/HTTP 402 để trả phí phiên; relayer trả gas.
- HomeStayDorm học cách dùng chữ ký/relayer, không cần bê token, x402 hay logic thanh toán vào.
- Có MIT License; nếu sử dụng phần mã tương ứng phải giữ thông báo giấy phép/bản quyền.

Claude phản biện lần đầu: cắt scope, xuất bằng chứng ngay lúc ký, cân nhắc gasless, kiểm tra tính nhất quán trong contract, giải thích vì sao cần chain, giữ phương án dự phòng. Đã đồng ý phần lớn nhưng sửa nhận định “contract chỉ lưu chữ ký”: contract hiện đã tính số dư, còn tỷ lệ chưa tự thi hành.

Bản Claude mới đề xuất ví tự tạo trong browser bằng PIN, EIP-712 + relayer ngay MVP, MoMo mô phỏng trong scope, bỏ token. Plan hiện hành:
- Nhận hướng ví trong app + trả gas và thu gọn bước on-chain.
- Ưu tiên SDK có cách giữ/khôi phục khóa rõ, không mặc định ví PIN tự làm.
- Bằng chứng phải tính từ nội dung trình duyệt hiển thị.
- MoMo là tùy chọn, không bắt buộc.
- Chưa làm token.
- Không biến nhận định của Claude về cách chấm hoặc lịch workshop thành xác nhận của BTC.

## 11. Demo và thứ tự triển khai tiếp

Demo dự kiến:
1. Hợp đồng đủ hạn, cọc còn giữ 3.000.000 VND giả lập; biên bản ban đầu ghi nệm đã rách.
2. Đối soát v1 trừ 500.000 VND khoản khác + 400.000 VND vết rách.
3. Khách phản đối bằng biên bản cũ; người quản lý xem xét, kế toán tạo v2 bỏ 400.000 VND.
4. Khách xác nhận số hoàn 2.500.000 VND và giữ bằng chứng.
5. Verify file đúng; sửa một số để thấy không khớp; mở explorer và source contract.
6. Nói rõ chain không tự kết luận vết rách hoặc chuyển tiền. Có thể chuẩn bị lịch sử trước nhưng phải trình bày trung thực.

Lịch nội bộ đề xuất trong plan, chưa phải lịch thực hiện đã xong:
- 04–06/11: chốt policy/nguồn cọc; thử ví/khôi phục, typed-data, relayer; kiểm tra RPC/gas Fuji.
- 07–10/11: thu gọn contract, thêm chữ ký và test, deploy/verify Fuji; một luồng nhỏ có xuất bằng chứng.
- 11–14/11: nối UI ba vai trò, SQL, bộ bằng chứng/Verify và phục hồi đồng bộ.
- 15–17/11: end-to-end và hoàn thiện UX; chỉ thêm simulator nếu luồng chính ổn.
- 18–19/11: README, chạy từ đầu, slide/video, kiểm tra link và số đo thực tế.
- 20/11: mục tiêu nộp nội bộ, phụ thuộc giờ đóng cổng chính thức.

**Việc bắt đầu hợp lý cho GPT mới:** đọc plan và nhánh feature, xác minh trạng thái repo; tiếp tục thử một luồng nhỏ ví nhúng → ký → relayer → contract → receipt trước khi làm nhiều màn hình. Chốt với Vy nguồn cọc, chính sách còn mâu thuẫn và kết nối SQL/dữ liệu mẫu khi cần. Theo dõi nguồn AVAX thử và tài khoản cấu hình SDK. Sau mỗi đợt hoàn tất, cập nhật plan và push đúng repo/nhánh.

Những điều cần tránh: hỏi lại BTC điều đã trả lời; khởi động ý tưởng mới không cần thiết; nhận code đã deploy Fuji; thêm token cho đủ Web3; coi điểm thưởng là tiền hoàn cọc; tự gán đóng góp nhóm; chép số liệu Senpai thành số liệu HomeStayDorm; tự nhận được quyền truy cập repo/máy cũ khi chuyển tài khoản.
