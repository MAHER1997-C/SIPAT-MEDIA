import express, { Request, Response, NextFunction } from 'express';
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
} from './db/queries.ts';
import { MediaItem, LoanRequest, MediaEvent, AppSettings } from './types/index.ts';

export const createApiApp = () => {
  const app = express();

  // Middleware JSON
  app.use(express.json({ limit: '10mb' }));

  // CORS middleware for external clients (e.g. sipatmedia.vercel.app, localhost)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Auto-seed initial 27 items, settings, and loans if table is empty
  ensureDatabaseSeeded().catch((err) => {
    console.warn('Database seeding notice:', err.message || err);
  });

  // ==========================================
  // API: HEALTH & STATS
  // ==========================================
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const [items, loans, events, settings] = await Promise.all([
        dbGetItems().catch(() => []),
        dbGetLoans().catch(() => []),
        dbGetEvents().catch(() => []),
        dbGetSettings().catch(() => null),
      ]);
      res.json({
        status: 'ok',
        database: 'connected',
        serverTime: new Date().toISOString(),
        institution: settings?.pesantrenName || "PPTQ Qoryatul Qur'an",
        mediaTeam: settings?.mediaTeamName || "Qoryah TV",
        counts: {
          items: items.length,
          loans: loans.length,
          events: events.length,
        }
      });
    } catch (err: any) {
      res.json({
        status: 'ok',
        database: 'fallback',
        serverTime: new Date().toISOString(),
        error: err.message
      });
    }
  });

  // ==========================================
  // API: FULL SYNC BUNDLE (Preview <-> Vercel)
  // ==========================================
  app.get('/api/sync/bundle', async (_req: Request, res: Response) => {
    try {
      const [items, loans, events, settings] = await Promise.all([
        dbGetItems(),
        dbGetLoans(),
        dbGetEvents(),
        dbGetSettings(),
      ]);

      res.json({
        timestamp: new Date().toISOString(),
        source: 'Cloud SQL PostgreSQL (asia-southeast1)',
        settings,
        items,
        loans,
        events,
        stats: {
          itemsCount: items.length,
          loansCount: loans.length,
          eventsCount: events.length,
        }
      });
    } catch (err: any) {
      console.error('GET /api/sync/bundle failed:', err);
      res.status(500).json({ error: err.message || 'Gagal membuat paket sinkronisasi' });
    }
  });

  app.post('/api/sync/bundle', async (req: Request, res: Response) => {
    try {
      const { items, loans, events, settings } = req.body;
      let updatedItems = 0;
      let updatedLoans = 0;
      let updatedEvents = 0;

      if (settings) {
        await dbUpdateSettings(settings);
      }

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          try {
            await dbUpdateItem(item.id, item);
            updatedItems++;
          } catch {
            await dbCreateItem(item).catch(() => {});
            updatedItems++;
          }
        }
      }

      if (Array.isArray(loans) && loans.length > 0) {
        for (const loan of loans) {
          try {
            await dbUpdateLoan(loan.id, loan);
            updatedLoans++;
          } catch {
            await dbCreateLoan(loan).catch(() => {});
            updatedLoans++;
          }
        }
      }

      if (Array.isArray(events) && events.length > 0) {
        for (const evt of events) {
          await dbCreateEvent(evt).catch(() => {});
          updatedEvents++;
        }
      }

      res.json({
        success: true,
        message: 'Paket sinkronisasi berhasil disimpan ke Cloud SQL',
        stats: { updatedItems, updatedLoans, updatedEvents }
      });
    } catch (err: any) {
      console.error('POST /api/sync/bundle failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menerapkan paket sinkronisasi' });
    }
  });

  // ==========================================
  // API: INVENTORY ITEMS
  // ==========================================
  app.get('/api/items', async (_req: Request, res: Response) => {
    try {
      const items = await dbGetItems();
      res.json(items);
    } catch (err: any) {
      console.error('GET /api/items failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat daftar alat' });
    }
  });

  app.post('/api/items', async (req: Request, res: Response) => {
    try {
      const item = req.body as MediaItem;
      const created = await dbCreateItem(item);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('POST /api/items failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menambah alat baru' });
    }
  });

  app.put('/api/items/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await dbUpdateItem(id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`PUT /api/items/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal memperbarui alat' });
    }
  });

  app.delete('/api/items/:id', async (req: Request, res: Response) => {
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
  app.get('/api/loans', async (_req: Request, res: Response) => {
    try {
      const loans = await dbGetLoans();
      res.json(loans);
    } catch (err: any) {
      console.error('GET /api/loans failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat data peminjaman' });
    }
  });

  app.post('/api/loans', async (req: Request, res: Response) => {
    try {
      const loan = req.body as LoanRequest;
      const created = await dbCreateLoan(loan);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('POST /api/loans failed:', err);
      res.status(500).json({ error: err.message || 'Gagal membuat permohonan pinjam' });
    }
  });

  app.put('/api/loans/:id', async (req: Request, res: Response) => {
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
  app.get('/api/events', async (_req: Request, res: Response) => {
    try {
      const events = await dbGetEvents();
      res.json(events);
    } catch (err: any) {
      console.error('GET /api/events failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat agenda' });
    }
  });

  app.post('/api/events', async (req: Request, res: Response) => {
    try {
      const evt = req.body as MediaEvent;
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
  app.get('/api/settings', async (_req: Request, res: Response) => {
    try {
      const settings = await dbGetSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('GET /api/settings failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat pengaturan' });
    }
  });

  app.post('/api/settings', async (req: Request, res: Response) => {
    try {
      await dbUpdateSettings(req.body as AppSettings);
      res.json({ success: true });
    } catch (err: any) {
      console.error('POST /api/settings failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menyimpan pengaturan' });
    }
  });

  return app;
};
