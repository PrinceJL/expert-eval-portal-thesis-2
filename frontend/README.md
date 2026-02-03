# Eval Portal Frontend (Vite + React)

This is a simple **frontend** for your Thesis Evaluation Portal.

It includes:
- Login page (calls `POST /auth/login`)
- Stores `{accessToken, user}` in `localStorage`
- Role-based navbar (EXPERT vs ADMIN/RESEARCHER)
- Protected routes
- Auto logout on inactivity (default 15 minutes)

## 1) Requirements
- Node.js LTS installed
- Backend running (Express) at `http://localhost:3000`

## 2) Setup

Open a terminal in this folder and run:

```bash
npm install
```

Create `.env` (or copy from `.env.example`):

```bash
copy .env.example .env
```

Edit `.env` if needed:

```env
VITE_API_URL=http://localhost:3000
VITE_IDLE_MINUTES=15
```

## 3) Run

```bash
npm run dev
```

Open:
- http://localhost:5173

## 4) Login fields
Your backend login expects:
- username
- password
- group

If you don’t have any users, seed one in the backend:

```bash
cd ../backend
node seed_user.js
```

Then login with:
- username: `expert1`
- password: `pass123`
- group: `TEAM404`

## 5) Notes
- The Evaluation page has a "Test /expert endpoint" button. Update the endpoint in `src/pages/Evaluation.jsx` to match a real `/expert/...` route in your backend.
