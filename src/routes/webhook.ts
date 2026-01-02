
import { Router, Request, Response } from 'express';
import axios from 'axios';
import axiosInstance from '../utils/axiosInstance';
import { saveFailedWebhook } from '../services/webhookService';
import whatsappRouter from './whatsapp';
import logger from '../utils/logger';

const router = Router();

const FACEBOOK_TARGET_URL = 'https://subs-local-backend.brijesh.fun/webhook/facebook';

const sanitizeForwardHeaders = (headers: Request['headers']): Record<string, string | string[]> => {
  const sanitized: Record<string, string | string[]> = {};
  const excludedHeaders = ['host', 'connection', 'content-length', 'transfer-encoding', 'expect'];

  Object.entries(headers).forEach(([key, value]) => {
    if (!excludedHeaders.includes(key.toLowerCase()) && value !== undefined) {
      sanitized[key] = value;
    }
  });

  return sanitized;
};

// Delegate to the WhatsApp router
router.use('/whatsapp', whatsappRouter);

router.get('/facebook', async (req: Request, res: Response) => {

  const facebookVerifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === facebookVerifyToken) {
    logger.info('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {

    let errorMessage = 'Facebook webhook verification failed.';

    if (!facebookVerifyToken) {
      errorMessage = "ENV variable FACEBOOK_VERIFY_TOKEN is not set";
    }

    await saveFailedWebhook({
      source: 'facebook',
      payload: req.body || {},
      headers: req.headers,
      target_url: FACEBOOK_TARGET_URL,
      error_message: errorMessage,
      error_details: { mode, token, challenge },
    });

    logger.error(errorMessage, { mode, token, challenge });
    res.sendStatus(403);
  }
});

router.post('/facebook', (req: Request, res: Response) => {
  logger.info('Facebook post webhook received, sending 200 response');
  res.status(200).send('Facebook webhook received and acknowledged');

  const rawBody = (req as any).rawBody;
  const forwardBody = Buffer.isBuffer(rawBody) ? rawBody : req.body;
  const forwardedHeaders = sanitizeForwardHeaders(req.headers);

  setImmediate(async () => {
    logger.info('Processing Facebook webhook in background', { body: forwardBody });
    try {
      const response = await axiosInstance.getAxios().post(FACEBOOK_TARGET_URL, forwardBody, {
        headers: {
          ...forwardedHeaders,
          'content-type': req.headers['content-type'] || 'application/json',
        },
        validateStatus: () => true,
        maxBodyLength: Infinity,
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`Facebook webhook forwarded successfully to ${FACEBOOK_TARGET_URL}`, { status: response.status });
      } else {
        const errorMessage = `Non-2xx response while forwarding Facebook webhook: ${response.status}`;
        logger.error(errorMessage, { responseData: response.data });
        try {
          await saveFailedWebhook({
            source: 'facebook',
            payload: req.body || {},
            headers: req.headers,
            target_url: FACEBOOK_TARGET_URL,
            error_message: errorMessage,
            error_details: { status: response.status, response: response.data },
          });
        } catch (dbError: unknown) {
          logger.error(`Failed to persist failed webhook for source 'facebook'`, { dbError });
        }
      }
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

      logger.error(`Failed to forward Facebook webhook to ${FACEBOOK_TARGET_URL}`, {
        errorMessage,
        errorDetails,
      });

      try {
        await saveFailedWebhook({
          source: 'facebook',
          payload: req.body || {},
          headers: req.headers,
          target_url: FACEBOOK_TARGET_URL,
          error_message: errorMessage,
          error_details: errorDetails,
        });
      } catch (dbError: unknown) {
        logger.error(`Failed to persist failed webhook for source 'facebook'`, { dbError });
      }
    }
  });
});

// Generic GET route (e.g. Facebook verification)
router.get('/:source', async (req: Request, res: Response) => {
  const { source } = req.params;
  logger.info(`Processing GET webhook for source '${source}'`, { source, query: req.query });

  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(200).send('Invalid source parameter');
  }

  const targetUrl = process.env[`TARGET_URL_${source.toUpperCase()}`];

  if (!targetUrl) {
    const errorMessage = `TARGET_URL for source '${source}' is not set`;
    logger.error(errorMessage);
    try {
      await saveFailedWebhook({
        source,
        payload: req.query || {},
        headers: req.headers,
        target_url: 'NOT_CONFIGURED',
        error_message: errorMessage,
      });
    } catch (dbError: unknown) {
      logger.error(`Failed to persist failed webhook for source , send 200 data '${source}'`, { dbError });
    }
    // return res.status(500).send(`TARGET_URL not configured for '${source}'`);

    return res.status(200).send(`webhook received for source '${source}'`);
  }

  try {
    const response = await axiosInstance.getAxios().get(targetUrl, {
      params: req.query,
      responseType: 'text',
      transformResponse: [(data) => data],
      validateStatus: () => true,
    });

    if (response.headers?.['content-type']) {
      res.setHeader('content-type', response.headers['content-type']);
    }

    if (response.status >= 200 && response.status < 300) {
      logger.info(`Successfully forwarded GET webhook for source '${source}' to ${targetUrl}`, { status: response.status });
    } else {
      const errorMessage = `Non-2xx response while forwarding GET webhook for source '${source}': ${response.status}`;
      logger.error(errorMessage, { responseData: response.data });
      try {
        await saveFailedWebhook({
          source,
          payload: req.query || {},
          headers: req.headers,
          target_url: targetUrl,
          error_message: errorMessage,
          error_details: { status: response.status, response: response.data },
        });
      } catch (dbError: unknown) {
        logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
      }
    }

    return res.status(200).send(response.data);
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

    logger.error(`Failed to forward GET webhook for source '${source}' to ${targetUrl}`, {
      errorMessage,
      errorDetails,
    });

    try {
      await saveFailedWebhook({
        source,
        payload: req.query || {},
        headers: req.headers,
        target_url: targetUrl,
        error_message: errorMessage,
        error_details: errorDetails,
      });
    } catch (dbError: unknown) {
      logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
    }

    return res.status(200).send('Failed to forward webhook but acknowledged - logged');
  }
});




// Generic route for other sources
router.post('/:source', async (req: Request, res: Response) => {
  const { source } = req.params;
  logger.info(`Processing POST webhook for source '${source}'`, { source });

  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(200).send('Invalid source parameter');
  }

  const targetUrl = process.env[`TARGET_URL_${source.toUpperCase()}`];

  if (!targetUrl) {
    const errorMessage = `TARGET_URL for source '${source}' is not set`;
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

  const { body, headers } = req;
  const rawBody = (req as any).rawBody;
  const forwardBody = Buffer.isBuffer(rawBody) ? rawBody : body;

  try {
    // Forward the webhook
    const response = await axiosInstance.getAxios().post(targetUrl, forwardBody, {
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
      },
      validateStatus: () => true,
      maxBodyLength: Infinity,
    });

    if (response.status >= 200 && response.status < 300) {
      logger.info(`Successfully forwarded POST webhook for source '${source}' to ${targetUrl}`, { status: response.status });
    } else {
      const errorMessage = `Non-2xx response while forwarding webhook for source '${source}': ${response.status}`;
      logger.error(errorMessage, { responseData: response.data });
      try {
        await saveFailedWebhook({
          source,
          payload: body,
          headers,
          target_url: targetUrl,
          error_message: errorMessage,
          error_details: { status: response.status, response: response.data },
        });
      } catch (dbError: unknown) {
        logger.error(`Failed to persist failed webhook for source '${source}'`, { dbError });
      }
    }

    res.status(200).send(`Webhook received for '${source}'`);
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
