const {rejects} = require('node:assert').strict;
const strictSame = require('node:assert').strict.deepStrictEqual;
const test = require('node:test');

const {channels} = require('./../fixtures/hop_hints');
const {getPoliciesForChannels} = require('./../../graph');

const makeLnd = ({}) => {
  return {
    default: {
      getChanInfo: (args, cbk) => {
        if (args.chan_id === '5') {
          return cbk('err');
        }

        return cbk(null, {
          capacity: '1',
          chan_point: '1:1',
          channel_id: 1,
          node1_policy: {
            disabled: false,
            fee_base_msat: '1',
            fee_rate_milli_msat: '1',
            last_update: 1,
            max_htlc_msat: (21e8).toString(),
            min_htlc: '1',
            time_lock_delta: 1,
          },
          node1_pub: 'a',
          node2_policy: {
            disabled: false,
            fee_base_msat: '2',
            fee_rate_milli_msat: '2',
            last_update: 2,
            max_htlc_msat: (21e8).toString(),
            min_htlc: '2',
            time_lock_delta: 2,
          },
          node2_pub: 'b',
        });
      },
    },
  };
};

const makeArgs = overrides => {
  const args = {
    channels,
    hops: [{channel: '0x0x1', public_key: 'b'}],
    lnd: makeLnd({}),
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({channels: undefined}),
    description: 'An array of known channels is required',
    error: [400, 'ExpectedKnownChannelsToGetPoliciesForChannels'],
  },
  {
    args: makeArgs({hops: undefined}),
    description: 'Hops are required',
    error: [400, 'ExpectedHopsSeriesToGetPoliciesForChannels'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndObjectToGetPoliciesForCHannels'],
  },
  {
    args: makeArgs({lnd: {default: {getChanInfo: ({}, cbk) => cbk('err')}}}),
    description: 'LND errors are passed back',
    error: [503, 'UnexpectedGetChannelInfoError', {err: 'err'}],
  },
  {
    args: makeArgs({}),
    description: 'Policies are returned for channels',
    expected: {
      channels: [{
        capacity: 1,
        destination: 'b',
        id: '0x0x1',
        policies: [
          {
            base_fee_mtokens: '1',
            cltv_delta: 1,
            fee_rate: 1,
            is_disabled: false,
            max_htlc_mtokens: '2100000000',
            min_htlc_mtokens: '1',
            public_key: 'a',
            updated_at: '1970-01-01T00:00:01.000Z',
          },
          {
            base_fee_mtokens: '2',
            cltv_delta: 2,
            fee_rate: 2,
            is_disabled: false,
            max_htlc_mtokens: '2100000000',
            min_htlc_mtokens: '2',
            public_key: 'b',
            updated_at: '1970-01-01T00:00:02.000Z',
          },
        ],
      }],
    },
  },
  {
    args: makeArgs({
      channels: [{
        capacity: 1,
        destination: 'a',
        id: '0x0x5',
        policies: [
          {
            base_fee_mtokens: '1',
            cltv_delta: 1,
            fee_rate: 1,
            public_key: '0',
          },
          {
            public_key: 'a',
          },
        ],
      }],
      hops: [
        {channel: '0x0x5', public_key: 'a'},
        {channel: '0x0x2', public_key: 'b'},
      ],
    }),
    description: 'Hop hints create simulated channels',
    expected: {
      channels: [
        {
          capacity: 1,
          destination: 'a',
          id: '0x0x5',
          policies: [
            {
              base_fee_mtokens: '1',
              cltv_delta: 1,
              fee_rate: 1,
              public_key: '0',
            },
            {
              public_key: 'a',
            },
          ],
        },
        {
          capacity: 1,
          destination: 'b',
          id: '0x0x2',
          policies: [
            {
              base_fee_mtokens: '1',
              cltv_delta: 1,
              fee_rate: 1,
              is_disabled: false,
              max_htlc_mtokens: '2100000000',
              min_htlc_mtokens: '1',
              public_key: 'a',
              updated_at: '1970-01-01T00:00:01.000Z',
            },
            {
              base_fee_mtokens: '2',
              cltv_delta: 2,
              fee_rate: 2,
              is_disabled: false,
              max_htlc_mtokens: '2100000000',
              min_htlc_mtokens: '2',
              public_key: 'b',
              updated_at: '1970-01-01T00:00:02.000Z',
            },
          ],
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getPoliciesForChannels(args), error, 'Got expected error');
    } else {
      const {channels} = await getPoliciesForChannels(args);

      strictSame(channels, expected.channels, 'Got expected channels');
    }

    return;
  });
});
