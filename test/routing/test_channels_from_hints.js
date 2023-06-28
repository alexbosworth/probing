const strictSame = require('node:assert').strict.deepStrictEqual;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const {channels} = require('./../fixtures/hop_hints');
const {channelsFromHints} = require('./../../routing');
const {request} = require('./../fixtures/hop_hints');
const {routes} = require('./../fixtures/hop_hints');

const makeArgs = overrides => {
  const args = {};

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({}),
    description: 'No hints returns no channels',
    expected: {channels: []},
  },
  {
    args: makeArgs({routes: []}),
    description: 'Empty hints returns no channels',
    expected: {channels: []},
  },
  {
    args: makeArgs({request}),
    description: 'Request filled in returns channels',
    expected: {channels},
  },
  {
    args: makeArgs({routes}),
    description: 'Routes filled in returns channels',
    expected: {channels},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!!error) {
      throws(() => findMaxPayable(args), error, 'Got expected error');
    } else {
      const {channels} = channelsFromHints(args);

      strictSame(channels, expected.channels);
    }

    return end();
  });
});
