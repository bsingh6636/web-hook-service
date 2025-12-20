
import { Router, Request, Response } from 'express';
import axios from 'axios';
import FailedWebhook from '../db/models/FailedWebhook';

const router = Router();

const TARGET_WEBHOOK_URL = process.env.TARGET_WEBHOOK_URL;

router.post('/', async (req: Request, res: Response) => {
  if (!TARGET_WEBHOOK_URL) {
    console.error('TARGET_WEBHOOK_URL is not set');
    return res.status(500).send('Internal server error');
  }

  const { body, headers } = req;

  try {
    // Forward the webhook
    await axios.post(TARGET_WEBHOOK_URL, body, { headers });
    res.status(200).send('Webhook forwarded successfully');
  } catch (error) {
    // If forwarding fails, save the request to the database
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    await FailedWebhook.create({
      payload: body,
      headers: headers,
      target_url: TARGET_WEBHOOK_URL,
      error_message: errorMessage,
    });

    res.status(500).send('Failed to forward webhook');
  }
});

export default router;
