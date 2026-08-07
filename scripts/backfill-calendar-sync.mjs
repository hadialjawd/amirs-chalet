// One-off script: pushes any reservation that predates the Google Calendar
// sync feature (i.e. has no google_event_id yet) into the calendar, so the
// Android widget shows existing bookings immediately instead of only new ones.
//
// Usage: node scripts/backfill-calendar-sync.mjs
// Reads Turso + Google env vars from .env in the project root.

import { createClient } from '@libsql/client';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(Boolean)
    .map(l => l.split('=')).map(([k, ...v]) => [k, v.join('=')])
);
Object.assign(process.env, env);

const { createCalendarEvent } = await import('../api/_lib/calendar.js');

const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

const result = await client.execute(
  "SELECT * FROM reservations WHERE google_event_id IS NULL OR google_event_id = ''"
);

console.log(`${result.rows.length} reservation(s) to sync.`);

let synced = 0;
for (const row of result.rows) {
  const reservation = {
    id: row.id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone || '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    pricePerNight: row.price_per_night,
    nights: row.nights,
    totalPrice: row.total_price,
    depositPaid: row.deposit_paid === 1,
    depositAmount: row.deposit_amount ?? row.total_price / 2,
    fullPaymentPaid: row.full_payment_paid === 1,
  };
  const eventId = await createCalendarEvent(reservation);
  if (eventId) {
    await client.execute({
      sql: 'UPDATE reservations SET google_event_id = ? WHERE id = ?',
      args: [eventId, row.id],
    });
    synced++;
    console.log(`  synced: ${reservation.guestName} (${reservation.checkIn})`);
  } else {
    console.log(`  FAILED: ${reservation.guestName} (${reservation.checkIn})`);
  }
}

console.log(`\nDone. ${synced}/${result.rows.length} synced.`);
