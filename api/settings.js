import { getClient } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const email = requireAuth(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      const client = getClient();
      const result = await client.execute({
        sql: "SELECT value FROM settings WHERE key = 'deposit_percent'",
        args: [],
      });

      const depositPercent = result.rows.length > 0 ? Number(result.rows[0].value) : 50;

      return res.status(200).json({ depositPercent });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const { depositPercent } = req.body || {};

    if (typeof depositPercent !== 'number' || !Number.isFinite(depositPercent) || depositPercent < 1 || depositPercent > 100) {
      return res.status(400).json({ error: 'Invalid depositPercent' });
    }

    try {
      const client = getClient();
      await client.execute({
        sql: "INSERT INTO settings (key, value) VALUES ('deposit_percent', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [String(depositPercent)],
      });

      return res.status(200).json({ success: true, depositPercent });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
