# EdTech CRM & Inquiry System

A responsive full-stack CRM assessment project built with React + Vite, Node.js + Express, custom bcrypt/JWT authentication, and Supabase PostgreSQL through the standard PostgreSQL driver `pg`. Supabase Auth is not used.

## Features

- Public inquiry form for Parent, Student, or School
- Inquiry categories: Scholarship, Concert, Admission, General Query
- Server-side validation and parameterized PostgreSQL queries
- Admin login with bcrypt password hashes and custom JWT
- Protected admin endpoints for listing inquiries and updating status
- Category, user type, status, and name/phone search filters
- Responsive dashboard, status management, login rate limit, Helmet headers, CORS allowlist
- SQL schema and environment examples included

## Repository layout

- `frontend/` — React/Vite public form, admin login, and dashboard
- `backend/` — Express API and database/auth code
- `backend/schema.sql` — Supabase PostgreSQL schema
- `render.yaml` — Render backend service template
- `.env.example` — environment variable reference

## Requirements

Node.js 20+ and npm, a Supabase project, and deployment accounts if publishing the app.

## Local setup

1. In Supabase, open **SQL Editor** and run the full contents of `backend/schema.sql`.
2. Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL` to your Supabase PostgreSQL connection string, and set `JWT_SECRET` to a random secret of at least 32 characters.
3. Set `FRONTEND_URL=http://localhost:5173`. Temporarily configure `ADMIN_SETUP_SECRET` to a one-time secret.
4. From the repository root, run `npm install`.
5. In terminal 1, run `npm run dev --workspace backend` (or `npm run start --workspace backend`).
6. In terminal 2, set `VITE_API_URL=http://localhost:4000/api` in `frontend/.env` and run `npm run dev --workspace frontend`.
7. Create the first admin by sending a POST request to `http://localhost:4000/api/auth/setup` with header `x-admin-setup-secret: YOUR_ONE_TIME_SECRET` and JSON body `{"email":"admin@example.com","password":"a-long-password-at-least-12-chars"}`.
8. Remove `ADMIN_SETUP_SECRET` from the backend environment and restart the API. Then log in through the Admin login tab.

Example setup request:

```bash
curl -X POST http://localhost:4000/api/auth/setup \
  -H "Content-Type: application/json" \
  -H "x-admin-setup-secret: YOUR_ONE_TIME_SECRET" \
  -d '{"email":"admin@example.com","password":"a-long-password-at-least-12-chars"}'
```

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | API/database health |
| POST | `/api/inquiries` | Public | Submit inquiry |
| POST | `/api/auth/setup` | Temporary secret | One-time admin bootstrap |
| POST | `/api/auth/login` | Public | Return signed JWT |
| GET | `/api/auth/me` | JWT | Verify current admin |
| GET | `/api/inquiries` | JWT | List/search/filter inquiries |
| PATCH | `/api/inquiries/:id/status` | JWT | Update inquiry status |

For protected routes, send `Authorization: Bearer <token>`. Listing supports `category`, `userType`, `status`, `search`, `page`, and `limit` query parameters.

## Deployment

### Backend on Render
Create a new Web Service from this repository, set **Root Directory** to `backend`, build command `npm install`, and start command `npm start`. Configure `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` in Render's environment settings. Set `ADMIN_SETUP_SECRET` only during initial admin creation, then remove it.

### Frontend on Vercel
Import this repository and set **Root Directory** to `frontend`. Configure `VITE_API_URL` to the deployed backend URL ending in `/api`. The backend's `FRONTEND_URL` must exactly match the deployed frontend origin.

## Security notes

- Never commit `.env` files, database passwords, JWT secrets, or admin credentials.
- Do not use Supabase Auth for this assessment; the API implements its own bcrypt/JWT authentication.
- The browser receives only the API URL. PostgreSQL credentials remain server-side.
- Remove the temporary admin setup secret after creating the first admin.

## Verification checklist

Before submitting, verify: public inquiry persists in Supabase; incorrect credentials return 401; admin endpoints reject missing/invalid/expired JWTs; valid JWT grants access; category and user type filters work individually and together; name and phone search work; status updates persist; production frontend can reach the backend; and `GET /api/health` reports database connected.

**Deployment status:** source code is committed; a live database-backed demo is not considered ready until a real Supabase connection and hosted API/frontend have been configured and tested.
