const strictSame = require('node:assert').strict.deepStrictEqual;
const test = require('node:test');

const method = require('./../../payments/mtokens_for_multi_path_payment');

const tests = [
  {
    args: {liquidity: 1e3, paying: [], total: '1000000'},
    description: 'Initial payment selects the total needed',
    expected: {mtokens: '1000000'},
  },
  {
    args: {liquidity: 1e2, paying: [], total: '1000000'},
    description: 'Payment is limited to the liquidity available',
    expected: {mtokens: '100000'},
  },
  {
    args: {liquidity: 1e6, paying: [], total: '5000'},
    description: 'Payment is limited to the total needed',
    expected: {mtokens: '5000'},
  },
  {
    args: {liquidity: 1e6, paying: [{mtokens: '1000'}], total: '1000000'},
    description: 'An existing payment in flight lowers the payment',
    expected: {mtokens: '999000'},
  },
  {
    args: {liquidity: 1e6, paying: [{mtokens: '1000000'}], total: '1000000'},
    description: 'A payment in progress does not need additional mtokens',
    expected: {},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    strictSame(method(args), expected, 'Got expected result');

    return end();
  });
});
