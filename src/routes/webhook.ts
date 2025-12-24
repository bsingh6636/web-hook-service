
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { saveFailedWebhook } from '../services/webhookService';
import whatsappRouter from './whatsapp';
import logger from '../utils/logger';

const router = Router();

// Delegate to the WhatsApp router
router.use('/whatsapp', whatsappRouter);

// Generic route for other sources
router.post('/:source', async (req: Request, res: Response) => {
  const { source } = req.params;

  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(400).send('Invalid source parameter');
  }

  const targetUrl = process.env[`TARGET_URL_${source.toUpperCase()}`];

  if (!targetUrl) {
    const errorMessage = `TARGET_URL for source '${source}' is not set`;
    logger.error(errorMessage);
    try {
      await saveFailedWebhook({
        source,
        payload: req.body,
        headers: req.headers,
        target_url: 'NOT_CONFIGURED',
        error_message: errorMessage,
      });
    } catch (dbError: unknown) {
      logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
    }
    return res.status(200).send(`Webhook received for '${source}'`);
  }

  const { body, headers } = req;

  try {
    // Forward the webhook
    await axios.post(targetUrl, body, { headers });
    res.status(200).send(`Webhook for '${source}' forwarded successfully`);
  } catch (error: unknown) {
    // If forwarding fails, save the request to the database
    let errorMessage = 'An unknown error occurred';
    let errorDetails: unknown = {};

    if (axios.isAxiosError(error)) {
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      };
    } else if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        stack: error.stack,
      };
    }

    logger.error(`Failed to forward webhook for source '${source}' to ${targetUrl}`, {
      errorMessage,
      errorDetails,
    });

    try {
      await saveFailedWebhook({
        source,
        payload: body,
        headers,
        target_url: targetUrl,
        error_message: errorMessage,
        error_details: errorDetails,
      });
    } catch (dbError: unknown) {
      logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
    }

    res.status(200).send(`Webhook received for '${source}'`);
  }
});

export default router;
