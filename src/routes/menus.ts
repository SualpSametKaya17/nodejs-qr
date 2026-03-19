import { Router, Request, Response } from 'express';
import { getPool } from '../db/connection.js';

const router = Router();

router.get('/restaurant/:restaurantId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query(
      'SELECT * FROM menu_items WHERE restaurant_id = ?',
      [req.params.restaurantId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurant_id, name, description, price, category } = req.body;
    const pool = getPool();
    const connection = await pool.getConnection();
    const [result]: any = await connection.query(
      'INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)',
      [restaurant_id, name, description, price, category]
    );
    connection.release();
    res.status(201).json({
      id: result.insertId,
      restaurant_id,
      name,
      description,
      price,
      category,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

export default router;
