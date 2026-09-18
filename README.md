# IBDP Tutoring — Frontend

React (Vite) SPA for Student, Tutor, Parent, and Admin roles. Talks to the Express API in `../backend`.

## Setup

```bash
# terminal 1 — backend
cd backend
npm run seed
npm run dev

# terminal 2 — frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`

## Demo login

OTP is always **`123456`**.

| Role | Phone |
|------|-------|
| Student | `7777777777` |
| Tutor | `8888888888` |
| Parent | `6666666666` |
| Admin | `9999999999` |

1. Enter phone → Send OTP  
2. Enter `123456` → pick role → Continue  

## Smoke checklist

- [ ] Student dashboard loads  
- [ ] Find tutor → book slot → Payments → Pay  
- [ ] Admin → Payments → Mark paid  
- [ ] Tutor availability + homework create/grade  
- [ ] Parent link child `7777777777` → dashboard  
- [ ] Messages / notifications for a role  

## Env

`VITE_API_URL=http://localhost:5000` (see `.env.example`)
