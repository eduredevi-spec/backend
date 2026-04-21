import { catchAsync } from '../../shared/catchAsync.js';
import * as ApiResponse from '../../shared/ApiResponse.js';
import * as categoriesService from './categories.service.js';

export const create = catchAsync(async (req, res) => {
  const category = await categoriesService.createCategory(req.user._id, req.body);
  return ApiResponse.created(res, { data: category, message: 'Category created' });
});

export const list = catchAsync(async (req, res) => {
  const categories = await categoriesService.listCategories(
    req.user._id,
    req.validatedQuery ?? req.query
  );
  return ApiResponse.success(res, { data: categories });
});

export const getById = catchAsync(async (req, res) => {
  const category = await categoriesService.getCategory(req.user._id, req.params.id);
  return ApiResponse.success(res, { data: category });
});

export const update = catchAsync(async (req, res) => {
  const category = await categoriesService.updateCategory(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, { data: category, message: 'Category updated' });
});

export const remove = catchAsync(async (req, res) => {
  await categoriesService.deleteCategory(req.user._id, req.params.id);
  return ApiResponse.noContent(res);
});
