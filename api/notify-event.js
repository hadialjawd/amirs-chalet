import { getClient, setupWebPush, sendToSubscriptions } from './_lib/push.js';

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
  if (!['reservation', 'expense', 'deposit_paid', 'full_payment_paid'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  // Hadi doesn't need to be notified about his own actions
  if (actorEmail === HADI_EMAIL) {
    return res.status(200).json({ sent: 0, skipped: 'self' });
  }

  const client = getClient();
  setupWebPush();

  const payloads = {
    reservation: { title: '🆕 New Reservation', body: `${guestName} was just added by ${actorEmail}.` },
    expense: { title: '🧾 New Expense', body: `${description} ($${amount}) was just added by ${actorEmail}.` },
    deposit_paid: { title: '💰 Deposit Received', body: `$${amount} deposit for ${guestName} was just marked paid by ${actorEmail}.` },
    full_payment_paid: { title: '✅ Full Payment Received', body: `${guestName}'s remaining $${amount} balance was just marked paid by ${actorEmail}.` },
  };
  const payload = payloads[type];

  const subs = await client.execute({
    sql: 'SELECT * FROM push_subscriptions WHERE email = ?',
    args: [HADI_EMAIL],
  });

  const sentCount = await sendToSubscriptions(client, subs.rows, { ...payload, tag: type, url: '/' });

  return res.status(200).json({ sent: sentCount });
}
