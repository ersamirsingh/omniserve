import type { PaginationQuery } from '../types/index.js';

export const normalizePagination = (query: PaginationQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const skip = (page - 1) * limit;

  return { page, limit, sortBy, sortOrder, skip };
};
