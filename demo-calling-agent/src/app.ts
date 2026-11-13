import express from 'express';
import path from 'path';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

import healthRoutes from './routes/healthRoutes';
import twilioRoutes from './routes/twilioRoutes';
import bookingRoutes from './routes/bookingRoutes';

const app = express();

// Middleware
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve static web UI dashboard
app.use(express.static(path.join(process.cwd(), 'public')));

// Mount API Routes
app.use('/', healthRoutes);
app.use('/twilio', twilioRoutes);
app.use('/', bookingRoutes);

// Error Handler Middleware
app.use(errorHandler);

export default app;
