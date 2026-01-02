import { Router, Request, Response } from 'express';
import axios from 'axios';
import axiosInstance from '../../utils/axiosInstance';
import { saveFailedWebhook } from '../../services/webhookService';
import logger from '../../utils/logger';

const router = Router();
const source = 'whatsapp';

//later add validation  if no req.body is received then return error

const handleWebhook = async (req: Request, res: Response, targetUrl: string | undefined) => {
  logger.info(`Incoming webhook for source: ${source}`, { body: req.body, headers: req.headers });

  const rawBody = (req as any).rawBody;
  const forwardBody = Buffer.isBuffer(rawBody) ? rawBody : req.body;

  if (!targetUrl) {
    const errorMessage = `Target URL for source '${source}' is not configured`;
    logger.error(errorMessage);
    try {
      await saveFailedWebhook({
        source,
        payload: req.body || {},
        headers: req.headers,
        target_url: 'NOT_CONFIGURED',
        error_message: errorMessage,
      });
    } catch (dbError: unknown) {
      logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
    }
    return res.status(200).send(`Webhook received for '${source}'`);
  }

  try {
    await axiosInstance.getAxios().post(targetUrl, forwardBody, {
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
      },
      transformRequest: [(data) => data],
      validateStatus: () => true,
      maxBodyLength: Infinity,
    });
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

    try {
      await saveFailedWebhook({
        source,
        payload: req.body || {},
        headers: req.headers,
        target_url: targetUrl || 'NOT_CONFIGURED',
        error_message: errorMessage,
        error_details: errorDetails,
      });
    } catch (dbError: unknown) {
      logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
    }

    res.status(200).send(`Webhook received for '${source}'`);
  }
};

router.get('/', async (req: Request, res: Response) => {
  logger.info(`Test webhook for source: ${source}`, { req });
  try {
    await saveFailedWebhook({
      source,
      payload: req.query || {},
      headers: req.headers,
      target_url: 'NOT_APPLICABLE_FOR_GET',
      error_message: `Test for source '${source}' is not configured`,
    });
  } catch (dbError: unknown) {
    logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
  }
  res.status(200).send('WhatsApp webhook forwarding service');
});

const messagesUrl : string = 'https://subs-local-backend.brijesh.fun/webhook/whatsapp';
router.post('/', async (req: Request, res: Response) => {
  await handleWebhook(req, res, process.env.TARGET_URL_WHATSAPP_MESSAGES || messagesUrl);
});

const convoUrl : string = 'https://subs-local-backend.brijesh.fun/webhook/whatsapp';
router.post('/conv', async (req: Request, res: Response) => {
  await handleWebhook(req, res, process.env.TARGET_URL_WHATSAPP_CONVO || convoUrl);
});

export default router;
