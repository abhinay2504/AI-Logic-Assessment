import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAdmin, signAdminToken } from './auth.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
const app = express();
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.use('/api/inquiries', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false }));

const inquirySchema = z.object({
  userType: z.enum(['Parent', 'Student', 'School']),
  category: z.enum(['Scholarship', 'Concert', 'Admission', 'General Query']),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform(s => s.toLowerCase()),
  phone: z.string().trim().regex(/^[+0-9() .-]{7,25}$/),
  message: z.string().trim().min(5).max(3000)
});
const loginSchema = z.object({ email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), password: z.string().min(1).max(128) });
const categories = ['Scholarship', 'Concert', 'Admission', 'General Query'];
const userTypes = ['Parent', 'Student', 'School'];

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
});

app.post('/api/inquiries', async (req, res, next) => {
  const parsed = inquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check the form fields.', details: parsed.error.flatten().fieldErrors });
  const { userType, category, name, email, phone, message } = parsed.data;
  try {
    const { rows } = await pool.query(
      'INSERT INTO inquiries (user_type, category, name, email, phone, message) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at',
      [userType, category, name, email, phone, message]
    );
    res.status(201).json({ message: 'Inquiry submitted successfully.', inquiry: rows[0] });
  } catch (err) { next(err); }
});

// One-time admin bootstrap. Configure ADMIN_SETUP_SECRET temporarily, create the admin, then remove it.
app.post('/api/auth/setup', rateLimit({ windowMs: 3600000, limit: 5 }), async (req, res, next) => {
  if (!process.env.ADMIN_SETUP_SECRET) return res.status(404).json({ error: 'Setup endpoint is disabled.' });
  if (req.get('x-admin-setup-secret') !== process.env.ADMIN_SETUP_SECRET) return res.status(403).json({ error: 'Invalid setup secret.' });
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.password.length < 12) return res.status(400).json({ error: 'Use a valid email and a password of at least 12 characters.' });
  try {
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const { rows } = await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id', [parsed.data.email, hash]);
    if (!rows[0]) return res.status(409).json({ error: 'An admin with this email already exists.' });
    res.status(201).json({ message: 'Admin created. Remove ADMIN_SETUP_SECRET and restart/redeploy the backend.' });
  } catch (err) { next(err); }
});

app.post('/api/auth/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Valid email and password are required.' });
  try {
    const { rows } = await pool.query('SELECT id, email, password_hash FROM admins WHERE email = $1 LIMIT 1', [parsed.data.email]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({ token: signAdminToken(admin), admin: { id: admin.id, email: admin.email } });
  } catch (err) { next(err); }
});
app.get('/api/auth/me', requireAdmin, (req, res) => res.json({ admin: req.admin }));

app.get('/api/inquiries', requireAdmin, async (req, res, next) => {
  const { category = '', userType = '', search = '', status = '', page = '1', limit = '50' } = req.query;
  if (category && !categories.includes(category)) return res.status(400).json({ error: 'Invalid category filter.' });
  if (userType && !userTypes.includes(userType)) return res.status(400).json({ error: 'Invalid user type filter.' });
  if (status && !['New', 'In Progress', 'Resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status filter.' });
  const p = Math.max(1, Number.parseInt(page, 10) || 1), take = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
  const q = typeof search === 'string' ? search.trim().slice(0, 120) : '';
  const values = [], clauses = [];
  if (category) { values.push(category); clauses.push(`category = $${values.length}`); }
  if (userType) { values.push(userType); clauses.push(`user_type = $${values.length}`); }
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  if (q) { values.push(`%${q}%`); clauses.push(`(name ILIKE $${values.length} OR phone ILIKE $${values.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM inquiries ${where}`, values);
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, user_type AS "userType", category, message, status, created_at AS "createdAt" FROM inquiries ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, take, (p - 1) * take]
    );
    res.json({ inquiries: rows, pagination: { page: p, limit: take, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / take) } });
  } catch (err) { next(err); }
});

app.patch('/api/inquiries/:id/status', requireAdmin, async (req, res, next) => {
  const parsed = z.object({ status: z.enum(['New', 'In Progress', 'Resolved']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid status is required.' });
  try {
    const { rows } = await pool.query('UPDATE inquiries SET status = $1 WHERE id = $2 RETURNING id, status, updated_at AS "updatedAt"', [parsed.data.status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json({ inquiry: rows[0] });
  } catch (err) { if (err.code === '22P02') return res.status(400).json({ error: 'Invalid inquiry ID.' }); next(err); }
});

app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message);
  if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed.' });
  res.status(500).json({ error: 'Unexpected server error.' });
});
const server = app.listen(Number(process.env.PORT || 4000), () => console.log('EdTech CRM API listening'));
const shutdown = async () => { server.close(); await pool.end(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
