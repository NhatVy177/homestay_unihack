# UniHack Context — Kiến thức và cách làm

Sổ tay làm việc cho Vy: học blockchain/Avalanche từ đầu, xem tài liệu và repo tham khảo, phương pháp suy nghĩ, và kế hoạch cá nhân. Thông tin cuộc thi, nội quy, thời gian và nộp bài xem [README.md](README.md); toàn bộ phương án sản phẩm và ý tưởng xem [Proposal.md](Proposal.md).

Tổng hợp ngày 31/10/2026; công cụ, mạng và lịch có thể thay đổi. Đề xuất và ước lượng là giả định, cần kiểm chứng.

## 1. Blockchain và Avalanche cho người chưa biết gì

### 1.1. Từ một ví dụ quen thuộc (ý tưởng minh họa trong Proposal)

Giả sử CLB có ba bên: người tổ chức cấp chứng nhận đóng góp, sinh viên nhận và công ty muốn kiểm tra. Hiện nay có thể gửi PDF qua email; bên thứ ba phải hỏi tổ chức xem PDF còn hợp lệ không. Một contract công khai có thể lưu **mã cam kết của nội dung, địa chỉ tổ chức cấp, trạng thái đã chấp nhận/thu hồi**. Người kiểm tra nhận bản minh chứng riêng và đối chiếu với trạng thái trên chain.

Blockchain là sổ trạng thái dùng chung giữa nhiều máy. Các máy tuân theo quy tắc đồng thuận để chấp nhận giao dịch. Sau khi được xác nhận, lịch sử rất khó thay đổi tùy tiện; vẫn phải hiểu rằng contract có thể có lỗi, giao thức có thể thay đổi, và dữ liệu người đưa vào có thể sai. Chain chứng minh **một địa chỉ đã thực hiện hành động**, không tự chứng minh địa chỉ đó thật sự là CLB hay nội dung đóng góp đúng.

| Từ | Giải thích dễ hiểu | Áp dụng vào ví dụ |
|---|---|---|
| Wallet/ví | Công cụ giữ khóa và ký; tài sản/trạng thái nằm trên chain | Tổ chức và sinh viên dùng ví khác nhau |
| Địa chỉ | Định danh công khai dạng `0x...`; không tự gắn với danh tính thật | Địa chỉ ví cấp và nhận chứng nhận |
| Private key/seed phrase | Bí mật cho phép điều khiển ví; ai biết có thể điều khiển tài sản | Lưu ngoại tuyến an toàn; không gửi cho ai, không commit hoặc nhập vào web lạ |
| Transaction/tx | Yêu cầu được ký để thay đổi trạng thái; có mã tra cứu | Tổ chức gửi lệnh cấp, sinh viên gửi lệnh nhận |
| Gas | Phí thực thi giao dịch; trên Fuji dùng test AVAX | Giao dịch ghi trạng thái cần gas; đọc thông thường qua RPC không cần người dùng ký hoặc trả gas |
| Smart contract | Chương trình chạy theo quy tắc trên chain | Chỉ issuer được cấp/thu hồi; người nhận được chấp nhận |
| Solidity/EVM | Ngôn ngữ phổ biến / môi trường thực thi hợp đồng tương thích Ethereum | Viết contract Solidity, deploy lên C-Chain |
| dApp | Ứng dụng có phần dùng contract/blockchain | Web React + ví + contract |
| RPC | Cổng phần mềm dùng để đọc chain và gửi giao dịch | Ứng dụng dùng RPC Fuji |
| ABI | Bản mô tả hàm và sự kiện để ứng dụng biết cách gọi contract | Frontend dùng ABI cùng địa chỉ contract |
| Event | Nhật ký contract phát ra khi có hành động | Ghi nhận `Issued`, `Accepted`, `Revoked` để app hoặc explorer theo dõi |
| Explorer | Website tra contract, giao dịch và trạng thái | Giám khảo mở tx thay vì chỉ xem ảnh |
| Hash | Dấu vân tay tính từ dữ liệu: sửa nội dung thường làm hash đổi | Lưu hash của nội dung đã chuẩn hóa, không đưa PDF lên chain |
| Testnet / mainnet | Mạng thử / mạng thật | Fuji dùng AVAX thử không có giá trị thực; mainnet dùng AVAX thật |
| NFT / ERC-20 | NFT là chuẩn token nhận diện từng loại/tài sản, ERC-20 là token có thể thay thế | Chỉ dùng nếu giải thích được vì sao cần; chứng nhận MVP không bắt buộc là NFT |

**Đọc và ghi khác nhau:** mở trạng thái `accepted` là đọc; bấm chấp nhận làm thay đổi trạng thái là ghi, cần ví ký, gas và chờ transaction receipt. Bấm nút không đồng nghĩa giao dịch thành công: phải chờ xác nhận rồi kiểm tra receipt và đọc lại contract.

**Hash không phải mã hóa:** không thể coi hash là cách giấu tên an toàn. Nếu nội dung có thể đoán, người khác thử băm để tìm ra. Với demo dùng dữ liệu giả, tạo salt ngẫu nhiên đủ mạnh cho từng bản, chia sẻ dữ liệu + salt ngoài chain chỉ cho người cần kiểm tra; không công bố salt cùng thông tin nhạy cảm. Hash + salt vẫn không giải quyết mọi rủi ro liên kết ví, quyền truy cập hay việc dữ liệu bị chụp lại. Không ghi PII hoặc tệp lên chain. Mất nội dung/salt thì khó đối chiếu; chỉnh nội dung sẽ có hash khác.

### 1.2. Avalanche và lựa chọn Fuji

Avalanche là hệ sinh thái blockchain có C-Chain tương thích EVM và các Avalanche L1 có thể thiết lập riêng. C-Chain cho phép triển khai contract Solidity bằng các công cụ EVM phổ biến. Fuji là môi trường test; L1 riêng có cấu hình/vận hành riêng và có thể giao tiếp liên chuỗi qua ICM khi cần. Một app Fuji C-Chain vẫn là build trên Avalanche theo FAQ. [Giới thiệu Builder Hub](https://build.avax.network/), [FAQ cuộc thi](https://team1vn.xyz/#faq)

| Cấu hình | Fuji C-Chain |
|---|---|
| Chain ID | `43113` |
| RPC | `https://api.avax-test.network/ext/bc/C/rpc` |
| Tiền gas | AVAX thử, xin từ faucet |
| Explorer | [Avalanche Explorer Fuji C-Chain](https://build.avax.network/explorer/fuji/c-chain) |
| Faucet | [Avalanche Console](https://build.avax.network/console) hoặc [faucet trang cuộc thi](https://team1vn.xyz/faucet.html) |

[Nguồn network chính thức](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/02-network-setup). Chú ý `43114` là mainnet, không phải Fuji. Nếu faucet cần đăng nhập/giới hạn, đọc hướng dẫn hiện tại hoặc hỏi mentor. Địa chỉ C-Chain thường bắt đầu `0x`; test AVAX và AVAX thật ở các mạng khác nhau.

**Tại sao Avalanche cho dự án đề xuất?** BTC cho phép Fuji, EVM và Solidity có tài liệu/công cụ phong phú; contract và transaction có thể kiểm tra công khai; một mạng chung giúp nhiều bên đọc cùng trạng thái. Đây là lý do phù hợp cho demo, chưa chứng minh Avalanche là chain duy nhất hay tốt nhất cho mọi bài toán.

**Tại sao cần blockchain?** Nếu các tổ chức cấp và bên xác minh muốn dùng chung một sổ xác nhận, contract là nơi cùng kiểm tra trạng thái và lịch sử mà không phụ thuộc mỗi giao diện. Nhưng vẫn phải tin tổ chức cấp về nội dung, tin địa chỉ đó thuộc tổ chức, và website/RPC có thể lỗi. Một cơ sở dữ liệu có API và chữ ký số là phương án thay thế hợp lý; cần kiểm tra nhu cầu liên tổ chức thật trước khi kết luận blockchain có giá trị bổ sung.

### 1.3. Cài công cụ và làm thí nghiệm đầu tiên

| Công cụ | Dùng làm gì | Chọn thế nào |
|---|---|---|
| Git + GitHub | Lưu phiên bản và nộp mã | Tạo repo; hiểu commit/push và `.gitignore` |
| Node.js LTS + npm | Chạy web và công cụ JS | Cài Node LTS từ trang chính thức; kiểm tra `node -v`, `npm -v` |
| VS Code | Viết mã | Extensions Solidity tùy chọn |
| Core hoặc MetaMask | Tạo ví và ký transaction | Dùng ví thử riêng, bật Fuji; không import ví có tiền thật |
| Remix IDE | Viết/compile/deploy contract nhỏ trên trình duyệt | [Remix](https://remix.ethereum.org/); chọn đúng Injected Provider và kiểm tra Fuji trên ví |
| Solidity + Hardhat | Viết, test, deploy contract trong repo | Đọc hướng dẫn phiên bản đang dùng; có thể thay bằng Foundry/Codespaces nếu quen |
| React + Vite, TypeScript | Giao diện và logic app | React/TS nếu quen; có thể dùng JS để giảm khối lượng |
| wagmi + viem | Kết nối ví, đọc/gọi contract | Dựa theo [starter kết nối ví](https://team1vn.xyz/demos.html) và docs phiên bản cài |
| Explorer | Xác minh giao dịch, contract | Ghi link Fuji trong README bài thi |

Không cần triển khai server, database, token, NFT, AI, L1 riêng hay thanh toán chỉ để được coi là “đủ Web3”. Chỉ thêm khi một yêu cầu sản phẩm cần nó.

**Bài tập 90–120 phút, đầu ra phải nhìn thấy:**

1. Tạo ví thử mới bằng Core hoặc MetaMask từ nguồn chính thức; ghi seed phrase offline và không chia sẻ. Bật/chọn Fuji, đối chiếu chain ID `43113`.
2. Lấy test AVAX từ faucet bằng địa chỉ `0x...`. Xem số dư testnet và mở địa chỉ trên Fuji Explorer.
3. Mở [Remix](https://remix.ethereum.org/), tạo file `Hello.sol`, dán contract học tập bên dưới và compile bằng compiler phù hợp với `pragma`.
4. Trong Deploy & Run, thử trước với Remix VM; sau đó chọn **Injected Provider**, kết nối ví Fuji và xác nhận deploy. Lưu địa chỉ contract và tx hash. Tên nút có thể thay đổi theo phiên bản Remix.
5. Gọi `setMessage`, xác nhận giao dịch, chờ receipt; gọi `message` để đọc giá trị; mở tx trên explorer. Nếu sai mạng hoặc không có gas, sửa và thử lại. Đây là bài học, không phải contract sản phẩm.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HelloAvalanche {
    string public message = "Hello Fuji";

    function setMessage(string calldata next) external {
        message = next;
    }
}
```

Ở ví dụ này **ai cũng có thể đổi message**: đó là chủ ý cho bài học. Không lưu dữ liệu cá nhân; triển khai thật trên Fuji sẽ công khai dữ liệu đã ghi. Khi làm sản phẩm cần quy tắc phân quyền. Đọc thêm [hướng dẫn Remix](https://remix-ide.readthedocs.io/en/latest/create_deploy.html), [Avalanche Academy Solidity](https://build.avax.network/academy/blockchain/solidity-foundry/03-smart-contracts/04-create-new-smart-contract) và [network Fuji](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/02-network-setup).

## 2. Nhìn ý tưởng mẫu của BTC và các repo tham khảo

### 2.1. 20 topic của BTC — để học cách đặt vấn đề

BTC chia 20 topic thành bốn nhóm; ID thiếu 15 trong danh sách nguồn, không phải thiếu một topic ở đây. Điểm khó của BTC dựa trên giả định **hai người làm một ngày đến ba người có kinh nghiệm trong 48 giờ**, nên không dùng như ước lượng cho người mới làm solo. [Danh sách đầy đủ và yêu cầu từng topic](https://team1vn.xyz/#ideas), [dữ liệu chi tiết](https://team1vn.xyz/topics.json).

| Nhóm | Đề tài mẫu và trọng tâm |
|---|---|
| Social finance | 1 Hội on-chain; 2 chia tiền nhóm; 3 đặt cọc chống vắng sự kiện; 4 tiền tiêu theo lịch; 5 từ thiện minh bạch; 6 quadratic funding CLB; 7 tiết kiệm theo streak; 8 trả tiền theo thời gian/milestone; 9 vé NFT giới hạn giá bán lại |
| Game on L1 | 10 YieldGO, đi bộ/map và trạng thái DeFi; 11 DeFi Farm, trồng cây tượng trưng cho gửi/nhận yield |
| AI agents & security | 12 agent quản lý treasury qua policy; 13 DeFi Copilot; 14 Tx Guardian giải thích giao dịch; 21 PayrollFloat quản lý dòng tiền |
| Agent economy / x402 | 16 StockAgent Launchpad; 17 hạ tầng trả tiền theo request; 18 ActorBazaar; 19 TalkMeter tính theo phút; 20 AskPay có kiểm chứng trích dẫn |

Học từ cách BTC trình bày: **người dùng → vấn đề → phần on-chain → chức năng MVP → demo → công cụ → giới hạn**. Các mô tả thị trường trong topic là đề xuất của BTC, chưa tự động là số liệu đã kiểm chứng cho sản phẩm của mình. Topic tài chính, AI agent, nhiều L1 hoặc x402 thường cần nhiều quy tắc và tích hợp: với solo mới học, cân nhắc kỹ thay vì bắt buộc chọn.

Trang còn có [Starter code](https://team1vn.xyz/demos.html). Thứ tự nên học: **Your first smart contract** → **Connect a wallet** → **Read and write a contract from the UI**. Đọc license và kiểm tra code trước khi dùng; khi nộp ghi rõ phần starter và phần tự làm.

### 2.2. Ba repo DevRel gửi — repo có gì, học gì?

Đây là nhận xét dựa trên README, cấu trúc và các file contract/package đã đọc ngày 31/10; **chưa chạy và chưa audit**. Chưa xác minh quan hệ của chúng với cuộc thi năm ngoái.

| Repo | Có gì | Học được gì và giới hạn |
|---|---|---|
| [UnderGround](https://github.com/bhaveshpatil093/UnderGround) | README mô tả game đua xe, multiplayer, xe và leaderboard; repo có React, ethers, web3, Firebase, `src/contract-abi.js`, cấu hình Tailwind. Cây file `main` đã xem không có file `.sol` | Xem cách giao diện gọi ABI và tổ chức app, cách kể câu chuyện game. README là mô tả dự án, **chưa xác minh tính năng hay quyền sở hữu xe chạy được**; không có source Solidity trong cây file chính để tự kiểm tra logic contract. Repo ghi MIT |
| [MoveAndWhap](https://github.com/CodeLinkIO/MoveAndWhap) | Demo nhiều người di chuyển/đánh trên bàn; README nói mọi nước đi on-chain. Có `contracts/MAW.sol`, `join`, `move`, `whap`, events; frontend React/PixiJS, ethers, Hardhat, backend theo dõi event/PouchDB | Học state machine, kiểm tra luật ở contract và event → UI; cần cân nhắc mỗi hành động on-chain cần giao dịch, phí và UX. Repo ghi MIT; hướng dẫn Node/cách cấu hình cũ cần kiểm tra trước khi chạy |
| [Avax Gods](https://github.com/adrianhajdin/project_web3_battle_game) | Card game Web3, các thư mục `client`, `client-starter`, `web3`; `web3/contracts/AvaxGods.sol` dùng ERC-1155, quản lý player, game token, battle và events | Học luồng ví → contract → sự kiện → giao diện, cấu trúc game state. Contract dùng timestamp/block data để tạo số ngẫu nhiên: không phải nguồn ngẫu nhiên an toàn, và luật UniHack cấm thưởng ngẫu nhiên. README có hướng dẫn cũ liên quan seed/private key: **không làm theo bước sao chép seed phrase lên website**, dùng ví thử và tài liệu hiện tại. Chưa thấy file license ở gốc đã xem: kiểm tra quyền sử dụng trước khi sao chép |

Chỉ vì repo có ABI, tên Avalanche hoặc README nói có tính năng không chứng minh contract đã deploy đúng, hoạt động, an toàn hay tuân thủ rules hiện tại. Xem và học có chọn lọc; nếu dùng mã/asset phải tuân thủ license và ghi công. Game là một hướng hợp lệ nhưng không cần làm game vì các repo được gợi ý cho người hỏi về game.

## 3. Cách nghĩ, học từ cách làm Netcompany

Ở `D:\Nam4\Netcompany\team-trix-icc2026`, các proposal của Vy/Trix phân biệt **dữ kiện / nguồn / giả định**, so sánh lựa chọn, xác định người dùng, phạm vi MVP, cách kiểm chứng và giới hạn. Dùng lại cách suy nghĩ này, không bê bài toán Netcompany hay quy định cuộc thi đó sang UniHack.

Với mỗi ý tưởng, điền lần lượt:

1. **Ai?** Một người cụ thể đang gặp khó khăn trong tình huống nào, hiện dùng gì?
2. **Đau ở đâu?** Điều gì khó kiểm tra, thiếu tin cậy hoặc phải phối hợp qua nhiều bên? Nếu mới suy đoán, gắn `[GĐ]`.
3. **Kết quả mong muốn?** Một hành động trước/sau, ai hưởng lợi, cách đo trong demo. Không bịa số liệu.
4. **Giải pháp thường?** Spreadsheet/database + chữ ký số có giải được không? Chi phí/tin cậy khác gì?
5. **Tại sao on-chain và Avalanche?** Ghi chính xác trạng thái/quy tắc nào do contract bảo vệ, ai ký, người khác kiểm tra được gì. Nếu bỏ chain mà lợi ích quan trọng vẫn y hệt, xem lại.
6. **Demo nhỏ nhất?** Hai ví, 1–2 vai trò, một luồng thành công và một tình huống từ chối/thu hồi. Test AVAX, dữ liệu giả.
7. **Giới hạn?** Đâu là thông tin chain không thể xác thực; trường hợp gian lận, riêng tư, mất khóa, dữ liệu ngoài đời; phạm vi 1 người làm được.

**Cách kiểm chứng trong 1 ngày:** ghi 3 giả thuyết về người dùng, hỏi 2–3 sinh viên/ban CLB nếu có thể: “Lần gần nhất bạn xác nhận đóng góp là khi nào? Bạn kiểm tra bằng cách nào? Khó nhất là gì? Ai cần xem?” Tránh hỏi dẫn dắt “bạn có thích blockchain không?”. Ghi đúng số người/phản hồi, cả ý kiến trái chiều; chưa phỏng vấn thì ghi chưa kiểm chứng. Dùng một bản phác 3 màn hình để hỏi xem người ta hiểu và có muốn dùng không.

## 4. Phân công cho Vy và kế hoạch theo ngày

Các vai trò sau **đều do Vy làm**, chia theo đầu ra để tránh làm đồng thời quá nhiều. Ước lượng là kế hoạch giả định ~2–4 giờ/ngày, cần chỉnh theo thời gian thật và lịch cuộc thi Netcompany có thể trùng; không phải cam kết tiến độ.

| Vai trò Vy đảm nhiệm | Công việc | Đầu ra |
|---|---|---|
| Product/research | Xác minh quy định, tạo ý tưởng, trao đổi người dùng, chốt phạm vi | Bảng giả định, 1 câu pitch, 1 luồng MVP |
| Blockchain developer | Học ví/Solidity, viết contract, test và deploy | Test + địa chỉ Fuji + tx |
| Frontend developer | Kết nối ví, đọc/ghi contract, hiển thị trạng thái và lỗi | 3 màn hình/3 tab demo chạy |
| QA/DevOps | Kiểm tra 2 ví, sai quyền, link, deploy web | Checklist chạy lại, ứng dụng và repo sạch |
| Presenter | Slides, video 2–3 phút, tập hỏi đáp | Link truy cập được, demo có dự phòng |

| Mốc đề xuất | Việc chính | Điều kiện để qua mốc |
|---|---|---|
| 31/10–01/11 | Đăng ký, hỏi BTC về mâu thuẫn, đọc rules; làm bài ví + Hello | Có team solo/profile, ví Fuji và một tx; ghi câu hỏi chưa rõ |
| 02–04/11 | Tham gia workshop nếu phù hợp; viết 6 ý tưởng, nói chuyện 2–3 người nếu có thể, chọn A/B | Viết problem, stakeholder, vai trò chain, phạm vi; đánh dấu giả định |
| 05–07/11 | Học Solidity: state, mapping, modifier/require, event; vẽ state machine | Tự giải thích ai được gọi hàm nào và vì sao |
| 08–10/11 | Viết contract + test các ca sai quyền và trạng thái | Local test pass; deploy Fuji và xem tx |
| 11–13/11 | Workshop, làm giao diện đọc + kết nối ví, issue/accept | Một luồng A → B chạy trên Fuji |
| 14–16/11 | Revoke, verify hash, hiển thị lỗi và mạng; cập nhật tests | Luồng demo đầy đủ, hành vi sai quyền bị chặn |
| 17–18/11 | Hoàn thiện README repo, publish web nếu kịp, chuẩn bị slides/video | Người khác làm theo được; link contract và repo chính xác |
| 19/11 | Office hours; chạy lại luồng, sửa lỗi quan trọng | Có phiên bản dự phòng, kiểm tra link ẩn danh |
| **20/11** | Quay video, rà checklist, **submit sớm**; nhờ mentor xem nếu kịp | Trạng thái Submitted, bằng chứng nộp |
| 21/11 | Buffer sửa lỗi/link và kiểm tra lại trước **23:59** | Không để draft; theo dõi BTC, sửa nếu cần trước hạn |
| 23–30/11 | Theo dõi top 10; nếu vào final luyện pitch/demo/Q&A và xác nhận địa điểm | Trình bày đúng những gì đã build |

**Cắt phạm vi khi chậm:** ngày 10 chưa deploy được → bỏ UI phụ, theo starter contract; ngày 14 chưa xong issue/accept → bỏ tính năng ngoài MVP, tập trung contract + trang đơn giản; ngày 18 vẫn lỗi → nộp luồng thật ổn định với giới hạn công khai, không giả vờ tính năng đã chạy. Dành 19–21/11 cho hồ sơ; đừng thay ý tưởng vào phút chót trừ khi không thể chạy hoặc vi phạm quy định.

## 5. Danh sách nguồn chính

- [Trang chính UniHack, FAQ, timeline và Ideas](https://team1vn.xyz/), [quy tắc và chi tiết topic](https://team1vn.xyz/topics.json), [starter code](https://team1vn.xyz/demos.html), [Builder Pass](https://team1vn.xyz/builderpass.html).
- [Avalanche Builder Hub — trang sự kiện](https://build.avax.network/events/596c0b2d-63aa-4cf0-a0ad-a7e34ddbfdc0), [form đăng ký có lựa chọn Solo](https://docs.avax.network/events/registration-form?event=596c0b2d-63aa-4cf0-a0ad-a7e34ddbfdc0), [Luma Team1VN](https://luma.com/Team1VN), [Telegram Builders](https://t.me/Team1VNbuilders).
- [Cấu hình mạng Fuji](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/02-network-setup), [Fuji explorer](https://build.avax.network/explorer/fuji/c-chain), [Avalanche Academy — contract đầu tiên](https://build.avax.network/academy/blockchain/solidity-foundry/03-smart-contracts/04-create-new-smart-contract), [Remix deploy](https://remix-ide.readthedocs.io/en/latest/create_deploy.html), [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts).
- [UnderGround](https://github.com/bhaveshpatil093/UnderGround), [MoveAndWhap](https://github.com/CodeLinkIO/MoveAndWhap), [Avax Gods](https://github.com/adrianhajdin/project_web3_battle_game).
- Tham khảo nội bộ theo yêu cầu: `D:\Nam4\Netcompany\team-trix-icc2026\README.md` và `NhatVy_Proposal.md`: cách tách nguồn/giả định, so sánh phương án, phạm vi và kiểm chứng.

**Nhật ký:** 31/10/2026 — tổng hợp FAQ/trang chủ, dữ liệu topics, form giao diện, Builder Pass, Builder Hub, Luma, cấu trúc/contract của ba repo và tài liệu Netcompany; các nhận định về ý tưởng, điểm số và kế hoạch đều là đề xuất, cần cập nhật theo thông báo mới và kết quả thực tế.
