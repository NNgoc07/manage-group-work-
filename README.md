# Task Manager

Ứng dụng quản lý công việc nhóm đơn giản.

## Yêu cầu

- Node.js >= 18
- npm

## Cài đặt & Chạy

### Backend

cd backend
npm install
npx prisma migrate dev
npm run dev

Backend chạy tại http://localhost:5000

### Frontend

cd frontend
npm install
npm run dev

Frontend chạy tại http://localhost:5173

## Biến môi trường (backend/.env)

DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=5000
ANTHROPIC_API_KEY="your-api-key"  # nếu dùng AI
