import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models';
import { AuthRequest } from '../../middleware/auth.middleware';
import { logActivity } from '../../utils/activity';

// 1. Get all employees
export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Create employee
export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, username, email, phone, temporaryPassword, role, permissions, profilePhoto } = req.body;

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const employee = await User.create({
      fullName,
      username,
      email,
      phone,
      password: hashedPassword,
      role,
      permissions: permissions || {},
      profilePhoto,
      status: 'ACTIVE',
    });

    // Log this action
    await logActivity(
      req.user._id,
      'CREATE_EMPLOYEE',
      `Created employee account for ${username} (${fullName})`
    );

    const result = employee.toObject();
    delete result.password;

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Edit employee
export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role, permissions, profilePhoto } = req.body;

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (fullName) employee.fullName = fullName;
    if (email !== undefined) employee.email = email;
    if (phone !== undefined) employee.phone = phone;
    if (role) employee.role = role;
    if (permissions) employee.permissions = permissions;
    if (profilePhoto !== undefined) employee.profilePhoto = profilePhoto;

    await employee.save();

    // Log this action
    await logActivity(
      req.user._id,
      'UPDATE_EMPLOYEE',
      `Updated employee account details for ${employee.username}`
    );

    res.json({ message: 'Employee updated successfully', employee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete employee
export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user._id.toString() === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await User.findByIdAndDelete(id);

    // Log this action
    await logActivity(
      req.user._id,
      'DELETE_EMPLOYEE',
      `Deleted employee account: ${employee.username}`
    );

    res.json({ message: 'Employee deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Activate/Deactivate Employee
export const toggleEmployeeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'INACTIVE'

    if (req.user._id.toString() === id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.status = status;
    await employee.save();

    // Log this action
    await logActivity(
      req.user._id,
      status === 'ACTIVE' ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
      `${status === 'ACTIVE' ? 'Activated' : 'Deactivated'} employee account: ${employee.username}`
    );

    res.json({ message: `Employee status set to ${status} successfully`, employee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Reset password
export const resetEmployeePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    employee.password = await bcrypt.hash(newPassword, 10);
    await employee.save();

    // Log this action
    await logActivity(
      req.user._id,
      'RESET_PASSWORD_EMPLOYEE',
      `Reset password for employee account: ${employee.username}`
    );

    res.json({ message: 'Employee password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Get history
export const getEmployeeHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await User.findById(id).select('username fullName activityLog loginHistory');
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({
      activityLog: employee.activityLog || [],
      loginHistory: employee.loginHistory || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
