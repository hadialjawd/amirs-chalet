import { getClient } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const email = requireAuth(req);
  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = getClient();

  if (req.method === 'GET') {
    try {
      const result = await client.execute('SELECT * FROM expenses ORDER BY date DESC');
      const expenses = result.rows.map(row => ({
        id: row.id,
        description: row.description,
        amount: row.amount,
        date: row.date,
        category: row.category,
      }));
      return res.status(200).json({ expenses });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { description, amount, date, category } = req.body || {};
    try {
      const result = await client.execute({
        sql: 'INSERT INTO expenses (description, amount, date, category) VALUES (?, ?, ?, ?)',
        args: [description, amount, date, category],
      });
      const expense = {
        id: Number(result.lastInsertRowid),
        description,
        amount,
        date,
        category,
      };
      return res.status(201).json({ expense });
    } catch (error) {
      console.error('Error adding expense:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, description, amount, date, category } = req.body || {};
    try {
      await client.execute({
        sql: 'UPDATE expenses SET description = ?, amount = ?, date = ?, category = ? WHERE id = ?',
        args: [description, amount, date, category, id],
      });
      const expense = { id, description, amount, date, category };
      return res.status(200).json({ expense });
    } catch (error) {
      console.error('Error updating expense:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    try {
      await client.execute({
        sql: 'DELETE FROM expenses WHERE id = ?',
        args: [id],
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting expense:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
