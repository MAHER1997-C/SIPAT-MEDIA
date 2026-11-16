import express, { Request, Response, NextFunction } from 'express';
import {
  ensureDatabaseReady,
  getActiveDbDriver,
  dbGetItems,
  dbCreateItem,
  dbUpdateItem,
  dbDeleteItem,
  dbGetLoans,
  dbCreateLoan,
  dbUpdateLoan,
  dbDeleteLoan,
  dbGetEvents,
  dbCreateEvent,
  dbDeleteEvent,
  dbGetSettings,
  dbUpdateSettings,
  dbGetSocialReports,
  dbSaveSocialReport
} from './db/queries.ts';
import { MediaItem, LoanRequest, MediaEvent, AppSettings, SocialMediaMonthlyReport } from './types/index.ts';
import {
  runSocialProfileBotFetch,
  runSocialInsightParserBot,
  getSocialBotApiStatus,
} from './services/socialBotServer.ts';

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

  // Pastikan tabel & seed data siap sebelum melayani request API (khususnya saat serverless cold start di Vercel/Supabase)
  app.use('/api', async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      await ensureDatabaseReady();
    } catch (err: any) {
      console.warn('Database initialization notice:', err?.message || err);
    }
    next();
  });

  // ==========================================
  // API: HEALTH & STATS
  // ==========================================
  app.get('/api/health', async (_req: Request, res: Response) => {
    const driver = getActiveDbDriver();
    try {
      if (driver.mode === 'none') {
        return res.json({
          status: 'ok',
          database: 'fallback',
          provider: driver.label,
          serverTime: new Date().toISOString(),
        });
      }
      await ensureDatabaseReady();
      const [items, loans, events, settings] = await Promise.all([
        dbGetItems(),
        dbGetLoans(),
        dbGetEvents(),
        dbGetSettings(),
      ]);
      res.json({
        status: 'ok',
        database: 'connected',
        provider: driver.label,
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
        provider: driver.label,
        serverTime: new Date().toISOString(),
        error: err.message
      });
    }
  });

  // ==========================================
  // API: FULL SYNC BUNDLE (Preview <-> Vercel/Supabase)
  // ==========================================
  app.get('/api/sync/bundle', async (_req: Request, res: Response) => {
    try {
      const driver = getActiveDbDriver();
      const [items, loans, events, settings] = await Promise.all([
        dbGetItems(),
        dbGetLoans(),
        dbGetEvents(),
        dbGetSettings(),
      ]);

      res.json({
        timestamp: new Date().toISOString(),
        source: driver.label,
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
          await dbCreateItem(item);
          updatedItems++;
        }
      }

      if (Array.isArray(loans) && loans.length > 0) {
        for (const loan of loans) {
          await dbCreateLoan(loan);
          updatedLoans++;
        }
      }

      if (Array.isArray(events) && events.length > 0) {
        for (const evt of events) {
          await dbCreateEvent(evt);
          updatedEvents++;
        }
      }

      res.json({
        success: true,
        message: 'Paket sinkronisasi berhasil disimpan ke database online',
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

  app.delete('/api/loans/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await dbDeleteLoan(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`DELETE /api/loans/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal menghapus riwayat peminjaman' });
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

  app.put('/api/events/:id', async (req: Request, res: Response) => {
    try {
      const evt = { ...req.body, id: req.params.id } as MediaEvent;
      const updated = await dbCreateEvent(evt);
      res.json(updated);
    } catch (err: any) {
      console.error(`PUT /api/events/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal memperbarui agenda' });
    }
  });

  app.delete('/api/events/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await dbDeleteEvent(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`DELETE /api/events/${req.params.id} failed:`, err);
      res.status(500).json({ error: err.message || 'Gagal menghapus agenda' });
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

  // ==========================================
  // API: SOCIAL MEDIA MONTHLY REPORTS & BOT
  // ==========================================
  app.get('/api/social-reports', async (_req: Request, res: Response) => {
    try {
      const reports = await dbGetSocialReports();
      res.json(reports);
    } catch (err: any) {
      console.error('GET /api/social-reports failed:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat laporan media sosial' });
    }
  });

  app.post('/api/social-reports', async (req: Request, res: Response) => {
    try {
      const saved = await dbSaveSocialReport(req.body as SocialMediaMonthlyReport);
      res.json(saved);
    } catch (err: any) {
      console.error('POST /api/social-reports failed:', err);
      res.status(500).json({ error: err.message || 'Gagal menyimpan laporan media sosial' });
    }
  });

  app.get('/api/social-reports/api-status', (_req: Request, res: Response) => {
    res.json(getSocialBotApiStatus());
  });

  app.post('/api/social-reports/bot-fetch', async (req: Request, res: Response) => {
    try {
      const result = await runSocialProfileBotFetch(req.body);
      const saved = await dbSaveSocialReport(result.report);
      res.json({
        report: saved,
        botMessage: result.botMessage,
        verified: result.verified,
        apiStatus: result.apiStatus,
      });
    } catch (err: any) {
      console.error('POST /api/social-reports/bot-fetch failed:', err);
      res.status(500).json({ error: err.message || 'Bot gagal menarik data profil media sosial' });
    }
  });

  app.post('/api/social-reports/bot-parse', async (req: Request, res: Response) => {
    try {
      const result = await runSocialInsightParserBot(req.body);
      const saved = await dbSaveSocialReport(result.report);
      res.json({
        report: saved,
        botMessage: result.botMessage,
      });
    } catch (err: any) {
      console.error('POST /api/social-reports/bot-parse failed:', err);
      res.status(500).json({ error: err.message || 'Bot gagal memindai data Insight' });
    }
  });

  return app;
};

