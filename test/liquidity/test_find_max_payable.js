const {rejects} = require('node:assert').strict;
const strictSame = require('node:assert').strict.deepStrictEqual;
const test = require('node:test');

const findMaxPayable = require('./../../liquidity/find_max_payable');
const {getInfoResponse} = require('./../fixtures');

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));

const makeArgs = overrides => {
  const args = {
    cltv: 1,
    delay: 1,
    hops: [{channel: '0x0x0', public_key: 'a'}],
    emitter: {emit: () => {}},
    lnd: {
      default: {
        deletePayment: ({}, cbk) => cbk(),
        getChanInfo: ({channel}, cbk) => cbk(null, {
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
        }),
        getInfo: ({}, cbk) => cbk(null, getInfoRes()),
      },
      router: {
        buildRoute: ({}, cbk) => cbk('err'),
        sendToRouteV2: (args, cbk) => {
          return cbk(null, {
            failure: {code: 'UNKNOWN_PAYMENT_HASH'},
          });
        },
      },
    },
    max: 1e6,
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({cltv: undefined}),
    description: 'A final cltv is required',
    error: [400, 'ExpectedFinalCltvToFindMaxPayable'],
  },
  {
    args: makeArgs({hops: undefined}),
    description: 'Hops are required',
    error: [400, 'ExpectedArrayOfHopsToFindMaxPayable'],
  },
  {
    args: makeArgs({hops: [{}]}),
    description: 'Hops require channels',
    error: [400, 'ExpectedChannelsInHopsToFindMaxPayable'],
  },
  {
    args: makeArgs({hops: [{channel: '0x0x0'}]}),
    description: 'Hops require public keys',
    error: [400, 'ExpectedPublicKeyInHopsToFindMaxPayable'],
  },
  {
    args: makeArgs({emitter: undefined}),
    description: 'Emitter is required to find max routable',
    error: [400, 'ExpectedEmitterToFindMaxPayable'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required to find max routable',
    error: [400, 'ExpectedLndToFindMaxPayableAmount'],
  },
  {
    args: makeArgs({max: undefined}),
    description: 'Max limit is required to find max routable',
    error: [400, 'ExpectedMaxLimitTokensToFindMaxPayable'],
  },
  {
    args: {
      cltv: 1,
      hops: [{channel: '0x0x0', public_key: 'a'}],
      lnd: {default: {getChanInfo: ({channel}, cbk) => cbk('err')}},
      emitter: {emit: () => {}},
      max: 1e6,
    },
    description: 'Get channel errors are passed back',
    error: [503, 'UnexpectedGetChannelInfoError', {err: 'err'}],
  },
  {
    args: makeArgs({}),
    description: 'Get maximum finds rough maximum',
    expected: {maximum: 999000},
  },
  {
    args: {
      cltv: 1,
      delay: 1,
      hops: [{channel: '0x0x0', public_key: 'a'}],
      emitter: {emit: () => {}},
      lnd: {
        default: {
          deletePayment: ({}, cbk) => cbk(),
          getChanInfo: ({channel}, cbk) => cbk(null, {
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
          }),
          getInfo: ({}, cbk) => cbk('err'),
        },
        router: {
          sendToRouteV2: ({}, cbk) => cbk(null, {
            failure: {code: 'UNKNOWN_PAYMENT_HASH'},
          }),
        },
      },
      max: 1e6,
    },
    description: 'Get maximum reports back wallet info errors',
    error: [503, 'GetWalletInfoErr', {err: 'err'}],
  },
  {
    args: {
      cltv: 1,
      delay: 1,
      hops: [{channel: '0x0x0', public_key: 'a'}],
      emitter: {emit: () => {}},
      lnd: {
        default: {
          deletePayment: ({}, cbk) => cbk(),
          getChanInfo: ({channel}, cbk) => cbk(null, {
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
          }),
          getInfo: ({}, cbk) => cbk(null, getInfoRes()),
        },
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRouteV2: ({}, cbk) => cbk(null, {
            failure: {code: 'TEMPORARY_CHANNEL_FAILURE'},
          }),
        },
      },
      max: 1e6,
    },
    description: 'Get maximum fails to find any route',
    expected: {},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(findMaxPayable(args), error, 'Got expected error');
    } else if (expected.maximum) {
      const {maximum} = await findMaxPayable(args);

      strictSame(maximum > expected.maximum - 100000, true, 'Got maximum');
    } else {
      const {maximum} = await findMaxPayable(args);

      strictSame(maximum, Number(), 'Max payable is zero');
    }

    return;
  });
});
