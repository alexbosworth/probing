const {once} = require('events');
const {promisify} = require('util');

const {test} = require('tap');

const {getChanInfoResponse} = require('./../fixtures');
const {getInfoResponse} = require('./../fixtures');
const {subscribeToMultiPathProbe} = require('./../../liquidity');

const delay = promisify(setTimeout);
const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));
let i = 0;
const nextTick = promisify(process.nextTick);

const makeLndDefault = overrides => {
  const lndDefault = {
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
      node2_pub: '00',
    }),
    getInfo: ({}, cbk) => cbk(null, getInfoRes()),
    listChannels: ({}, cbk) => cbk(null, {channels: []}),
    queryRoutes: ({}, cbk) => cbk(null, {
      routes: [],
      success_prob: 1,
    }),
  };

  Object.keys(overrides).forEach(key => lndDefault[key] = overrides[key]);

  return lndDefault;
};

const makeLnd = overrides => {
  const lnd = {
    default: makeLndDefault({}),
    router: {
      buildRoute: ({}, cbk) => cbk('err'),
      sendToRoute: ({}, cbk) => cbk(null, {
        failure: {code: 'UNKNOWN_PAYMENT_HASH'},
      }),
    },
  };

  Object.keys(overrides).forEach(key => lnd[key] = overrides[key]);

  return lnd;
};

const makeArgs = overrides => {
  const args = {
    cltv_delta: 1,
    destination: Buffer.alloc(33).toString('hex'),
    evaluation_delay_ms: 1,
    lnd: makeLnd({}),
    probes: [],
    public_key: 'a',
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({cltv_delta: undefined}),
    description: 'CLTV delta is required',
    error: [400, 'ExpectedFinalCltvDeltaToSubscribeToMultiPathProbe'],
  },
  {
    args: makeArgs({destination: undefined}),
    description: 'A destination or a request is required',
    error: [400, 'ExpectedDestinationOrRequestToSubscribeToMultiPathProbe'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndApiObjectToSubscribeToMultiPathProbe'],
  },
  {
    args: makeArgs({
      lnd: makeLnd({default: {getInfo: ({}, cbk) => cbk('err')}}),
    }),
    description: 'An error is passed back',
    expected: {
      events: [{
        data: [503, 'GetWalletInfoErr', {err: 'err'}],
        event: 'error',
      }],
    },
  },
  {
    args: makeArgs({}),
    description: 'A failure is passed back',
    expected: {events: [{data: {}, event: 'failure'}]},
  },
  {
    args: makeArgs({
      path_timeout_ms: 1,
      probe_timeout_ms: 1,
      lnd: makeLnd({
        default: {
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
            node2_pub: '00',
          }),
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
              local_constraints: {
                chan_reserve_sat: '1',
                csv_delay: 1,
                dust_limit_sat: '1',
                max_accepted_htlcs: 1,
                max_pending_amt_msat: '1',
                min_htlc_msat: '1',
              },
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
              remote_constraints: {
                chan_reserve_sat: '1',
                csv_delay: 1,
                dust_limit_sat: '1',
                max_accepted_htlcs: 1,
                max_pending_amt_msat: '1',
                min_htlc_msat: '1',
              },
              remote_pubkey: '00',
              thaw_height: 0,
              total_satoshis_received: 1,
              total_satoshis_sent: 1,
              unsettled_balance: 1,
            }],
          }),
          queryRoutes: (args, cbk) => {
            if (args.ignored_pairs.length) {
              return cbk(null, {routes: [], success_prob: 0});
            }

            return cbk(null, {
              routes: [{
                hops: [{
                  amt_to_forward_msat: '1',
                  chan_capacity: '1',
                  chan_id: '1',
                  custom_records: {},
                  expiry: 1,
                  fee_msat: '1',
                  pub_key: '00',
                }],
                total_amt: 1,
                total_amt_msat: '1',
                total_fees: '1',
                total_fees_msat: '1',
                total_time_lock: 1,
              }],
              success_prob: 1,
            });
          },
        },
        router: {
          buildRoute: ({}, cbk) => cbk('err'),
          sendToRoute: (args, cbk) => {
            return cbk(null, {
              failure: {
                chan_id: '1',
                code: 'UNKNOWN_PAYMENT_HASH',
                failure_source_index: 1,
              },
              preimage: Buffer.alloc(Number()),
            });
          },
        },
      }),
    }),
    description: 'A success is found',
    expected: {
      events: [
        {
          data: {
            route: {
              confidence: 1000000,
              fee: 0,
              fee_mtokens: '1',
              hops: [{
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '1',
                forward: 0,
                forward_mtokens: '1',
                public_key: '00',
                timeout: 1,
              }],
              messages: [],
              mtokens: '1',
              safe_fee: 1,
              safe_tokens: 1,
              timeout: 1,
              tokens: 0,
              payment: undefined,
              total_mtokens: undefined,
            },
          },
          event: 'probing'
        },
        {
          data: {
            route: {
              confidence: 1000000,
              fee: 0,
              fee_mtokens: '1',
              hops: [{
                channel: '0x0x1',
                channel_capacity: 1,
                fee: 0,
                fee_mtokens: '1',
                forward: 0,
                forward_mtokens: '1',
                public_key: '00',
                timeout: 1
              }],
              messages: [],
              mtokens: '1',
              safe_fee: 1,
              safe_tokens: 1,
              timeout: 1,
              tokens: 0,
              payment: undefined,
              total_mtokens: undefined,
            }
          },
          event: 'routing_success',
        },
        {
          data: {tokens: 50000},
          event: 'evaluating',
        },
        {
          data: {
            paths: [{
              channels: ['0x0x1'],
              fee: 0,
              fee_mtokens: '0',
              liquidity: 50001,
              relays: ['00'],
            }],
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
      throws(() => subscribeToMultiPathProbe(args), error, 'Got error');
    } else {
      const events = [];
      const sub = subscribeToMultiPathProbe(args);

      [
        'error',
        'evaluating',
        'failure',
        'probing',
        'routing_failure',
        'routing_success',
        'success',
      ]
        .forEach(event => sub.on(event, data => events.push({data, event})));

      await delay(100);

      // Make sure that no listener to error doesn't cause an issue
      const sub2 = subscribeToMultiPathProbe(args);

      await nextTick();

      deepIs(events, expected.events, 'Got expected events');
    }

    return end();
  });
});
