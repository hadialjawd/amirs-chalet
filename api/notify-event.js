import { createClient } from '@libsql/client';
import webpush from 'web-push';

const HADI_EMAIL = 'hadialjawad237@gmail.com';
const ALLOWED_EMAILS = ['hadialjawad237@gmail.com', 'amir.chalet@gmail.com'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, actorEmail, guestName, description, amount } = req.body || {};

  if (!ALLOWED_EMAILS.includes(actorEmail)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!['reservation', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  // Hadi doesn't need to be notified about his own actions
  if (actorEmail === HADI_EMAIL) {
    return res.status(200).json({ sent: 0, skipped: 'self' });
  }

  const client = createClient({
    url: process.env.VITE_TURSO_DATABASE_URL,
    authToken: process.env.VITE_TURSO_AUTH_TOKEN,
  });

  webpush.setVapidDetails(
    `mailto:${HADI_EMAIL}`,
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const payload = type === 'reservation'
    ? { title: '🆕 New Reservation', body: `${guestName} was just added by ${actorEmail}.` }
    : { title: '🧾 New Expense', body: `${description} ($${amount}) was just added by ${actorEmail}.` };

  const subs = await client.execute({
    sql: 'SELECT * FROM push_subscriptions WHERE email = ?',
    args: [HADI_EMAIL],
  });

  let sentCount = 0;
  for (const sub of subs.rows) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify({ ...payload, tag: type, url: '/' }));
      sentCount++;
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await client.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [sub.endpoint] });
      } else {
        console.error('Push send error:', error);
      }
    }
  }

  return res.status(200).json({ sent: sentCount });
}
