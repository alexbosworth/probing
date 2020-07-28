const {test} = require('@alexbosworth/tap');

const {getChanInfoResponse} = require('./../fixtures');
const {getInfoResponse} = require('./../fixtures');
const getRouteForPayment = require('./../../payments/get_route_for_payment');

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));

const makeLnd = overrides => {
  const lnd = {
    default: {
      getChanInfo: ({}, cbk) => cbk(null, getChanInfoResponse),
      getInfo: ({}, cbk) => cbk(null, getInfoRes()),
    },
    router: {
      buildRoute: ({}, cbk) => cbk('err'),
    },
  };

  Object.keys(overrides).forEach(key => lnd[key] = overrides[key]);

  return lnd;
};

const makeArgs = overrides => {
  const args = {
    cltv_delta: 1,
    destination: 'b',
    lnd: makeLnd({}),
    mtokens: '1',
    path: {channels: ['0x0x1'], relays: ['a']},
    payment: Buffer.alloc(32).toString('hex'),
    total_mtokens: '1',
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const makeExpected = overrides => {
  const expected = {
    fee: 0,
    fee_mtokens: '0',
    hops: [{
      channel: '0x0x1',
      channel_capacity: 1,
      fee: 0,
      fee_mtokens: '0',
      forward: 0,
      forward_mtokens: '1',
      public_key: 'a',
      timeout: 2,
    }],
    messages: undefined,
    mtokens: '1',
    payment: Buffer.alloc(32).toString('hex'),
    timeout: 2,
    tokens: 0,
    total_mtokens: '1',
  }

  Object.keys(overrides).forEach(key => expected[key] = overrides[key]);

  return expected;
};

const tests = [
  {
    args: makeArgs({cltv_delta: undefined}),
    description: 'A final CLTV delta is required',
    error: [400, 'ExpectedFinalCltvDeltaToGetRouteForPayment'],
  },
  {
    args: makeArgs({destination: undefined}),
    description: 'A destination is required',
    error: [400, 'ExpectedDestinationToGetRouteForPayment'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND object is required',
    error: [400, 'ExpectedLndToGetRouteForPayment'],
  },
  {
    args: makeArgs({mtokens: undefined}),
    description: 'Mtokens for route is required',
    error: [400, 'ExpectedMillitokensToGetRouteForPayment'],
  },
  {
    args: makeArgs({path: undefined}),
    description: 'A path is required',
    error: [400, 'ExpectedPaymentPathToGetRouteForPayment'],
  },
  {
    args: makeArgs({path: [{}]}),
    description: 'The supplied path must include channels',
    error: [400, 'ExpectedArrayOfChannelsInPath'],
  },
  {
    args: makeArgs({payment: undefined}),
    description: 'A payment identifer is required',
    error: [400, 'ExpectedPaymentIdentifierToGetRouteForPayment'],
  },
  {
    args: makeArgs({routes: {}}),
    description: 'When routes are specified, they must be an array',
    error: [400, 'ExpectedRoutesArrayToGetRouteForPayment'],
  },
  {
    args: makeArgs({total_mtokens: undefined}),
    description: 'Total mtokens is required',
    error: [400, 'ExpectedTotalMillitokensToGetRouteForPayment'],
  },
  {
    args: makeArgs({}),
    description: 'A route is returned for the payment',
    expected: makeExpected({}),
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        router: {
          buildRoute: ({}, cbk) => cbk(null, {
            route: {
              hops: [{
                amt_to_forward_msat: '1',
                chan_capacity: 1,
                chan_id: 1,
                custom_records: {},
                expiry: 2,
                fee_msat: '0',
                pub_key: 'a',
              }],
              total_amt: '1',
              total_amt_msat: '1',
              total_fees: '0',
              total_fees_msat: '0',
              total_time_lock: 2,
            },
          }),
        },
      }),
    }),
    description: 'Build route returns back derivation',
    expected: makeExpected({
      confidence: undefined,
      messages: [],
      safe_fee: 0,
      safe_tokens: 1,
    }),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      await rejects(getRouteForPayment(args), error, 'Got expected error');
    } else {
      const route = await getRouteForPayment(args);

      deepIs(route, expected, 'Got expected route');
    }

    return end();
  });
});
