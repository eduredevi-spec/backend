export const TRANSACTION_CATEGORY_KEYS = {
  expense: [
    'food',
    'transport',
    'shopping',
    'health',
    'utilities',
    'entertainment',
    'education',
    'subscriptions',
  ],
  income: ['income'],
  transfer: ['transfer'],
};

export const ALL_TRANSACTION_CATEGORY_KEYS = [
  ...TRANSACTION_CATEGORY_KEYS.expense,
  ...TRANSACTION_CATEGORY_KEYS.income,
  ...TRANSACTION_CATEGORY_KEYS.transfer,
];
