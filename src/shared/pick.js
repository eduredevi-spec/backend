/**
 * Returns a new object containing only the specified keys from the source object.
 * Useful for filtering req.query or req.body to only the fields you want.
 *
 * @param {object}   obj  - Source object
 * @param {string[]} keys - Keys to pick
 * @returns {object}
 *
 * @example
 * pick(req.query, ['page', 'limit', 'sort'])
 */
export const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};
