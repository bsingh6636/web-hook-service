
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { saveFailedWebhook } from '../services/webhookService';
import whatsappRouter from './whatsapp';

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
    console.error(errorMessage);
    await saveFailedWebhook({
      source,
      payload: req.body,
      headers: req.headers,
      target_url: 'NOT_CONFIGURED',
      error_message: errorMessage,
    });
    return res.status(500).send('Internal server error: Target URL not configured');
  }

  const { body, headers } = req;

  try {
    // Forward the webhook
    await axios.post(targetUrl, body, { headers });
    res.status(200).send(`Webhook for '${source}' forwarded successfully`);
  } catch (error) {
    // If forwarding fails, save the request to the database
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    await saveFailedWebhook({
      source,
      payload: body,
      headers,
      target_url: targetUrl,
      error_message: errorMessage,
    });

    res.status(500).send(`Failed to forward webhook for '${source}'`);
  }
});

export default router;
