import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

test('custom JWT token includes admin role and verifies issuer/audience', () => {
  const secret = 'test-secret-at-least-32-characters-long';
  const token = jwt.sign({ sub: 'admin-1', email: 'admin@example.com', role: 'admin' }, secret, { expiresIn: '2h', issuer: 'edtech-crm-api', audience: 'edtech-crm-admin' });
  const payload = jwt.verify(token, secret, { issuer: 'edtech-crm-api', audience: 'edtech-crm-admin' });
  assert.equal(payload.role, 'admin');
  assert.equal(payload.sub, 'admin-1');
  assert.throws(() => jwt.verify(token, 'wrong-secret-at-least-32-characters'));
});
