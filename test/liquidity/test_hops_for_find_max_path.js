const strictSame = require('node:assert').strict.deepStrictEqual;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const hopsForFindMaxPath = require('./../../liquidity/hops_for_find_max_path');

const makeArgs = overrides => {
  const args = {
    channels: [],
    hops: [],
    probes: [],
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({}),
    description: 'No hops returns no hops',
    expected: {},
  },
  {
    args: makeArgs({
      channels: [{
        id: '0x0x1',
        is_active: true,
        local_balance: 1,
        partner_public_key: '00',
      }],
      hops: [{channel: '0x0x1', public_key: '00'}],
    }),
    description: 'A hop returns hops and max',
    expected: {
      hops: [{channel: '0x0x1', public_key: '00'}],
      max: 1,
    },
  },
  {
    args: makeArgs({
      channels: [
        {
          id: '0x0x1',
          is_active: false,
          local_balance: 1,
          partner_public_key: '00',
        },
        {
          id: '0x0x2',
          is_active: true,
          local_balance: 0,
          partner_public_key: '00',
        },
        {
          id: '0x0x3',
          is_active: true,
          local_balance: 1,
          partner_public_key: '01',
        },
        {
          id: '0x0x4',
          is_active: true,
          local_balance: 1,
          partner_public_key: '00',
        },
        {
          id: '0x0x5',
          is_active: true,
          local_balance: 3,
          partner_public_key: '00',
        },
        {
          id: '0x0x6',
          is_active: true,
          local_balance: 2,
          partner_public_key: '00',
        },
        {
          id: '0x0x7',
          is_active: true,
          local_balance: 2,
          partner_public_key: '00',
        },
      ],
      hops: [{channel: '0x0x1', public_key: '00'}],
      probes: [['0x0x10']],
    }),
    description: 'Hop selection ignores inactive, no-balance, wrong pubkeys',
    expected: {
      hops: [{channel: '0x0x5', public_key: '00'}],
      max: 3,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => hopsForFindMaxPath(args), new Error(error), 'Got error');
    } else {
      const res = hopsForFindMaxPath(args);

      strictSame(res, expected, 'Got expected result');
    }

    return end();
  });
});
