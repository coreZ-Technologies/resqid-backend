// =============================================================================
// paginate.js — RESQID Pagination Utility
//
// Standardized pagination for all list endpoints.
// =============================================================================

import { ENV } from '#config/env.js';

const DEFAULT_LIMIT = ENV.PAGINATION_DEFAULT_LIMIT || 20;
const MAX_LIMIT = ENV.PAGINATION_MAX_LIMIT || 100;

/**
 * Parse pagination params from query string.
 *
 * @param {Object} query - Express req.query
 * @param {Object} [options] - Override defaults
 * @param {number} [options.defaultLimit] - Default page size
 * @param {number} [options.maxLimit] - Maximum page size
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
export const getPagination = (query, options = {}) => {
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = options.maxLimit || MAX_LIMIT;

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
};

/**
 * Build paginated response meta.
 *
 * @param {number} total - Total number of records
 * @param {number} page - Current page
 * @param {number} limit - Records per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
export const paginateMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * All-in-one paginated Prisma query.
 *
 * @param {Object} model - Prisma model (e.g., prisma.student)
 * @param {Object} [args] - Prisma query args ({ where, include, orderBy, select })
 * @param {Object} [query] - Express req.query or { page, limit }
 * @param {Object} [options] - Pagination options
 * @returns {Promise<{ data: Array, meta: Object }>}
 *
 * @example
 *   const result = await paginate(prisma.teacher, {
 *     where: { schoolId },
 *     include: { wellness: true },
 *     orderBy: { createdAt: 'desc' },
 *   }, req.query);
 */
export const paginate = async (model, args = {}, query = {}, options = {}) => {
  const { page, limit, skip, take } = getPagination(query, options);

  const { where, include, select, orderBy, ...rest } = args;

  const findArgs = {
    ...rest,
    ...(where && { where }),
    ...(include && { include }),
    ...(select && { select }),
    ...(orderBy && { orderBy }),
    skip,
    take,
  };

  const countArgs = where ? { where } : {};

  const [data, total] = await Promise.all([model.findMany(findArgs), model.count(countArgs)]);

  return {
    data,
    meta: paginateMeta(total, page, limit),
  };
};

/**
 * Simple cursor-based pagination (for infinite scroll).
 *
 * @param {Object} model - Prisma model
 * @param {Object} args - Prisma query args with cursor support
 * @param {string} cursor - Last item ID from previous page
 * @param {number} take - Items per page
 * @returns {Promise<{ data: Array, nextCursor: string|null }>}
 */
export const cursorPaginate = async (model, args = {}, cursor = null, take = 20) => {
  const { where, include, orderBy, ...rest } = args;

  const findArgs = {
    ...rest,
    ...(where && { where }),
    ...(include && { include }),
    ...(orderBy && { orderBy }),
    take: take + 1, // Fetch one extra to check if there's a next page
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  };

  const data = await model.findMany(findArgs);

  const hasNext = data.length > take;
  if (hasNext) data.pop(); // Remove the extra item

  return {
    data,
    nextCursor: hasNext ? data[data.length - 1]?.id : null,
  };
};
