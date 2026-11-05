import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ensureDatabaseSeeded,
  dbGetItems,
  dbCreateItem,
  dbUpdateItem,
  dbDeleteItem,
  dbGetLoans,
  dbCreateLoan,
  dbUpdateLoan,
  dbGetEvents,
  dbCreateEvent,
  dbGetSettings,
  dbUpdateSettings
} from './src/db/queries.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Auto-seed initial 27 items, settings, and loans if table is empty
  ensureDatabaseSeeded().catch((err) => {
    console.error('Initial database seeding warning:', err);
  });

  // ==========================================
  // API: INVENTORY ITEMS
  // ==========================================
  app.get('/api/items', async (req, res) => {
    try {
      const items = await dbGetItems();
      res.json(items);
    } catch (err: any) {
      console.error('GET /api/items failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat daftar alat' });
    }
  });

  app.post('/api/items', async (req, res) => {
    try {
      const item = req.body;
      const created = await dbCreateItem(item);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('POST /api/items failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menambah alat baru' });
    }
  });

  app.put('/api/items/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbUpdateItem(id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`PUT /api/items/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal memperbarui alat' });
    }
  });

  app.delete('/api/items/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbDeleteItem(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`DELETE /api/items/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal menghapus alat' });
    }
  });

  // ==========================================
  // API: LOAN REQUESTS
  // ==========================================
  app.get('/api/loans', async (req, res) => {
    try {
      const loans = await dbGetLoans();
      res.json(loans);
    } catch (err: any) {
      console.error('GET /api/loans failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat data peminjaman' });
    }
  });

  app.post('/api/loans', async (req, res) => {
    try {
      const loan = req.body;
      const created = await dbCreateLoan(loan);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('POST /api/loans failed:', err);
      res.status(500).json({ error: err.message || 'Gagal membuat permohonan pinjam' });
    }
  });

  app.put('/api/loans/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbUpdateLoan(id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`PUT /api/loans/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal mengupdate permohonan' });
    }
  });

  // ==========================================
  // API: MEDIA EVENTS
  // ==========================================
  app.get('/api/events', async (req, res) => {
    try {
      const events = await dbGetEvents();
      res.json(events);
    } catch (err: any) {
      console.error('GET /api/events failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat agenda' });
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const evt = req.body;
      const created = await dbCreateEvent(evt);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('POST /api/events failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menambah agenda' });
    }
  });

  // ==========================================
  // API: SETTINGS
  // ==========================================
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await dbGetSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('GET /api/settings failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat pengaturan' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      await dbUpdateSettings(req.body);
      res.json({ success: true });
    } catch (err: any) {
      console.error('POST /api/settings failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menyimpan pengaturan' });
    }
  });

  // Health status
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // ==========================================
  // VITE DEV MIDDLEWARE / STATIC FILES
  // ==========================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Express berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
});
