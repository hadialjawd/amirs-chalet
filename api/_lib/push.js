import { createClient } from '@libsql/client';
import webpush from 'web-push';

const CONTACT_EMAIL = 'hadialjawad237@gmail.com';

export function getClient() {
  return createClient({
    url: process.env.VITE_TURSO_DATABASE_URL?.trim(),
    authToken: process.env.VITE_TURSO_AUTH_TOKEN?.trim(),
  });
}

export function setupWebPush() {
  webpush.setVapidDetails(
    `mailto:${CONTACT_EMAIL}`,
    process.env.VITE_VAPID_PUBLIC_KEY?.trim(),
    process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function beirutDateString(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut' }).format(now);
}

// Sends payload to every given subscription row, pruning dead ones. Returns count sent.
export async function sendToSubscriptions(client, subs, payload) {
  let sentCount = 0;
  for (const sub of subs) {
    const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sentCount++;
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await client.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [sub.endpoint] });
      } else {
        console.error('Push send error:', error);
      }
    }
  }
  return sentCount;
}

// Logs (reservationId, type, dateKey) once; returns true only the first time (i.e. "is this fresh").
export async function markSentOnce(client, reservationId, type, dateKey) {
  try {
    await client.execute({
      sql: 'INSERT INTO notification_log (reservation_id, type, sent_date) VALUES (?, ?, ?)',
      args: [reservationId, type, dateKey],
    });
    return true;
  } catch {
    return false;
  }
}
