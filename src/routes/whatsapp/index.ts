
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { saveFailedWebhook } from '../../services/webhookService';
import logger from '../../utils/logger';

const router = Router();
const source = 'whatsapp';

const handleWebhook = async (req: Request, res: Response, targetUrl: string | undefined) => {
  logger.info(`Incoming webhook for source: ${source}`, { body: req.body, headers: req.headers });

  if (!targetUrl) {
    const errorMessage = `Target URL for source '${source}' is not configured`;
    logger.error(errorMessage);
    await saveFailedWebhook({
      source,
      payload: req.body,
      headers: req.headers,
      error_message: errorMessage,
    });
    return res.status(200).send(`Webhook for '${source}' forwarded successfully`);
  }

  try {
    await axios.post(targetUrl, req.body, { headers: { ...req.headers, host: new URL(targetUrl).host } });
    logger.info(`Webhook for source '${source}' forwarded successfully to ${targetUrl}`);
    res.status(200).send(`Webhook for '${source}' forwarded successfully`);
  } catch (error: unknown) {
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

    await saveFailedWebhook({
      source,
      payload: req.body,
      headers: req.headers,
      target_url: targetUrl,
      error_message: errorMessage,
      error_details: errorDetails,
    });

    res.status(500).send(`Failed to forward webhook for '${source}'`);
  }
};

router.get('/', async (req: Request, res: Response) => {
  logger.info(`Test webhook for source: ${source}`, { req });
  await saveFailedWebhook({
    source,
    payload: req.body,
    headers: req.headers,
    error_message: `Test for source '${source}' is not configured`,
  })
  res.status(200).send('WhatsApp webhook forwarding service');
})

router.post('/', async (req: Request, res: Response) => {
  await handleWebhook(req, res, process.env.TARGET_URL_WHATSAPP_MESSAGES);
});

router.post('/conv', async (req: Request, res: Response) => {
  await handleWebhook(req, res, process.env.TARGET_URL_WHATSAPP_CONVO);
});

export default router;
