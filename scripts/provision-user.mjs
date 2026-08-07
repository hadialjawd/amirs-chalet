// One-off admin script: create or reset a user's password directly in the database.
// The public login endpoint deliberately does NOT do this (see api/auth.js) since
// the allowed emails are public in this repo — accounts must be provisioned here,
// out of band, by whoever holds the database credentials.
//
// Usage: node scripts/provision-user.mjs <email> <newPassword>
// Reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from .env in the project root.

import { createClient } from '@libsql/client';
import { scryptSync, randomBytes } from 'crypto';
import fs from 'fs';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/provision-user.mjs <email> <newPassword>');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(Boolean)
    .map(l => l.split('=')).map(([k, ...v]) => [k, v.join('=')])
);

const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const emailLower = email.toLowerCase().trim();
const hashed = hashPassword(password);

await client.execute({
  sql: `INSERT INTO users (email, password) VALUES (?, ?)
        ON CONFLICT(email) DO UPDATE SET password = excluded.password`,
  args: [emailLower, hashed],
});

console.log(`Provisioned ${emailLower} with a new password.`);
