import { app } from '../src/index';

export default function handler(req: unknown, res: unknown) {
  return app(req as any, res as any);
}
