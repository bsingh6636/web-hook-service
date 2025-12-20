import { Schema, model, Document } from 'mongoose';

interface IFailedWebhook extends Document {
  payload: object;
  headers: object;
  target_url: string;
  error_message: string;
  status: string;
  source: string;
}

const FailedWebhookSchema = new Schema({
  payload: {
    type: Object,
    required: true,
  },
  headers: {
    type: Object,
    required: true,
  },
  target_url: {
    type: String,
    required: true,
  },
  error_message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'failed',
  },
  source: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

const FailedWebhook = model<IFailedWebhook>('FailedWebhook', FailedWebhookSchema);

export default FailedWebhook;