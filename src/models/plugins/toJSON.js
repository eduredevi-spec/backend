import mongoose from "mongoose";

/**
 * Recursively converts Decimal128 values to strings so they serialise
 * correctly in JSON responses instead of appearing as { $numberDecimal: "..." }.
 */
const convertDecimal128 = (obj) => {
  if (!obj || typeof obj !== "object" || obj instanceof Date) return;
  if (Array.isArray(obj)) {
    obj.forEach(convertDecimal128);
    return;
  }
  for (const key of Object.keys(obj)) {
    if (obj[key] instanceof mongoose.Types.Decimal128) {
      obj[key] = obj[key].toString();
    } else if (Array.isArray(obj[key])) {
      obj[key].forEach(convertDecimal128);
    } else if (
      obj[key] &&
      typeof obj[key] === "object" &&
      !(obj[key] instanceof Date)
    ) {
      convertDecimal128(obj[key]);
    }
  }
};

/**
 * Mongoose plugin applied to every schema.
 * - Converts all Decimal128 fields (including nested / array) to strings.
 * - Strips __v from all responses.
 */
export const toJSONPlugin = (schema) => {
  schema.set("toJSON", {
    transform: (_doc, ret) => {
      convertDecimal128(ret);
      delete ret.__v;
      return ret;
    },
  });
};
