import { Router, Request, Response } from 'express';
import { getPool } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query('SELECT * FROM restaurants');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query(
      'SELECT * FROM restaurants WHERE id = ?',
      [req.params.id]
    );
    connection.release();
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, location } = req.body;
    const pool = getPool();
    const connection = await pool.getConnection();
    const [result]: any = await connection.query(
      'INSERT INTO restaurants (name, description, location) VALUES (?, ?, ?)',
      [name, description, location]
    );
    connection.release();
    res.status(201).json({ id: result.insertId, name, description, location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

export default router;
