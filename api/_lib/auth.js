import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3 || !parts[1] || !parts[2]) return false;
  const [, salt, hash] = parts;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function sign(payload) {
  return createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
}

export function createSessionToken(email) {
  const payload = `${email}:${Date.now() + SESSION_TTL_MS}`;
  const body = Buffer.from(payload).toString('base64url');
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  const payload = Buffer.from(body, 'base64url').toString();
  const idx = payload.lastIndexOf(':');
  if (idx === -1) return null;
  const email = payload.slice(0, idx);
  const expiry = Number(payload.slice(idx + 1));
  if (!email || !Number.isFinite(expiry) || expiry < Date.now()) return null;
  return email;
}

export function requireAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verifySessionToken(token);
}
