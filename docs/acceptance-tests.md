# Acceptance test checklist

Run these tests locally and again after deployment. Use test contact data, not real personal information.

## Public form
- [ ] Required fields prevent empty submission in the browser.
- [ ] Valid Parent/Student/School inquiry persists to Supabase and returns HTTP 201.
- [ ] Invalid email, category, user type, phone, or too-short message returns HTTP 400.
- [ ] Public submission never exposes database credentials.

## Custom admin auth
- [ ] Admin setup only works when the temporary setup secret is configured and correct.
- [ ] Password is stored as a bcrypt hash, never plaintext.
- [ ] Correct credentials return a JWT; incorrect credentials return HTTP 401.
- [ ] Missing, malformed, wrong-signature, or expired JWT returns HTTP 401.
- [ ] GET /api/inquiries and PATCH /api/inquiries/:id/status reject unauthenticated requests.
- [ ] Remove ADMIN_SETUP_SECRET after creating the first admin.

## Dashboard
- [ ] List includes name, phone, email, user type, category, submission date, status, and message.
- [ ] Category and user type filters work separately and together.
- [ ] Search matches both name and phone.
- [ ] Status update persists and remains after refresh.
- [ ] Empty results, API errors, and loading state are shown clearly.

## Production
- [ ] GET /api/health returns HTTP 200 and database=connected.
- [ ] Frontend origin is allowlisted in backend FRONTEND_URL.
- [ ] VITE_API_URL points to deployed backend /api.
- [ ] JWT_SECRET and DATABASE_URL are only configured on backend hosting.
- [ ] No .env files or credentials are committed.
