
import { Router, Request, Response } from 'express';
import { getMissedWebhooks } from '../services/webhookService';
import logger from '../utils/logger';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  logger.info("Request received for missed webhooks", { query: req.query });
  const { source } = req.query;
  const filter = source ? { source: source as string } : {};

  try {
    const missedRequests = await getMissedWebhooks(filter);
    logger.info("Successfully fetched missed webhooks", { count: missedRequests.length });
    res.status(200).json(missedRequests);
  } catch (error) {
    logger.error("Error fetching missed requests", { error });
    res.status(500).send('Error fetching missed requests');
  }
});

export default router;
