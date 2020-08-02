const {once} = require('events');
const {promisify} = require('util');

const {test} = require('tap');

const {getChanInfoResponse} = require('./../fixtures');
const {getInfoResponse} = require('./../fixtures');
const {subscribeToMultiPathPay} = require('./../../payments');

const delay = promisify(setTimeout);
const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));
const nextTick = promisify(process.nextTick);

const makeLnd = overrides => {
  const lnd = {
    default: {
      getChanInfo: ({}, cbk) => cbk(null, getChanInfoResponse),
      getInfo: ({}, cbk) => cbk(null, getInfoRes()),
      listChannels: ({}, cbk) => cbk(null, {
        channels: [{
          active: true,
          capacity: 1,
          chan_id: '1',
          channel_point: '00:1',
          close_address: 'cooperative_close_address',
          commit_fee: '1',
          commit_weight: '1',
          fee_per_kw: '1',
          initiator: true,
          local_balance: '1',
          local_chan_reserve_sat: '1',
          num_updates: 1,
          pending_htlcs: [{
            amount: '1',
            expiration_height: 1,
            hash_lock: Buffer.alloc(32),
            incoming: true,
          }],
          private: true,
          remote_balance: 1,
          remote_chan_reserve_sat: '1',
          remote_pubkey: '00',
          total_satoshis_received: 1,
          total_satoshis_sent: 1,
          unsettled_balance: 1,
        }],
      }),
    },
    router: {
      buildRoute: ({}, cbk) => cbk('err'),
      sendToRoute: ({}, cbk) => {
        return cbk(null, {preimage: Buffer.alloc(32)});
      },
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
    max_retries: 0,
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

const makePaidEvent = ({}) => {
  const event = {
    data: {
      secret: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    event: 'paid',
  };

  return event;
};

const makePathSuccessEvent = ({}) => {
  const event =         {
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
          timeout: 145,
        }],
        mtokens: '1',
        safe_fee: undefined,
        safe_tokens: undefined,
        secret: '0000000000000000000000000000000000000000000000000000000000000000',
        tokens: 0,
      },
    },
    event: 'path_success',
  };

  return event;
};

const makePayingEvent = ({channel}) => {
  const event = {
    data: {
      route: {
        fee: 0,
        fee_mtokens: '0',
        hops: [{
          channel: channel || '0x0x1',
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
  };

  return event;
};

const makeRoutingFailureEvent = ({channel}) => {
  const event =         {
    data: {
      route: {
        fee: 0,
        fee_mtokens: '0',
        hops: [{
          channel: channel || '0x0x4',
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
    event: 'routing_failure',
  };

  return event;
};

const makeSuccessEvent = ({}) => {
  const event =         {
    data: {
      routes: [
        {
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
      ],
    },
    event: 'success',
  };

  return event;
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
        makePayingEvent({}),
        makePaidEvent({}),
        makePathSuccessEvent({}),
        makeSuccessEvent({}),
      ],
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
      max_attempts: 1,
    }),
    description: 'A payment encounters liquidity failure',
    expected: {
      events: [
        makePayingEvent({}),
        makeRoutingFailureEvent({channel: '0x0x1'}),
        {
          data: [503, 'RoutingFailureAttemptingMultiPathPayment'],
          event: 'error',
        },
      ],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRoute: (args, cbk) => cbk('err'),
        },
      }),
      max_attempts: 1,
    }),
    description: 'A payment cannot be started',
    expected: {
      events: [
        makePayingEvent({}),
        {data: {}, event: 'failure'},
      ],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRoute: (args, cbk) => {
            return cbk(null, {failure: {code: 'UNKNOWN_PAYMENT_HASH'}});
          },
        },
      }),
      max_attempts: 1,
    }),
    description: 'A payment encounters a rejection',
    expected: {
      events: [
        makePayingEvent({}),
        {
          data: [503, 'PaymentRejectedByDestination'],
          event: 'error',
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
            return cbk(null, {failure: {code: 'MPP_TIMEOUT'}});
          },
        },
      }),
      max_attempts: 1,
    }),
    description: 'A payment encounters an mpp timeout failure',
    expected: {
      events: [
        makePayingEvent({}),
        {data: [503, 'MultiPathPaymentTimeoutFailure'], event: 'error'},
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
      max_attempts: 2,
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
        makePayingEvent({channel: '0x0x4'}),
        makeRoutingFailureEvent({}),
        makePayingEvent({}),
        makePaidEvent({}),
        makePathSuccessEvent({}),
        makeSuccessEvent({}),
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
        data: [503, 'ExceededMaxFeeLimit', {required_fee: 0}],
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
          listChannels: ({}, cbk) => cbk(null, {channels: []}),
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
    description: 'A payment cannot be completed due to routing failures',
    expected: {
      events: [
        makePayingEvent({channel: '0x0x4'}),
        makeRoutingFailureEvent({}),
        makePayingEvent({}),
        makeRoutingFailureEvent({channel: '0x0x1'}),
        {
          data: [400, 'ExceededMaximumPathsLiquidity', {maximum: 0}],
          event: 'error',
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
              hops: [{
                channel: '0x0x4',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '0',
                forward: 1,
                forward_mtokens: '1000',
                public_key: 'a',
                timeout: 145
              }],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000',
            },
          },
          event: 'paying',
        },
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
                forward: 1,
                forward_mtokens: '1000',
                public_key: 'a',
                timeout: 145,
              }],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000',
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
                forward: 1,
                forward_mtokens: '1000',
                public_key: 'a',
                timeout: 145,
              }],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000',
            },
          },
          event: 'paying',
        },
        makePaidEvent({}),
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
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145,
                }],
                messages: undefined,
                mtokens: '1000',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 1,
                total_mtokens: '3000',
              },
              fee: 0,
              fee_mtokens: '0',
              hops: [{
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '0',
                forward: 1,
                forward_mtokens: '1000',
                public_key: 'a',
                timeout: 145,
              }],
              mtokens: '1000',
              safe_fee: undefined,
              safe_tokens: undefined,
              secret: '0000000000000000000000000000000000000000000000000000000000000000',
              tokens: 1,
            },
          },
          event: 'path_success',
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
                forward: 1,
                forward_mtokens: '1000',
                public_key: 'a',
                timeout: 145,
              }],
              messages: undefined,
              mtokens: '1000',
              payment: '0000000000000000000000000000000000000000000000000000000000000000',
              timeout: 145,
              tokens: 1,
              total_mtokens: '3000',
            },
          },
          event: 'paying',
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
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145,
                }],
                messages: undefined,
                mtokens: '1000',
                payment: '0000000000000000000000000000000000000000000000000000000000000000',
                timeout: 145,
                tokens: 1,
                total_mtokens: '3000',
              },
              fee: 0,
              fee_mtokens: '0',
              hops: [{
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '0',
                forward: 1,
                forward_mtokens: '1000',
                public_key: 'a',
                timeout: 145,
              }],
              mtokens: '1000',
              safe_fee: undefined,
              safe_tokens: undefined,
              secret: '0000000000000000000000000000000000000000000000000000000000000000',
              tokens: 1,
            }
          },
          event: 'path_success',
        },
        {
          data: {
            routes: [
              {
                id: '0000000000000000000000000000000000000000000000000000000000000000',
                route: {
                  fee: 0,
                  fee_mtokens: '0',
                  hops: [{
                    channel: '0x0x1',
                    channel_capacity: 1,
                    fee: 0,
                    fee_mtokens: '0',
                    forward: 1,
                    forward_mtokens: '1000',
                    public_key: 'a',
                    timeout: 145,
                  }],
                  messages: undefined,
                  mtokens: '1000',
                  payment: '0000000000000000000000000000000000000000000000000000000000000000',
                  timeout: 145,
                  tokens: 1,
                  total_mtokens: '3000',
                },
                fee: 0,
                fee_mtokens: '0',
                hops: [{
                  channel: '0x0x1',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145,
                }],
                mtokens: '1000',
                safe_fee: undefined,
                safe_tokens: undefined,
                secret: '0000000000000000000000000000000000000000000000000000000000000000',
                tokens: 1,
              },
              {
                id: '0000000000000000000000000000000000000000000000000000000000000000',
                route: {
                  fee: 0,
                  fee_mtokens: '0',
                  hops: [{
                    channel: '0x0x1',
                    channel_capacity: 1,
                    fee: 0,
                    fee_mtokens: '0',
                    forward: 1,
                    forward_mtokens: '1000',
                    public_key: 'a',
                    timeout: 145,
                  }],
                  messages: undefined,
                  mtokens: '1000',
                  payment: '0000000000000000000000000000000000000000000000000000000000000000',
                  timeout: 145,
                  tokens: 1,
                  total_mtokens: '3000',
                },
                fee: 0,
                fee_mtokens: '0',
                hops: [{
                  channel: '0x0x1',
                  channel_capacity: 1,
                  fee: 0,
                  fee_mtokens: '0',
                  forward: 1,
                  forward_mtokens: '1000',
                  public_key: 'a',
                  timeout: 145,
                }],
                mtokens: '1000',
                safe_fee: undefined,
                safe_tokens: undefined,
                secret: '0000000000000000000000000000000000000000000000000000000000000000',
                tokens: 1,
              },
            ],
          },
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

      await delay(50)

      // Make sure that no listener to error doesn't cause an issue
      const sub2 = subscribeToMultiPathPay(args);

      await nextTick();

      deepIs(events, expected.events, 'Got expected events');
    }

    return end();
  });
});
