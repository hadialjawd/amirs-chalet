import { createClient } from '@libsql/client';
import webpush from 'web-push';

const CONTACT_EMAIL = 'hadialjawad237@gmail.com';

function beirutDateString(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut' }).format(now);
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = createClient({
    url: process.env.VITE_TURSO_DATABASE_URL?.trim(),
    authToken: process.env.VITE_TURSO_AUTH_TOKEN?.trim(),
  });

  webpush.setVapidDetails(
    `mailto:${CONTACT_EMAIL}`,
    process.env.VITE_VAPID_PUBLIC_KEY?.trim(),
    process.env.VAPID_PRIVATE_KEY?.trim()
  );

  const today = beirutDateString(0);
  const tomorrow = beirutDateString(1);
  const weekOut = beirutDateString(7);

  const candidates = [];

  const checkInsTomorrow = await client.execute({
    sql: 'SELECT * FROM reservations WHERE check_in = ?',
    args: [tomorrow],
  });
  for (const r of checkInsTomorrow.rows) {
    candidates.push({
      reservationId: r.id,
      type: 'checkin',
      title: '📅 Check-in Tomorrow',
      body: `${r.guest_name} checks in tomorrow at 8 PM (${r.guests} guest${r.guests > 1 ? 's' : ''}).`,
    });
  }

  const checkOutsTomorrow = await client.execute({
    sql: 'SELECT * FROM reservations WHERE check_out = ?',
    args: [tomorrow],
  });
  for (const r of checkOutsTomorrow.rows) {
    candidates.push({
      reservationId: r.id,
      type: 'checkout',
      title: '👋 Check-out Tomorrow',
      body: `${r.guest_name} checks out tomorrow at 6 PM.`,
    });
  }

  const depositsDue = await client.execute({
    sql: 'SELECT * FROM reservations WHERE deposit_paid = 0 AND check_in >= ? AND check_in <= ?',
    args: [today, weekOut],
  });
  for (const r of depositsDue.rows) {
    candidates.push({
      reservationId: r.id,
      type: 'deposit',
      title: '💰 Deposit Due',
      body: `${r.guest_name}'s $${(r.total_price / 2).toLocaleString()} deposit is still unpaid (check-in ${r.check_in}).`,
    });
  }

  // De-dupe: only notify once per reservation/type/day
  const fresh = [];
  for (const n of candidates) {
    try {
      await client.execute({
        sql: 'INSERT INTO notification_log (reservation_id, type, sent_date) VALUES (?, ?, ?)',
        args: [n.reservationId, n.type, today],
      });
      fresh.push(n);
    } catch {
      // already logged today, skip
    }
  }

  if (fresh.length === 0) {
    return res.status(200).json({ sent: 0, message: 'Nothing new to notify' });
  }

  // Reminders (check-in/check-out/deposit) go to every subscribed device
  const subs = await client.execute('SELECT * FROM push_subscriptions');

  let sentCount = 0;
  for (const sub of subs.rows) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    for (const n of fresh) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: n.title,
          body: n.body,
          tag: `${n.type}-${n.reservationId}`,
          url: '/',
        }));
        sentCount++;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await client.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [sub.endpoint] });
        } else {
          console.error('Push send error:', error);
        }
      }
    }
  }

  return res.status(200).json({ sent: sentCount, events: fresh.length });
}
