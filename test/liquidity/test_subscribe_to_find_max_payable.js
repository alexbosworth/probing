const {once} = require('events');
const {promisify} = require('util');

const {test} = require('tap');

const {getChanInfoResponse} = require('./../fixtures');
const {getInfoResponse} = require('./../fixtures');
const {subscribeToFindMaxPayable} = require('./../../');

const getInfoRes = () => JSON.parse(JSON.stringify(getInfoResponse));
const nextTick = promisify(process.nextTick);

const makeArgs = overrides => {
  const args = {
    cltv: 1,
    delay: 1,
    hops: [{channel: '0x0x0', public_key: 'a'}],
    emitter: {emit: () => {}},
    lnd: {
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
          node2_pub: 'b',
        }),
        getInfo: ({}, cbk) => cbk(null, getInfoRes()),
      },
      router: {
        buildRoute: ({}, cbk) => cbk('err'),
        sendToRoute: (args, cbk) => {
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
    args: makeArgs({lnd: undefined}),
    description: 'A destination or a request is required',
    expected: {
      events: [{
        data: [400, 'ExpectedLndToFindMaxPayableAmount'],
        event: 'error',
      }],
    }
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, throws}) => {
    if (!!error) {
      throws(() => subscribeToFindMaxPayable(args), error, 'Got error');
    } else {
      const events = [];
      const sub = subscribeToFindMaxPayable(args);

      [
        'error',
        'evaluating',
        'failure',
        'success',
      ]
        .forEach(event => sub.on(event, data => events.push({data, event})));

      await nextTick();

      // Make sure that no listener to error doesn't cause an issue
      const sub2 = subscribeToFindMaxPayable(args);

      await nextTick();

      deepIs(events, expected.events, 'Got expected events');
    }

    return end();
  });
});
