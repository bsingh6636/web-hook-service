import { Request, Response, NextFunction } from 'express';
import axiosInstance from '../utils/axiosInstance';

export const requestContextMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  axiosInstance.setRequestHeaders(req.headers);
  
  const originalEnd = _res.end.bind(_res);
  _res.end = function (chunk?: any, encoding?: any, callback?: any) {
    axiosInstance.clearRequestHeaders();
    return originalEnd(chunk, encoding, callback);
  };

  next();
};
