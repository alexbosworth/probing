const {once} = require('events');
const {promisify} = require('util');

const {test} = require('@alexbosworth/tap');

const {getChanInfoResponse} = require('./../fixtures');
const {getInfoResponse} = require('./../fixtures');
const method = require('./../../liquidity/subscribe_to_find_path');

const delay = promisify(setTimeout);
const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));
const nextTick = promisify(process.nextTick);

const makeLnd = overrides => {
  const lnd = {
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
        node2_pub: '00',
      }),
      getInfo: ({}, cbk) => cbk(null, getInfoRes()),
      listChannels: ({}, cbk) => cbk(null, {
        channels: [{
          active: true,
          alias_scids: [],
          capacity: 1,
          chan_id: '1',
          channel_point: '00:1',
          close_address: 'cooperative_close_address',
          commit_fee: '1',
          commit_weight: '1',
          commitment_type: 'LEGACY',
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
      queryRoutes: ({}, cbk) => cbk(null, {
        routes: [],
        success_prob: 1,
      }),
    },
    router: {
      buildRoute: ({}, cbk) => cbk('err'),
      sendToRouteV2: (args, cbk) => {
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
  };

  Object.keys(overrides).forEach(k => lnd[k] = overrides[k]);

  return lnd;
};

const makeArgs = overrides => {
  const args = {
    cltv_delta: 1,
    destination: Buffer.alloc(33).toString('hex'),
    evaluation_delay_ms: 1,
    lnd: makeLnd({}),
    probes: [{
      channels: ['0x0x1'],
      liquidity: 1000000,
      relays: [Buffer.alloc(33).toString('hex')],
    }],
    public_key: Buffer.alloc(33).toString('hex'),
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({cltv_delta: undefined}),
    description: 'A CLTV delta is required',
    error: [400, 'ExpectedFinalCltvDeltaToFindMultiProbePath'],
  },
  {
    args: makeArgs({destination: undefined}),
    description: 'A destination is required',
    error: [400, 'ExpectedDestinationToFindMultiProbePath'],
  },
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedLndToFindMultiProbePath'],
  },
  {
    args: makeArgs({probes: undefined}),
    description: 'Probes are required',
    error: [400, 'ExpectedRecordOfProbesToFindMultiProbePath'],
  },
  {
    args: makeArgs({public_key: undefined}),
    description: 'A source public key is required',
    error: [400, 'ExpectedSourcePublicKeyToFindMultiProbePath'],
  },
  {
    args: makeArgs({}),
    description: 'No routes returns a failure',
    expected: {events: [{data: {}, event: 'failure'}]},
  },
  {
    args: makeArgs({
      lnd: makeLnd({
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
            node2_pub: '00',
          }),
          getInfo: ({}, cbk) => cbk('err'),
          listChannels: ({}, cbk) => cbk(null, {
            channels: [{
              active: true,
              alias_scids: [],
              capacity: 1,
              chan_id: '1',
              channel_point: '00:1',
              close_address: 'cooperative_close_address',
              commit_fee: '1',
              commit_weight: '1',
              commitment_type: 'LEGACY',
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
          sendToRouteV2: (args, cbk) => cbk('err'),
        },
      }),
    }),
    description: 'An error sending on route fails search',
    expected: {
      events: [{
        data: [503, 'GetWalletInfoErr', {err: 'err'}],
        event: 'error',
      }],
    },
  },
  {
    args: makeArgs({
      lnd: makeLnd({
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
            node2_pub: '00',
          }),
          getInfo: ({}, cbk) => cbk(null, getInfoRes()),
          listChannels: ({}, cbk) => cbk(null, {
            channels: [{
              active: true,
              alias_scids: [],
              capacity: 1,
              chan_id: '1',
              channel_point: '00:1',
              close_address: 'cooperative_close_address',
              commit_fee: '1',
              commit_weight: '1',
              commitment_type: 'LEGACY',
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
      }),
    }),
    description: 'No routes returns a failure',
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
            },
          },
          event: 'probing',
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
          event: 'routing_success'
        },
        {
          data: {},
          event: 'failure',
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, strictSame, throws}) => {
    if (!!error) {
      throws(() => method(args), error, 'Got error');
    } else {
      const events = [];
      const sub = method(args);

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

      await delay(1100);

      // Make sure that no listener to error doesn't cause an issue
      const sub2 = method(args);

      await nextTick();

      strictSame(events, expected.events, 'Got expected events');
    }

    return end();
  });
});
