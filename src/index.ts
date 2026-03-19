import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/connection.js';
import restaurantRoutes from './routes/restaurants.js';
import menuRoutes from './routes/menus.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menus', menuRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

async function start() {
  try {
    await initializeDatabase();
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
