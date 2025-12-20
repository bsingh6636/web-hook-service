import { Request, Response } from 'express';
import UndefinedRoute from '../db/models/UndefinedRoute';

export const undefinedRouteHandler = async (req: Request, res: Response) => {
  try {
    const { method, originalUrl, headers, body } = req;
    const undefinedRoute = new UndefinedRoute({
      method,
      url: originalUrl,
      headers,
      body,
    });
    await undefinedRoute.save();
    res.status(404).send('Not Found');
  } catch (error) {
    console.error('Error saving undefined route request:', error);
    res.status(500).send('Internal Server Error');
  }
};
