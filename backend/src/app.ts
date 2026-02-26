import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { sessionMiddleware } from './config/session.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { generalLimiter } from './middleware/rate-limit.js';
import authRoutes from './routes/auth.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import searchRoutes from './routes/search.routes.js';
import jobRoutes from './routes/job.routes.js';
import shortlistRoutes from './routes/shortlist.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: env.APP_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Session
app.use(sessionMiddleware);

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/shortlists', shortlistRoutes);
app.use('/api/v1/dashboard', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
