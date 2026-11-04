# HomeStayDorm

Hệ thống quản lý thuê phòng HomeStayDorm, được dùng làm nền tảng cho bài thi Team1 Vietnam UniHack 2026 và phần tích hợp Avalanche.

## Cấu trúc repository

```text
HomeStayDorm/
├─ database/       # Schema, seed data, stored procedures và trigger SQL Server
├─ web/
│  ├─ backend/     # REST API Node.js + Express
│  ├─ frontend/    # React + Vite
│  └─ scripts/     # Công cụ hỗ trợ phân tích code
├─ hackathon/      # Bối cảnh, proposal và kế hoạch UniHack/Avalanche
├─ run.bat         # Chạy nhanh trên Command Prompt
└─ run.ps1         # Chạy nhanh trên PowerShell
```

Phần Avalanche sẽ được bổ sung ở bước tiếp theo, tách khỏi mã web và database hiện có để không làm hỏng các luồng nghiệp vụ SQL Server.

## Chạy local

Yêu cầu: Node.js, npm và SQL Server đã được cấu hình theo `web/backend/.env.example`.

Trên Windows, chạy một trong hai lệnh tại thư mục gốc:

```powershell
.\run.ps1
```

hoặc:

```bat
run.bat
```

Có thể chạy riêng từng phần:

```powershell
cd web/backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Tài liệu UniHack

- [Tổng quan cuộc thi](hackathon/README.md)
- [Kế hoạch thực hiện](hackathon/plan.md)
- [Proposal](hackathon/Proposal.md)
- [Bối cảnh Avalanche](hackathon/Unihack_Context.md)
