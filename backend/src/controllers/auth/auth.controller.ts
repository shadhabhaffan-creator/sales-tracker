import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../models';
import { logActivity, logLogin } from '../../utils/activity';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt for user: ${username}`);
    const user = await User.findOne({ username });

    if (!user) {
      console.warn(`[AUTH] User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Your account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[AUTH] Password match for ${username}: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Log login activity
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await logLogin(user._id, ip, userAgent);
    await logActivity(user._id, 'LOGIN', 'Logged into the system', ip, userAgent);

    res.json({
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role, 
        fullName: user.fullName, 
        permissions: user.permissions 
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) user.username = username;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        fullName: user.fullName,
        permissions: user.permissions
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
