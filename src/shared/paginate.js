// Cursor-based pagination (not offset-based)
export const paginate = async (Model, query, { cursor, limit = 20, sort = { _id: -1 } } = {}) => {
  const filter = { ...query };
  if (cursor) {
    const direction = sort[Object.keys(sort)[0]] === -1 ? '$lt' : '$gt';
    filter._id = { [direction]: cursor };
  }

  const docs = await Model.find(filter).sort(sort).limit(limit + 1);
  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  return {
    data: docs,
    meta: {
      hasMore,
      nextCursor: hasMore ? docs[docs.length - 1]._id : null,
    },
  };
};
