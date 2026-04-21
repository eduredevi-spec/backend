import * as billsService from './bills.service.js';
import * as ApiResponse from '../../shared/ApiResponse.js';
import { catchAsync } from '../../shared/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const bill = await billsService.createBill(req.user.id, req.body);
  return ApiResponse.created(res, { data: bill, message: 'Bill created' });
});

export const list = catchAsync(async (req, res) => {
  const bills = await billsService.listBills(req.user.id, req.query);
  return ApiResponse.success(res, { data: bills });
});

export const update = catchAsync(async (req, res) => {
  const bill = await billsService.updateBill(req.user.id, req.params.id, req.body);
  return ApiResponse.success(res, { data: bill, message: 'Bill updated' });
});

export const remove = catchAsync(async (req, res) => {
  await billsService.deleteBill(req.user.id, req.params.id);
  return ApiResponse.noContent(res);
});

export const markAsPaid = catchAsync(async (req, res) => {
  const bill = await billsService.markAsPaid(req.user.id, req.params.id);
  return ApiResponse.success(res, { data: bill, message: 'Bill marked as paid' });
});
