const {test} = require('@alexbosworth/tap');

const method = require('./../../payments/mtokens_for_multi_path_payment');

const makeArgs = overrides => {
  const args = {};

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: {failed: [], liquidity: 1e6, paying: [], total: (1e6).toString()},
    description: 'Initial payment selects appropriate liquidity',
    expected: {mtokens: (1e6).toString()},
  },
  {
    args: {failed: [], liquidity: 1e4, paying: [], total: (1e6).toString()},
    description: 'Payment is locked down to the liquidity available',
    expected: {mtokens: (1e4).toString()},
  },
  {
    args: {failed: [], liquidity: 1e6, paying: [], total: (1e10).toString()},
    description: 'Payment is locked down to the total needed',
    expected: {mtokens: (1e6).toString()},
  },
  {
    args: {
      failed: [],
      liquidity: 1e6,
      paying: [{id: 0, mtokens: (1e3).toString()}],
      total: (1e6).toString(),
    },
    description: 'An existing payment in flight lowers the payment',
    expected: {mtokens: (1e3).toString()},
  },
  {
    args: {
      failed: [0],
      liquidity: 1e6,
      paying: [{id: 0, mtokens: (1e3).toString()}],
      total: (1e6).toString(),
    },
    description: 'A failed payment does not lower the payment',
    expected: {mtokens: (1e6).toString()},
  },
  {
    args: {
      failed: [],
      liquidity: 1e6,
      paying: [{id: 0, mtokens: (1e6).toString()}],
      total: (1e6).toString(),
    },
    description: 'A payment in progress does not need additional mtokens',
    expected: {},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => method(args), error, 'Got expected error');
    } else {
      const {sorted} = method(args);

      deepIs(sorted, expected.sorted);
    }

    return end();
  });
});
