import { createClient } from '@libsql/client/web';

// Initialize Turso client with error handling
let client = null;

try {
  const url = import.meta.env.VITE_TURSO_DATABASE_URL;
  const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

  if (url && authToken) {
    client = createClient({
      url,
      authToken,
    });
  } else {
    console.error('Missing Turso environment variables:', { url: !!url, authToken: !!authToken });
  }
} catch (error) {
  console.error('Failed to initialize Turso client:', error);
}

// ============ RESERVATIONS ============

export async function getReservations() {
  if (!client) {
    console.error('Database client not initialized');
    return [];
  }
  try {
    const result = await client.execute('SELECT * FROM reservations ORDER BY check_in DESC');
    return result.rows.map(row => ({
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
    }));
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

export async function addReservation(reservation) {
  if (!client) throw new Error('Database client not initialized');
  try {
    const result = await client.execute({
      sql: `INSERT INTO reservations (guest_name, guest_phone, check_in, check_out, guests, price_per_night, nights, total_price, deposit_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    });
    return { ...reservation, id: Number(result.lastInsertRowid) };
  } catch (error) {
    console.error('Error adding reservation:', error);
    throw error;
  }
}

export async function updateReservation(id, reservation) {
  if (!client) throw new Error('Database client not initialized');
  try {
    await client.execute({
      sql: `UPDATE reservations
            SET guest_name = ?, guest_phone = ?, check_in = ?, check_out = ?, guests = ?, price_per_night = ?, nights = ?, total_price = ?, deposit_paid = ?
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
  if (!client) throw new Error('Database client not initialized');
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
  if (!client) {
    console.error('Database client not initialized');
    return [];
  }
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
  if (!client) throw new Error('Database client not initialized');
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
  if (!client) throw new Error('Database client not initialized');
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
  if (!client) throw new Error('Database client not initialized');
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

// ============ DEPOSIT STATUS ============

export async function toggleDepositStatus(id, depositPaid) {
  if (!client) throw new Error('Database client not initialized');
  try {
    await client.execute({
      sql: 'UPDATE reservations SET deposit_paid = ? WHERE id = ?',
      args: [depositPaid ? 1 : 0, id],
    });
    return true;
  } catch (error) {
    console.error('Error toggling deposit status:', error);
    throw error;
  }
}

// ============ USERS (AUTH) ============

export async function getUser(email) {
  if (!client) return null;
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        password: result.rows[0].password || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function createUser(email, password = '') {
  if (!client) throw new Error('Database client not initialized');
  try {
    const result = await client.execute({
      sql: 'INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)',
      args: [email, password],
    });
    return { id: Number(result.lastInsertRowid), email };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUserPassword(email, password) {
  if (!client) throw new Error('Database client not initialized');
  try {
    await client.execute({
      sql: 'UPDATE users SET password = ? WHERE email = ?',
      args: [password, email],
    });
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

export async function verifyUser(email, password) {
  if (!client) return null;
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM users WHERE email = ? AND password = ?',
      args: [email, password],
    });
    if (result.rows[0]) {
      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
      };
    }
    return null;
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
}
