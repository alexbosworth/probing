const {test} = require('tap');

const {maxHtlcAcrossRoute} = require('./../../graph');

const makeArgs = overrides => {
  const args = {};

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: {
      channels: [
        {
          destination: 'b',
          policies: [
            {max_htlc_mtokens: '5', public_key: 'a'},
            {max_htlc_mtokens: '1', public_key: 'b'},
          ],
        },
        {
          destination: 'c',
          policies: [
            {max_htlc_mtokens: '10', public_key: 'b'},
            {max_htlc_mtokens: '1', public_key: 'c'},
          ],
        },
      ],
    },
    description: 'The max HTLC size is calculated across a route',
    expected: {max_htlc_mtokens: '5', max_htlc_tokens: 0},
  },
  {
    args: {
      channels: [
        {
          capacity: 5,
          destination: 'b',
          policies: [{public_key: 'a'}, {public_key: 'b'}],
        },
        {
          capacity: 10,
          destination: 'c',
          policies: [{public_key: 'b'}, {public_key: 'c'}],
        },
      ],
    },
    description: 'The max HTLC size when there is no max htlc',
    expected: {max_htlc_mtokens: '5000', max_htlc_tokens: 5},
  },
  {
    args: {
      channels: [
        {
          destination: 'b',
          policies: [{public_key: 'a'}, {public_key: 'b'}],
        },
        {
          destination: 'c',
          policies: [{public_key: 'b'}, {public_key: 'c'}],
        },
      ],
    },
    description: 'The max HTLC size when there is no capacity or max htlc',
    expected: {
      max_htlc_mtokens: '9007199254740991',
      max_htlc_tokens: 9007199254740,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => maxHtlcAcrossRoute(args), error, 'Got expected error');
    } else {
      const max = maxHtlcAcrossRoute(args);

      deepIs(max, expected, 'Got expected maximum HTLC size across route');
    }

    return end();
  });
});
