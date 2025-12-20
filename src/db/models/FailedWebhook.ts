import { Schema, model, Document } from 'mongoose';

export interface IFailedWebhook extends Document {
  payload: object;
  headers: object;
  target_url: string;
  error_message: string;
  error_details?: object;
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
  error_details: {
    type: Object,
    required: false,
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