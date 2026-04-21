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
    'housing',
    'gifts',
    'other_exp',
  ],
  income: [
    'salary',
    'bonus',
    'investment_inc',
    'other_inc',
  ],
  transfer: ['transfer'],
};

export const ALL_TRANSACTION_CATEGORY_KEYS = [
  ...TRANSACTION_CATEGORY_KEYS.expense,
  ...TRANSACTION_CATEGORY_KEYS.income,
  ...TRANSACTION_CATEGORY_KEYS.transfer,
];
