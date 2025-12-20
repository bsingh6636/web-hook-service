
import express from 'express';
import { json } from 'body-parser';
import { connectDB } from './db/database';
import webhookRouter from './routes/webhook';
import missedRequestsRouter from './routes/missedRequests';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(json());

app.use('/webhook', webhookRouter);
app.use('/missed-requests', missedRequestsRouter);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
