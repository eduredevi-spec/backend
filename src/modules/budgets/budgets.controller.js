import { catchAsync } from '../../shared/catchAsync.js';
import * as ApiResponse from '../../shared/ApiResponse.js';
import * as budgetsService from './budgets.service.js';

export const create = catchAsync(async (req, res) => {
  const budget = await budgetsService.createBudget(req.user._id, req.body);
  return ApiResponse.created(res, { data: budget, message: 'Budget saved' });
});

export const list = catchAsync(async (req, res) => {
  const budgets = await budgetsService.listBudgets(req.user._id, req.query);
  return ApiResponse.success(res, { data: budgets });
});

export const remove = catchAsync(async (req, res) => {
  await budgetsService.deleteBudget(req.user._id, req.params.id);
  return ApiResponse.noContent(res);
});
