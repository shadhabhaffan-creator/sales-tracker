import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'secret');
    if (!secret) {
      throw new Error('JWT Secret is not configured');
    }
    const decoded: any = jwt.verify(token, secret);
    
    // Fetch latest user details from DB to check status & permissions
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Not authorized, token failed' });
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403).json({ error: 'Not authorized as an admin' });
  }
};

export const requirePermission = (permission: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Super Admins bypass all permission checks
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    // Check dynamic permission
    const permissions = req.user.permissions || {};
    const list = Array.isArray(permission) ? permission : [permission];
    const hasAny = list.some(p => permissions[p] === true);

    if (hasAny) {
      return next();
    }

    res.status(403).json({ error: `Access Denied: Missing permission ${Array.isArray(permission) ? permission.join(' or ') : `'${permission}'`}` });
  };
};
