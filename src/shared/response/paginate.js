/**
 * Parse pagination params from query string
 * Usage: const {skip, take, page, limit} = getPagination(req.query)
 */
export const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 10); // cap at 100
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
};

/**
 * Build paginated response meta
 * Usage: paginateMeta(total, page, limit)
 */
export const paginateMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
};

/**
 * All-in-one paginated prisma query
 * Usage: const result = await paginate(prisma.student, { where: { schoolId } }, query)
 */
export const paginate = async (module, args = {}, query = {}) => {
  const { page, limit, skip, take } = getPagination(query);

  const [data, total] = await Promise.all([
    module.findMany({ ...args, skip, take }),
    module.count({ where: args.where }),
  ]);

  return {
    data,
    meta: paginateMeta(total, page, limit),
  };
};
