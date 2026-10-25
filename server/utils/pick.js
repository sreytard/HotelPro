// Copies only the allowed keys from an object (prevents mass-assignment)
module.exports = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
