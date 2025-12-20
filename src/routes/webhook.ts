
import { Router, Request, Response } from 'express';
import axios from 'axios';
import FailedWebhook from '../db/models/FailedWebhook';

const router = Router();

router.post('/:source', async (req: Request, res: Response) => {
  const { source } = req.params;

  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(400).send('Invalid source parameter');
  }

  const targetUrl = process.env[`TARGET_URL_${source.toUpperCase()}`];

  if (!targetUrl) {
    console.error(`TARGET_URL for source '${source}' is not set`);
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
    
    const failedWebhook = new FailedWebhook({
      source,
      payload: body,
      headers: headers,
      target_url: targetUrl,
      error_message: errorMessage,
    });
    await failedWebhook.save();

    res.status(500).send(`Failed to forward webhook for '${source}'`);
  }
});

export default router;
