import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../models';
import { logActivity, logLogin } from '../../utils/activity';

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Temporary login bypass (Mongo disabled)
  if (username === 'admin' && password === 'admin123') {
    return res.json({
      token: 'temp-token',
      user: {
        id: '1',
        username: 'admin',
        role: 'ADMIN',
        fullName: 'Admin',
        permissions: []
      }
    });
  }

  return res.status(401).json({
    error: 'Invalid credentials'
  });
};

export const getMe = async (req: any, res: Response) => {
  try {
    res.json({
      user: {
        id: '1',
        username: 'admin',
        role: 'ADMIN',
        fullName: 'Admin',
        permissions: []
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: '1',
        username: 'admin',
        role: 'ADMIN',
        fullName: 'Admin',
        permissions: []
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};