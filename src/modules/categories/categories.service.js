import { Category } from '../../models/Category.js';
import { ApiError } from '../../shared/ApiError.js';

/**
 * Creates a new category for the user.
 */
export const createCategory = async (userId, data) => {
  const categoryData = {
    ...data,
    userId,
    isSystem: false,
  };

  if (data.parentId) {
    const parent = await Category.findOne({ _id: data.parentId, $or: [{ userId }, { userId: null }] });
    if (!parent) {
      throw ApiError.badRequest('Parent category not found or not accessible');
    }
  }

  const category = await Category.create(categoryData);
  return category;
};

/**
 * Returns a list of categories accessible to the user.
 * Includes system categories by default.
 */
export const listCategories = async (userId, filters = {}) => {
  const { type, parentId, includeSystem = true } = filters;

  const query = {
    $or: [
      { userId },
    ],
  };

  if (includeSystem) {
    query.$or.push({ userId: null, isSystem: true });
  }

  if (type) {
    query.type = type;
  }

  if (parentId !== undefined) {
    query.parentId = parentId;
  }

  const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 });
  return categories;
};

/**
 * Returns a single category by ID, scoped to accessibility.
 */
export const getCategory = async (userId, categoryId) => {
  const category = await Category.findOne({
    _id: categoryId,
    $or: [{ userId }, { userId: null }],
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  return category;
};

/**
 * Updates a user's category. System categories cannot be updated.
 */
export const updateCategory = async (userId, categoryId, data) => {
  const category = await Category.findOne({ _id: categoryId, userId });

  if (!category) {
    const systemCategory = await Category.findOne({ _id: categoryId, userId: null });
    if (systemCategory) {
      throw ApiError.forbidden('System categories cannot be updated');
    }
    throw ApiError.notFound('Category not found');
  }

  if (data.parentId) {
    const parent = await Category.findOne({ _id: data.parentId, $or: [{ userId }, { userId: null }] });
    if (!parent) {
      throw ApiError.badRequest('Parent category not found or not accessible');
    }
    if (String(data.parentId) === String(categoryId)) {
      throw ApiError.badRequest('A category cannot be its own parent');
    }
  }

  Object.assign(category, data);
  await category.save();

  return category;
};

/**
 * Deletes a user's category. System categories cannot be deleted.
 */
export const deleteCategory = async (userId, categoryId) => {
  const category = await Category.findOne({ _id: categoryId, userId });

  if (!category) {
    const systemCategory = await Category.findOne({ _id: categoryId, userId: null });
    if (systemCategory) {
      throw ApiError.forbidden('System categories cannot be deleted');
    }
    throw ApiError.notFound('Category not found');
  }

  // Check if it has children
  const childrenCount = await Category.countDocuments({ parentId: categoryId });
  if (childrenCount > 0) {
    throw ApiError.badRequest('Cannot delete category with sub-categories. Delete sub-categories first.');
  }

  await category.deleteOne();
};
