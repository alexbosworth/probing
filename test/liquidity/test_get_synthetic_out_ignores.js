const {test} = require('@alexbosworth/tap');

const {getInfoResponse} = require('./../fixtures');
const {getSyntheticOutIgnores} = require('./../../');

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));

const makeArgs = overrides => {
  const args = {
    lnd: {
      default: {
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
      },
    },
    out: [],
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({lnd: undefined}),
    description: 'LND is required',
    error: [400, 'ExpectedAuthenticatedLndToGetOutIgnores'],
  },
  {
    args: makeArgs({out: undefined}),
    description: 'Out array is required',
    error: [400, 'ExpectedArrayOfOutWhitelistedPublicKeys'],
  },
  {
    args: makeArgs({}),
    description: 'Synthetic out ignores are returned',
    expected: {
      ignore: [{
        from_public_key: '020000000000000000000000000000000000000000000000000000000000000000',
        to_public_key: '00',
      }],
    },
  },
  {
    args: makeArgs({
      ignore: [{from_public_key: 'a', to_public_key: 'b'}],
      out: ['00'],
    }),
    description: 'Synthetic out ignores are returned when ignores exist',
    expected: {ignore: [{from_public_key: 'a', to_public_key: 'b'}]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, rejects, strictSame}) => {
    if (!!error) {
      await rejects(getSyntheticOutIgnores(args), error, 'Got expected error');
    } else {
      const {ignore} = await getSyntheticOutIgnores(args);

      strictSame(ignore, expected.ignore, 'Got expected ignores');
    }

    return end();
  });
});
