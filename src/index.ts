
import express from 'express';
import { connectDB } from './db/database';
import webhookRouter from './routes/webhook';
import missedRequestsRouter from './routes/missedRequests';
import { undefinedRouteHandler } from './routes/undefinedRoutes';
import { requestContextMiddleware } from './middleware/requestContext';
import dotenv from 'dotenv';

dotenv.config();

export const app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  },
}));
app.use(requestContextMiddleware);

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB connection error:', error);
  } finally {
    next();
  }
});

app.use('/webhook', webhookRouter);
app.use('/api/missed-requests', missedRequestsRouter);

app.use('/api/health', (_req, res) => {
  res.status(200).send('OK');
});

app.use(undefinedRouteHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
