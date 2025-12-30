
import FailedWebhook from '../db/models/FailedWebhook';
import logger from '../utils/logger';

interface FailedWebhookData {
  source: string;
  payload: object;
  headers: object;
  target_url?: string;
  error_message: string;
  error_details?: unknown;
}

export const saveFailedWebhook = async (data: FailedWebhookData) => {
  logger.info("Saving failed webhook to database", { source: data.source, target_url: data.target_url, error_message: data.error_message });
  const failedWebhook = new FailedWebhook(data);
  await failedWebhook.save();
};

export const getMissedWebhooks = async (filter: object) => {
  return FailedWebhook.find(filter);
};
