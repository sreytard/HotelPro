// Input sanitization: removes keys that start with "$" or contain "." from the body, query and params.
// This blocks NoSQL operator injection such as { "email": { "$ne": null } }.
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
};

module.exports = (req, res, next) => {
  ['body', 'query', 'params'].forEach((k) => {
    if (req[k]) clean(req[k]);
  });
  next();
};
