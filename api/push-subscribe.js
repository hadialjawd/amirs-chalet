import { getClient } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const email = requireAuth(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'POST') {
    const { subscription } = req.body || {};
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    try {
      const client = getClient();
      await client.execute({
        sql: `INSERT INTO push_subscriptions (email, endpoint, p256dh, auth)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(endpoint) DO UPDATE SET email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth`,
        args: [email, endpoint, p256dh, auth],
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body || {};

    try {
      const client = getClient();
      await client.execute({
        sql: 'DELETE FROM push_subscriptions WHERE endpoint = ? AND email = ?',
        args: [endpoint, email],
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
