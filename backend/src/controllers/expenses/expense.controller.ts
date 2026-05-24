import { Request, Response } from 'express';
import { Expense } from '../../models';

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await Expense.find({}).sort({ date: -1 });
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
