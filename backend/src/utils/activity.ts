import { User } from '../models';

export const logActivity = async (
  userId: string, 
  action: string, 
  details?: string, 
  ip?: string, 
  userAgent?: string
) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          $each: [{ action, details, ip, userAgent, timestamp: new Date() }],
          $slice: -200 // Keep only the latest 200 logs
        }
      }
    });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
};

export const logLogin = async (
  userId: string, 
  ip?: string, 
  userAgent?: string
) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        loginHistory: {
          $each: [{ ip, userAgent, timestamp: new Date() }],
          $slice: -50 // Keep only the latest 50 logins
        }
      }
    });
  } catch (error) {
    console.error('Error logging login history:', error);
  }
};
