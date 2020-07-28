const {once} = require('events');
const {promisify} = require('util');

const {test} = require('@alexbosworth/tap');

const {getChanInfoResponse} = require('./../fixtures');
const {getInfoResponse} = require('./../fixtures');
const {subscribeToMultiPathPay} = require('./../../payments');

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));
const nextTick = promisify(process.nextTick);

const makeLnd = overrides => {
  const lnd = {
    default: {
      getChanInfo: ({}, cbk) => cbk(null, getChanInfoResponse),
      getInfo: ({}, cbk) => cbk(null, getInfoRes()),
    },
    router: {
      buildRoute: ({}, cbk) => cbk('err'),
      sendToRoute: ({}, cbk) => cbk(null, {preimage: Buffer.alloc(32)}),
    },
  };

  Object.keys(overrides).forEach(key => lnd[key] = overrides[key]);

  return lnd;
};

const makeArgs = overrides => {
  const args = {
    destination: Buffer.alloc(33).toString('hex'),
    id: Buffer.alloc(32).toString('hex'),
    lnd: makeLnd({}),
    max_fee: 0,
    mtokens: '1',
    paths: [{
      channels: ['0x0x1'],
      fee: 1,
      fee_mtokens: '1000',
      liquidity: 1,
      relays: ['a'],
    }],
    payment: Buffer.alloc(32).toString('hex'),
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({destination: undefined}),
    description: 'A destination is required',
    error: [400, 'ExpectedDestinationToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({id: undefined}),
    description: 'A payment hash is required',
    error: [400, 'ExpectedPaymentHashToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'A LND object is required',
    error: [400, 'ExpectedLndToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({max_fee: undefined}),
    description: 'A max fee is required',
    error: [400, 'ExpectedMaxFeeToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({mtokens: undefined}),
    description: 'Mtokens to pay is required',
    error: [400, 'ExpectedMillitokensToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({paths: undefined}),
    description: 'Paths to pay along is required',
    error: [400, 'ExpectedPathsToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({payment: undefined}),
    description: 'A payment identifier is required',
    error: [400, 'ExpectedPaymentIdentifierToSubscribeToMultiPathPayment'],
  },
  {
    args: makeArgs({}),
    description: 'A payment is made on a single payment path',
    expected: {
      events: [
        {
          data: {
            route: {
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
                timeout: 145,
              }],
              messages: undefined,
              mtokens: '1',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 0,
              total_mtokens: '1',
            }
          },
          event: 'paying',
        },
        {
          data: {
            secret: '0000000000000000000000000000000000000000000000000000000000000000',
          },
          event: 'paid',
        },
        {
          data: {
            success: {
              id: '0000000000000000000000000000000000000000000000000000000000000000',
              route: {
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
                  timeout: 145,
                }],
                messages: undefined,
                mtokens: '1',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 0,
                total_mtokens: '1',
              },
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
                timeout: 145
              }],
              mtokens: '1',
              safe_fee: undefined,
              safe_tokens: undefined,
              secret: '0000000000000000000000000000000000000000000000000000000000000000',
              tokens: 0,
            },
          },
          event: 'path_success',
        },
        {
          data: {},
          event: 'success',
        },
      ],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRoute: (args, cbk) => {
            const [firstHop] = args.route.hops;

            // Fail the route on one of the channels
            if (firstHop.chan_id === '4') {
              return cbk(null, {failure: {code: 'TEMPORARY_CHANNEL_FAILURE'}});
            }

            return cbk(null, {preimage: Buffer.alloc(32)});
          },
        },
      }),
      paths: [
        {
          channels: ['0x0x1'],
          fee: 2,
          fee_mtokens: '2000',
          liquidity: 1,
          relays: ['a'],
        },
        {
          channels: ['0x0x4'],
          fee: 1,
          fee_mtokens: '1000',
          liquidity: 1,
          relays: ['a'],
        },
      ],
    }),
    description: 'A payment encounters a routing failure on the first path',
    expected: {
      events: [
        {
          data: {
            route: {
              fee: 0,
              fee_mtokens: '0',
              hops: [{
                channel: '0x0x4',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '0',
                forward: 0,
                forward_mtokens: '1',
                public_key: 'a',
                timeout: 145
              }],
              messages: undefined,
              mtokens: '1',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 0,
              total_mtokens: '1',
            },
          },
          event: 'paying',
        },
        {
          data: {
            failure: {
              route: {
                fee: 0,
                fee_mtokens: '0',
                hops: [{
                  channel: '0x0x4',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 0,
                  forward_mtokens: '1',
                  public_key: 'a',
                  timeout: 145
                }],
                messages: undefined,
                mtokens: '1',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 0,
                total_mtokens: '1',
              },
              channel: undefined,
              height: undefined,
              index: undefined,
              mtokens: undefined,
              policy: null,
              public_key: undefined,
              reason: 'TemporaryChannelFailure',
              timeout_height: undefined,
              update: undefined
            },
          },
          event: 'routing_failure',
        },
        {
          data: {
            route: {
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
                timeout: 145,
              }],
              messages: undefined,
              mtokens: '1',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 0,
              total_mtokens: '1',
            },
          },
          event: 'paying',
        },
        {
          data: {
            secret: '0000000000000000000000000000000000000000000000000000000000000000',
          },
          event: 'paid',
        },
        {
          data: {
            success: {
              id: '0000000000000000000000000000000000000000000000000000000000000000',
              route: {
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
                  timeout: 145
                }],
                messages: undefined,
                mtokens: '1',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 0,
                total_mtokens: '1'
              },
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
                timeout: 145
              }],
              mtokens: '1',
              safe_fee: undefined,
              safe_tokens: undefined,
              secret: '0000000000000000000000000000000000000000000000000000000000000000',
              tokens: 0,
            },
          },
          event: 'path_success'
        },
        {
          data: {},
          event: 'success',
        },
      ],
    },
  },
  {
    args: makeArgs({max_timeout: 1}),
    description: 'A payment shard exceeds the maximum timeout height',
    expected: {
      events: [{
        data: [503, 'ExceededMaxCltvLimit', {timeout: 145}],
        event: 'error'
      }],
    },
  },
  {
    args: makeArgs({
      paths: [{
        channels: ['0x0x1', '0x0x2'],
        fee: 1,
        fee_mtokens: '1000',
        liquidity: 1,
        relays: ['a', 'b'],
      }],
    }),
    description: 'A payment shard exceeds the maximum fee',
    expected: {
      events: [{
        data: [503, 'ExceededMaxFeeLimit', {required: '1'}],
        event: 'error',
      }],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        default: {
          getChanInfo: ({}, cbk) => cbk('err'),
          getInfo: ({}, cbk) => cbk(null, getInfoRes()),
        },
      }),
    }),
    description: 'A failure to get the channel info fails the payment',
    expected: {
      events: [{
        data: [503, 'UnexpectedGetChannelInfoError', {err: 'err'}],
        event: 'error',
      }],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRoute: (args, cbk) => {
            return cbk(null, {failure: {code: 'TEMPORARY_CHANNEL_FAILURE'}});
          },
        },
      }),
      paths: [
        {
          channels: ['0x0x1'],
          fee: 2,
          fee_mtokens: '2000',
          liquidity: 1,
          relays: ['a'],
        },
        {
          channels: ['0x0x4'],
          fee: 1,
          fee_mtokens: '1000',
          liquidity: 1,
          relays: ['a'],
        },
      ],
    }),
    description: 'A payment encounters a routing failure on the first path',
    expected: {
      events: [
        {
          data: {
            route: {
              fee: 0,
              fee_mtokens: '0',
              hops: [{
                channel: '0x0x4',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '0',
                forward: 0,
                forward_mtokens: '1',
                public_key: 'a',
                timeout: 145
              }],
              messages: undefined,
              mtokens: '1',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 0,
              total_mtokens: '1',
            },
          },
          event: 'paying',
        },
        {
          data: {
            failure: {
              route: {
                fee: 0,
                fee_mtokens: '0',
                hops: [{
                  channel: '0x0x4',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 0,
                  forward_mtokens: '1',
                  public_key: 'a',
                  timeout: 145
                }],
                messages: undefined,
                mtokens: '1',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 0,
                total_mtokens: '1',
              },
              channel: undefined,
              height: undefined,
              index: undefined,
              mtokens: undefined,
              policy: null,
              public_key: undefined,
              reason: 'TemporaryChannelFailure',
              timeout_height: undefined,
              update: undefined
            },
          },
          event: 'routing_failure',
        },
        {
          data: {
            route: {
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
                timeout: 145,
              }],
              messages: undefined,
              mtokens: '1',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 0,
              total_mtokens: '1',
            },
          },
          event: 'paying',
        },
        {
          data: {
            failure: {
              route: {
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
                  timeout: 145
                }],
                messages: undefined,
                mtokens: '1',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 0,
                total_mtokens: '1'
              },
              channel: undefined,
              height: undefined,
              index: undefined,
              mtokens: undefined,
              policy: null,
              public_key: undefined,
              reason: 'TemporaryChannelFailure',
              timeout_height: undefined,
              update: undefined,
            },
          },
          event: 'routing_failure'
        },
        {
          data: {},
          event: 'failure',
        },
      ],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRoute: (args, cbk) => {
            const [firstHop] = args.route.hops;

            // Fail the route on one of the channels
            if (firstHop.chan_id === '4') {
              return cbk(null, {failure: {code: 'TEMPORARY_CHANNEL_FAILURE'}});
            }

            return cbk(null, {preimage: Buffer.alloc(32)});
          },
        },
      }),
      mtokens: '3000',
      paths: [
        {
          channels: ['0x0x1'],
          fee: 2,
          fee_mtokens: '2000',
          liquidity: 1,
          relays: ['a'],
        },
        {
          channels: ['0x0x4'],
          fee: 1,
          fee_mtokens: '1000',
          liquidity: 1,
          relays: ['a'],
        },
        {
          channels: ['0x0x1'],
          fee: 10,
          fee_mtokens: '5000',
          liquidity: 2,
          relays: ['a'],
        },
      ],
    }),
    description: 'A payment fails on a path and completes over two others',
    expected: {
      events: [
        {
          data: {
            route: {
              fee: 0,
              fee_mtokens: '0',
              hops: [
                {
                  channel: '0x0x4',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145
                }
              ],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000'
            }
          },
          event: 'paying'
        },
        {
          data: {
            failure: {
              route: {
                fee: 0,
                fee_mtokens: '0',
                hops: [
                  {
                    channel: '0x0x4',
                    channel_capacity: 1,
                    fee: 0,
                    fee_mtokens: '0',
                    forward: 1,
                    forward_mtokens: '1000',
                    public_key: 'a',
                    timeout: 145
                  }
                ],
                messages: undefined,
                mtokens: '1000',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 1,
                total_mtokens: '3000'
              },
              channel: undefined,
              height: undefined,
              index: undefined,
              mtokens: undefined,
              policy: null,
              public_key: undefined,
              reason: 'TemporaryChannelFailure',
              timeout_height: undefined,
              update: undefined
            }
          },
          event: 'routing_failure'
        },
        {
          data: {
            route: {
              fee: 0,
              fee_mtokens: '0',
              hops: [
                {
                  channel: '0x0x1',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145
                }
              ],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000'
            }
          },
          event: 'paying'
        },
        {
          data: {
            secret: '0000000000000000000000000000000000000000000000000000000000000000'
          },
          event: 'paid'
        },
        {
          data: {
            success: {
              id: '0000000000000000000000000000000000000000000000000000000000000000',
              route: {
                fee: 0,
                fee_mtokens: '0',
                hops: [
                  {
                    channel: '0x0x1',
                    channel_capacity: 1,
                    fee: 0,
                    fee_mtokens: '0',
                    forward: 1,
                    forward_mtokens: '1000',
                    public_key: 'a',
                    timeout: 145
                  }
                ],
                messages: undefined,
                mtokens: '1000',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 1,
                total_mtokens: '3000'
              },
              fee: 0,
              fee_mtokens: '0',
              hops: [
                {
                  channel: '0x0x1',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145
                }
              ],
              mtokens: '1000',
              safe_fee: undefined,
              safe_tokens: undefined,
              secret: '0000000000000000000000000000000000000000000000000000000000000000',
              tokens: 1
            }
          },
          event: 'path_success'
        },
        {
          data: {
            route: {
              fee: 0,
              fee_mtokens: '0',
              hops: [
                {
                  channel: '0x0x1',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145
                }
              ],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000'
            }
          },
          event: 'paying'
        },
        {
          data: {
            success: {
              id: '0000000000000000000000000000000000000000000000000000000000000000',
              route: {
                fee: 0,
                fee_mtokens: '0',
                hops: [
                  {
                    channel: '0x0x1',
                    channel_capacity: 1,
                    fee: 0,
                    fee_mtokens: '0',
                    forward: 1,
                    forward_mtokens: '1000',
                    public_key: 'a',
                    timeout: 145
                  }
                ],
                messages: undefined,
                mtokens: '1000',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 1,
                total_mtokens: '3000'
              },
              fee: 0,
              fee_mtokens: '0',
              hops: [
                {
                  channel: '0x0x1',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145
                }
              ],
              mtokens: '1000',
              safe_fee: undefined,
              safe_tokens: undefined,
              secret: '0000000000000000000000000000000000000000000000000000000000000000',
              tokens: 1
            }
          },
          event: 'path_success'
        },
        {
          data: {},
          event: 'success',
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => subscribeToMultiPathPay(args), error, 'Got error');
    } else {
      const sub = subscribeToMultiPathPay(args);

      const events = [];

      [
        'error',
        'failure',
        'paid',
        'path_success',
        'paying',
        'routing_failure',
        'success',
      ]
        .forEach(event => sub.on(event, data => events.push({data, event})));

      await nextTick();

      // Make sure that no listener to error doesn't cause an issue
      const sub2 = subscribeToMultiPathPay(args);

      await nextTick();

      deepIs(events, expected.events, 'Got expected events');
    }

    return end();
  });
});
