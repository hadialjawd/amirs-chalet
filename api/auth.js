import { getClient } from './_lib/db.js';
import { hashPassword, verifyPassword, createSessionToken, requireAuth } from './_lib/auth.js';

const ALLOWED_EMAILS = ['hadialjawad237@gmail.com', 'amir.chalet@gmail.com'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body || {};

    if (action === 'login') {
      const { email, password } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      const emailLower = email.toLowerCase().trim();
      if (!ALLOWED_EMAILS.includes(emailLower)) {
        return res.status(403).json({ error: 'Access denied. This email is not authorized.' });
      }

      const client = getClient();
      const result = await client.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [emailLower],
      });
      const user = result.rows[0];

      // No account-creation or password-claiming here on purpose: the allowlisted
      // emails are public (this repo is public), so anyone could "claim" an unset
      // account just by knowing the address. Accounts must be provisioned out of
      // band (see scripts/provision-user) with a real initial password already set.
      if (!user || !user.password || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      return res.status(200).json({ token: createSessionToken(emailLower), email: emailLower });
    }

    if (action === 'change-password') {
      const email = requireAuth(req);
      if (!email) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const { newPassword } = req.body || {};
      if (typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters.' });
      }
      const client = getClient();
      const hashed = hashPassword(newPassword);
      await client.execute({
        sql: 'UPDATE users SET password = ? WHERE email = ?',
        args: [hashed, email],
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
