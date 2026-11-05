import { createApiApp } from '../src/serverApp.ts';

// Vercel serverless function entrypoint for /api/*
const app = createApiApp();

export default app;
