import { Schema, model, Document } from 'mongoose';

export interface IUndefinedRoute extends Document {
  method: string;
  url: string;
  headers: object;
  body: object;
}

const UndefinedRouteSchema = new Schema({
  method: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  headers: {
    type: Object,
    required: true,
  },
  body: {
    type: Object,
    required: true,
  },
}, {
  timestamps: true,
});

const UndefinedRoute = model<IUndefinedRoute>('UndefinedRoute', UndefinedRouteSchema);

export default UndefinedRoute;
