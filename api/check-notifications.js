import { getClient, setupWebPush, beirutDateString, sendToSubscriptions, markSentOnce } from './_lib/push.js';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = getClient();
  setupWebPush();

  const slot = req.query.slot === 'evening' ? 'evening' : 'morning';
  const today = beirutDateString(0);
  const candidates = [];

  if (slot === 'morning') {
    const tomorrow = beirutDateString(1);
    const weekOut = beirutDateString(7);

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
        body: `${r.guest_name}'s $${r.deposit_amount.toLocaleString()} deposit is still unpaid (check-in ${r.check_in}).`,
        checkType: 'deposit',
      });
    }
  } else {
    // Evening slot (8 PM Beirut, matching check-in time): ask about the FULL balance for guests checking in tonight
    const checkInsToday = await client.execute({
      sql: 'SELECT * FROM reservations WHERE check_in = ? AND full_payment_paid = 0',
      args: [today],
    });
    for (const r of checkInsToday.rows) {
      candidates.push({
        reservationId: r.id,
        type: 'checkin_full_payment_ask',
        title: '❓ Has the Full Payment Been Paid?',
        body: `${r.guest_name} is checking in right now. The full $${r.total_price.toLocaleString()} is still marked unpaid — tap to confirm.`,
        checkType: 'fullPayment',
      });
    }
  }

  const fresh = [];
  for (const n of candidates) {
    if (await markSentOnce(client, n.reservationId, n.type, today)) {
      fresh.push(n);
    }
  }

  if (fresh.length === 0) {
    return res.status(200).json({ sent: 0, message: 'Nothing new to notify' });
  }

  // Reminders go to every subscribed device
  const subs = await client.execute('SELECT * FROM push_subscriptions');

  let sentCount = 0;
  for (const n of fresh) {
    sentCount += await sendToSubscriptions(client, subs.rows, {
      title: n.title,
      body: n.body,
      tag: `${n.type}-${n.reservationId}`,
      url: n.checkType ? `/?depositCheck=${n.reservationId}&checkType=${n.checkType}` : '/',
      reservationId: n.checkType ? n.reservationId : undefined,
      depositCheck: !!n.checkType,
      checkType: n.checkType,
    });
  }

  return res.status(200).json({ sent: sentCount, events: fresh.length });
}
