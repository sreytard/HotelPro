// Reads ?page=&limit= from the request
const pageParams = (req, defaultLimit = 10, max = 50) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || defaultLimit, 1), max);
  return { page, limit, skip: (page - 1) * limit };
};

// Standard paginated response shape
const pageResult = (items, total, page, limit) => ({
  items,
  total,
  page,
  pages: Math.max(Math.ceil(total / limit), 1),
});

// Escapes user text so it can be used safely inside a RegExp search
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { pageParams, pageResult, escapeRegex };
