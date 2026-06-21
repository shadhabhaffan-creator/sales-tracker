import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error.middleware';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const keys = Object.keys(schema);
    for (const key of keys) {
      if (schema[key].required && (req.body[key] === undefined || req.body[key] === null || req.body[key] === '')) {
        return next(new ApiError(400, `${key} is required`));
      }
      if (schema[key].type && typeof req.body[key] !== schema[key].type && req.body[key] !== undefined) {
        return next(new ApiError(400, `${key} must be of type ${schema[key].type}`));
      }
    }
    next();
  };
};
