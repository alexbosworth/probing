const {test} = require('tap');

const method = require('./../../payments/sort_multiple_payment_paths');

const makeArgs = overrides => {
  const args = {};

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: {
      paths: [
        {channels: [], fee: 1, liquidity: 1e6},
        {channels: [], fee: 1, liquidity: 1e6},
      ],
    },
    description: 'Everything equal means no change',
    expected: {
      sorted: [{channels: [], fee: 1, liquidity: 1e6}, {channels: [], fee: 1, liquidity: 1e6}],
    },
  },
  {
    args: {
      paths: [{fee: 2, liquidity: 1e6}, {fee: 1, liquidity: 1e6}],
    },
    description: 'Cheapest liquidity wins',
    expected: {
      sorted: [{fee: 1, liquidity: 1e6}, {fee: 2, liquidity: 1e6}],
    },
  },
  {
    args: {
      paths: [{fee: 1, liquidity: 1e6}, {fee: 2, liquidity: 2e6}],
    },
    description: 'Most liquidity wins after equal fees',
    expected: {
      sorted: [{fee: 2, liquidity: 2e6}, {fee: 1, liquidity: 1e6}],
    },
  },
  {
    args: {
      paths: [
        {
          channels: [{}, {}],
          fee: 1,
          liquidity: 2e6,
        },
        {
          channels: [{}],
          fee: 1,
          liquidity: 2e6,
        },
      ],
    },
    description: 'Fewest channels wins after liquidity, fees',
    expected: {
      sorted: [
        {
          channels: [{}],
          fee: 1,
          liquidity: 2e6,
        },
        {
          channels: [{}, {}],
          fee: 1,
          liquidity: 2e6,
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => method(args), error, 'Got expected error');
    } else {
      const {sorted} = method(args);

      deepIs(sorted, expected.sorted, 'Paths are sorted as expected');

      const paths = args.paths.slice().reverse();

      const resorted = method({paths});

      deepIs(resorted.sorted, expected.sorted, 'Reversed paths still sort');
    }

    return end();
  });
});
