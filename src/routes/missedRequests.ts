
import { Router, Request, Response } from 'express';
import FailedWebhook from '../db/models/FailedWebhook';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { source } = req.query;
  const filter = source ? { source: source as string } : {};

  try {
    const missedRequests = await FailedWebhook.find(filter);
    res.status(200).json(missedRequests);
  } catch (error) {
    res.status(500).send('Error fetching missed requests');
  }
});

export default router;
