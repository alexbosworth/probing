const {rejects} = require('node:assert').strict;
const strictSame = require('node:assert').strict.deepStrictEqual;
const test = require('node:test');

const {getInfoResponse} = require('./../fixtures');
const isRoutePayable = require('./../../routing/is_route_payable');

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));

const tests = [
  {
    args: {},
    description: 'An array of channels for the route is required',
    error: [400, 'ExpectedArrayOfChannelsToTestRoutePayable'],
  },
  {
    args: {channels: []},
    description: 'A final cltv delta is required',
    error: [400, 'ExpectedFinalCltvDeltaToTestRoutePayable'],
  },
  {
    args: {channels: [], cltv: 1},
    description: 'LND object is required',
    error: [400, 'ExpectedLndToTestRoutePayable'],
  },
  {
    args: {channels: [], cltv: 1, lnd: {}},
    description: 'Tokens are required',
    error: [400, 'ExpectedMTokensOrTokensToTestRoutePayable'],
  },
  {
    args: {
      channels: [{
        capacity: 1,
        destination: 'b',
        id: '0x0x0',
        policies: [
          {
            base_fee_mtokens: '1',
            cltv_delta: 1,
            fee_rate: 1,
            is_disabled: false,
            min_htlc_mtokens: '1',
            public_key: 'a',
          },
          {
            base_fee_mtokens: '2',
            cltv_delta: 2,
            fee_rate: 2,
            is_disabled: false,
            min_htlc_mtokens: '2',
            public_key: 'b',
          },
        ],
      }],
      cltv: 1,
      lnd: {
        default: {
          deletePayment: ({}, cbk) => cbk(),
          getInfo: ({}, cbk) => cbk(null, getInfoRes()),
        },
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRouteV2: ({}, cbk) => cbk(null, {
            failure: {code: 'INCORRECT_CLTV_EXPIRY'},
          },
        )},
      },
      tokens: 1,
    },
    description: 'An incorrect CLTV is not expected',
    error: [503, 'UnexpectedErrorCode'],
  },
  {
    args: {
      channels: [{
        capacity: 1,
        destination: 'b',
        id: '0x0x0',
        policies: [
          {
            base_fee_mtokens: '1',
            cltv_delta: 1,
            fee_rate: 1,
            is_disabled: false,
            min_htlc_mtokens: '1',
            public_key: 'a',
          },
          {
            base_fee_mtokens: '2',
            cltv_delta: 2,
            fee_rate: 2,
            is_disabled: false,
            min_htlc_mtokens: '2',
            public_key: 'b',
          },
        ],
      }],
      cltv: 1,
      lnd: {
        default: {
          deletePayment: ({}, cbk) => cbk(),
          getInfo: ({}, cbk) => cbk(null, getInfoRes()),
        },
        router: {
          buildRoute: ({}, cbk) => cbk(null, {
            route: {
              hops: [{
                amt_to_forward_msat: '1',
                chan_capacity: '1',
                chan_id: '1',
                expiry: 1,
                fee_msat: '1',
                pub_key: 'b',
              }],
              total_amt: 1,
              total_amt_msat: '1',
              total_fees: '1',
              total_fees_msat: '1',
              total_time_lock: 1,
            },
          }),
          sendToRoute: ({}, cbk) => setTimeout(() => cbk('err'), 10),
        },
      },
      timeout: 1,
      tokens: 1,
    },
    description: 'Errors means payment is not possible',
    expected: {is_payable: false},
  },
  {
    args: {
      channels: [{
        capacity: 1,
        destination: 'b',
        id: '0x0x0',
        policies: [
          {
            base_fee_mtokens: '1',
            cltv_delta: 1,
            fee_rate: 1,
            is_disabled: false,
            min_htlc_mtokens: '1',
            public_key: 'a',
          },
          {
            base_fee_mtokens: '2',
            cltv_delta: 2,
            fee_rate: 2,
            is_disabled: false,
            min_htlc_mtokens: '2',
            public_key: 'b',
          },
        ],
      }],
      cltv: 1,
      lnd: {
        default: {
          deletePayment: ({}, cbk) => cbk(),
          getInfo: ({}, cbk) => cbk(null, getInfoRes()),
        },
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRouteV2: ({}, cbk) => cbk(null, {
            failure: {code: 'UNKNOWN_PAYMENT_HASH'},
          },
        )},
      },
      tokens: 1,
    },
    description: 'Unknown hash means payment is possible',
    expected: {is_payable: true},
  },
  {
    args: {
      channels: [{
        capacity: 1,
        destination: 'b',
        id: '0x0x0',
        policies: [
          {
            base_fee_mtokens: '1',
            cltv_delta: 1,
            fee_rate: 1,
            is_disabled: false,
            min_htlc_mtokens: '1',
            public_key: 'a',
          },
          {
            base_fee_mtokens: '2',
            cltv_delta: 2,
            fee_rate: 2,
            is_disabled: false,
            min_htlc_mtokens: '2',
            public_key: 'b',
          },
        ],
      }],
      cltv: 1,
      lnd: {default: {getInfo: ({}, cbk) => cbk(null, getInfoRes())}},
      tokens: 1,
    },
    description: 'Invoice is not payable',
    expected: {is_payable: false},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(isRoutePayable(args), error, 'Got expected error');
    } else {
      const payable = await isRoutePayable(args);

      strictSame(payable.is_payable, expected.is_payable, 'Got is_payable');
    }

    return;
  });
});
