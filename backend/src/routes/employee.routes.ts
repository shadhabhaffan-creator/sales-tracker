import { Router } from 'express';
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  toggleEmployeeStatus, 
  resetEmployeePassword, 
  getEmployeeHistory 
} from '../controllers/employees/employee.controller';
import { protect, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, requirePermission(['manageTeamMembers', 'createEmployeeAccounts', 'createLeads', 'editLeads']), getEmployees);
router.post('/', protect, requirePermission('createEmployeeAccounts'), createEmployee);
router.put('/:id', protect, requirePermission('manageTeamMembers'), updateEmployee);
router.delete('/:id', protect, requirePermission('manageTeamMembers'), deleteEmployee);
router.put('/:id/status', protect, requirePermission('manageTeamMembers'), toggleEmployeeStatus);
router.put('/:id/password', protect, requirePermission('manageTeamMembers'), resetEmployeePassword);
router.get('/:id/history', protect, requirePermission('manageTeamMembers'), getEmployeeHistory);

export default router;
