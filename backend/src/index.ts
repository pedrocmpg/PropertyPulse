/**
 * FII Dashboard Backend Entry Point
 * Node.js/Express server for secure brAPI proxy
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RequestHandler } from './handlers/RequestHandler';
import config from './config/config';
import Logger from './utils/Logger';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize RequestHandler
const requestHandler = new RequestHandler();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// FII indicators endpoint
app.get('/api/fii/indicators', (req, res) => {
  requestHandler.handleRequest(req, res);
});

const PORT = config.BACKEND_PORT;

app.listen(PORT, () => {
  Logger.info(`Backend server running on port ${PORT}`);
  Logger.info(`Environment: ${config.NODE_ENV}`);
  Logger.info(`Cache TTL: ${config.CACHE_TTL_SECONDS}s`);
  Logger.info(`Request timeout: ${config.REQUEST_TIMEOUT_MS}ms`);
});
