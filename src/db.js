import { createClient } from '@libsql/client';

// Initialize Turso client
const client = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
});

// ============ RESERVATIONS ============

export async function getReservations() {
  try {
    const result = await client.execute('SELECT * FROM reservations ORDER BY check_in DESC');
    return result.rows.map(row => ({
      id: row.id,
      guestName: row.guest_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      guests: row.guests,
      pricePerNight: row.price_per_night,
      nights: row.nights,
      totalPrice: row.total_price,
    }));
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

export async function addReservation(reservation) {
  try {
    const result = await client.execute({
      sql: `INSERT INTO reservations (guest_name, check_in, check_out, guests, price_per_night, nights, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        reservation.guestName,
        reservation.checkIn,
        reservation.checkOut,
        reservation.guests,
        reservation.pricePerNight,
        reservation.nights,
        reservation.totalPrice,
      ],
    });
    return { ...reservation, id: Number(result.lastInsertRowid) };
  } catch (error) {
    console.error('Error adding reservation:', error);
    throw error;
  }
}

export async function updateReservation(id, reservation) {
  try {
    await client.execute({
      sql: `UPDATE reservations
            SET guest_name = ?, check_in = ?, check_out = ?, guests = ?, price_per_night = ?, nights = ?, total_price = ?
            WHERE id = ?`,
      args: [
        reservation.guestName,
        reservation.checkIn,
        reservation.checkOut,
        reservation.guests,
        reservation.pricePerNight,
        reservation.nights,
        reservation.totalPrice,
        id,
      ],
    });
    return { ...reservation, id };
  } catch (error) {
    console.error('Error updating reservation:', error);
    throw error;
  }
}

export async function deleteReservation(id) {
  try {
    await client.execute({
      sql: 'DELETE FROM reservations WHERE id = ?',
      args: [id],
    });
    return true;
  } catch (error) {
    console.error('Error deleting reservation:', error);
    throw error;
  }
}

// ============ EXPENSES ============

export async function getExpenses() {
  try {
    const result = await client.execute('SELECT * FROM expenses ORDER BY date DESC');
    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      amount: row.amount,
      date: row.date,
      category: row.category,
    }));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

export async function addExpense(expense) {
  try {
    const result = await client.execute({
      sql: `INSERT INTO expenses (description, amount, date, category) VALUES (?, ?, ?, ?)`,
      args: [expense.description, expense.amount, expense.date, expense.category],
    });
    return { ...expense, id: Number(result.lastInsertRowid) };
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
}

export async function updateExpense(id, expense) {
  try {
    await client.execute({
      sql: `UPDATE expenses SET description = ?, amount = ?, date = ?, category = ? WHERE id = ?`,
      args: [expense.description, expense.amount, expense.date, expense.category, id],
    });
    return { ...expense, id };
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

export async function deleteExpense(id) {
  try {
    await client.execute({
      sql: 'DELETE FROM expenses WHERE id = ?',
      args: [id],
    });
    return true;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

// ============ USERS (AUTH) ============

export async function getUser(email) {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function createUser(email) {
  try {
    const result = await client.execute({
      sql: 'INSERT OR IGNORE INTO users (email) VALUES (?)',
      args: [email],
    });
    return { id: Number(result.lastInsertRowid), email };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
