import jwt from 'jsonwebtoken';

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    issuer: 'edtech-crm-api',
    audience: 'edtech-crm-admin',
  });
}

export function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'edtech-crm-api', audience: 'edtech-crm-admin' });
    if (payload.role !== 'admin' || !payload.sub) return res.status(403).json({ error: 'Admin access required.' });
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
