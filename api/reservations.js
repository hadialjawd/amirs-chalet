import { getClient } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

function toReservation(row) {
  return {
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
}

export default async function handler(req, res) {
  const email = requireAuth(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = getClient();

  if (req.method === 'GET') {
    try {
      const result = await client.execute('SELECT * FROM reservations ORDER BY check_in DESC');
      return res.status(200).json({ reservations: result.rows.map(toReservation) });
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const reservation = req.body || {};
    try {
      const result = await client.execute({
        sql: `INSERT INTO reservations (guest_name, guest_phone, check_in, check_out, guests, price_per_night, nights, total_price, deposit_paid, deposit_amount, full_payment_paid)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          reservation.guestName,
          reservation.guestPhone || '',
          reservation.checkIn,
          reservation.checkOut,
          reservation.guests,
          reservation.pricePerNight,
          reservation.nights,
          reservation.totalPrice,
          reservation.depositPaid ? 1 : 0,
          reservation.depositAmount,
          reservation.fullPaymentPaid ? 1 : 0,
        ],
      });
      const inserted = await client.execute({
        sql: 'SELECT * FROM reservations WHERE id = ?',
        args: [Number(result.lastInsertRowid)],
      });
      return res.status(201).json({ reservation: toReservation(inserted.rows[0]) });
    } catch (error) {
      console.error('Error adding reservation:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, ...reservation } = req.body || {};
    try {
      await client.execute({
        sql: `UPDATE reservations
              SET guest_name = ?, guest_phone = ?, check_in = ?, check_out = ?, guests = ?, price_per_night = ?, nights = ?, total_price = ?, deposit_paid = ?, deposit_amount = ?, full_payment_paid = ?
              WHERE id = ?`,
        args: [
          reservation.guestName,
          reservation.guestPhone || '',
          reservation.checkIn,
          reservation.checkOut,
          reservation.guests,
          reservation.pricePerNight,
          reservation.nights,
          reservation.totalPrice,
          reservation.depositPaid ? 1 : 0,
          reservation.depositAmount,
          reservation.fullPaymentPaid ? 1 : 0,
          id,
        ],
      });
      const updated = await client.execute({
        sql: 'SELECT * FROM reservations WHERE id = ?',
        args: [id],
      });
      return res.status(200).json({ reservation: toReservation(updated.rows[0]) });
    } catch (error) {
      console.error('Error updating reservation:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    try {
      await client.execute({
        sql: 'DELETE FROM reservations WHERE id = ?',
        args: [id],
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, field, value } = req.body || {};
    const columnByField = {
      depositPaid: 'deposit_paid',
      fullPaymentPaid: 'full_payment_paid',
    };
    const column = columnByField[field];
    if (!column) {
      return res.status(400).json({ error: 'Invalid field' });
    }
    try {
      await client.execute({
        sql: `UPDATE reservations SET ${column} = ? WHERE id = ?`,
        args: [value ? 1 : 0, id],
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating reservation status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
