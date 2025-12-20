
import FailedWebhook from '../db/models/FailedWebhook';

interface FailedWebhookData {
  source: string;
  payload: object;
  headers: object;
  target_url?: string;
  error_message: string;
  error_details?: unknown;
}

export const saveFailedWebhook = async (data: FailedWebhookData) => {
  const failedWebhook = new FailedWebhook(data);
  await failedWebhook.save();
};

export const getMissedWebhooks = async (filter: object) => {
  return FailedWebhook.find(filter);
};
