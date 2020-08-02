const EventEmitter = require('events');

const asyncMap = require('async/map');
const asyncRetry = require('async/retry');
const asyncWhilst = require('async/whilst');
const {subscribeToPayViaRoutes} = require('ln-service');

const getRouteForPayment = require('./get_route_for_payment');
const mtokensForMultiPathPayment = require('./mtokens_for_multi_path_payment');
const sortMultiplePaymentPaths = require('./sort_multiple_payment_paths');

const defaultCltvDelta = 144;
const {isArray} = Array;
const isMppTimeout = n => n.reason === 'MppTimeout';
const isRejected = n => n.reason === 'UnknownPaymentHash';
const maxAttempts = 10;
const millitokensAsTokens = n => Number(BigInt(n) / BigInt(1e3));
const {nextTick} = process;
const sumMtokens = arr => arr.reduce((sum, n) => sum + n, BigInt(Number()));
const sumTokens = arr => arr.reduce((sum, n) => sum + n, Number());
const tokensAsMillitokens = tokens => BigInt(tokens) * BigInt(1e3);

/** Subscribe to a payment over multiple paths

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    id: <Payment Hash Hex String>
    lnd: <Authenticated LND API Object>
    [max_attempts]: <Maximum Routing Failure Retries Number>
    max_fee: <Maximum Total Fee Tokens>
    [max_timeout]: <Maximum Payment Expiration Height Number>
    mtokens: <Total Millitokens to Send String>
    paths: [{
      channels: [<Standard Format Channel Id String>]
      fee: <Fee Amount Tokens>
      fee_mtokens: <Fee Amount Millitokens String>
      liquidity: <Liquidity Total Tokens>
      relays: [<Relaying Node Public Key Hex String>]
    }]
    payment: <Payment Identifier Hex String>
    [routes]: [[{
      [base_fee_mtokens]: <Base Fee Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
      [fee_rate]: <Fee Rate Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
  }

  @throws
  <Error Object>

  @returns
  <EventEmitter Object>

  @event 'error'
  <Error Array>

  @event 'failure'
  {}

  @event 'paid'
  {
    secret: <Payment Secret Preimage Hex String>
  }

  @event 'path_success'
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid Millitokens String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Hop Channel Capacity Tokens Number>
      fee_mtokens: <Hop Forward Fee Millitokens String>
      forward_mtokens: <Hop Forwarded Millitokens String>
      timeout: <Hop CLTV Expiry Block Height Number>
    }]
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <Total Millitokens Sent String>
    route: {
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens To Pay String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
    safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
    safe_tokens: <Payment Tokens Rounded Up Number>
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Number>
  }

  @event 'paying'
  {
    route: {
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens To Pay String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
  }

  @event 'routing_failure'
  {
    [channel]: <Standard Format Channel Id String>
    [height]: <Failure Height Context Number>
    [index]: <Failure Hop Index Number>
    [mtokens]: <Failure Related Millitokens String>
    [policy]: {
      base_fee_mtokens: <Base Fee Millitokens String>
      cltv_delta: <Locktime Delta Number>
      fee_rate: <Fees Charged in Millitokens Per Million Number>
      [is_disabled]: <Channel is Disabled Bool>
      max_htlc_mtokens: <Maximum HLTC Millitokens value String>
      min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
    }
    public_key: <Public Key Hex String>
    reason: <Failure Reason String>
    route: {
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens To Pay String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
    [timeout_height]: <Failure Related CLTV Timeout Height Number>
    [update]: {
      chain: <Chain Id Hex String>
      channel_flags: <Channel Flags Number>
      extra_opaque_data: <Extra Opaque Data Hex String>
      message_flags: <Message Flags Number>
      signature: <Channel Update Signature Hex String>
    }
  }

  @event 'success'
  {
    routes: [{
      fee: <Fee Paid Tokens Number>
      fee_mtokens: <Fee Paid Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Hop Channel Capacity Tokens Number>
        fee_mtokens: <Hop Forward Fee Millitokens String>
        forward_mtokens: <Hop Forwarded Millitokens String>
        timeout: <Hop CLTV Expiry Block Height Number>
      }]
      id: <Payment Hash Hex String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Is Outoing Bool>
      mtokens: <Total Millitokens Sent String>
      route: {
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Channel Capacity Tokens Number>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Number>
    }]
  }
*/
module.exports = args => {
  if (!args.destination) {
    throw [400, 'ExpectedDestinationToSubscribeToMultiPathPayment'];
  }

  if (!args.id) {
    throw [400, 'ExpectedPaymentHashToSubscribeToMultiPathPayment'];
  }

  if (!args.lnd) {
    throw [400, 'ExpectedLndToSubscribeToMultiPathPayment'];
  }

  if (args.max_fee === undefined) {
    throw [400, 'ExpectedMaxFeeToSubscribeToMultiPathPayment'];
  }

  if (!args.mtokens) {
    throw [400, 'ExpectedMillitokensToSubscribeToMultiPathPayment'];
  }

  if (!isArray(args.paths)) {
    throw [400, 'ExpectedPathsToSubscribeToMultiPathPayment'];
  }

  if (!args.payment) {
    throw [400, 'ExpectedPaymentIdentifierToSubscribeToMultiPathPayment'];
  }

  const emitter = new EventEmitter();
  const failures = [];
  const ignore = [];
  const {sorted} = sortMultiplePaymentPaths({paths: args.paths});
  const times = args.max_attempts !== undefined ? args.max_attempts : maxAttempts;

  const paths = sorted.map((path, index) => ({index, path}));

  nextTick(() => {
    return asyncRetry({times}, cbk => {
      const attemptFailures = [];
      const failed = [];
      const fees = [];
      const paid = [];
      const paying = [];
      const toPay = paths.filter(path => !ignore.includes(path.index));

      const maximum = sumTokens(toPay.map(n => n.path.liquidity));

      if (BigInt(args.mtokens) > tokensAsMillitokens(maximum)) {
        return cbk([400, 'ExceededMaximumPathsLiquidity', {maximum}]);
      }

      return asyncMap(toPay, ({index, path}, cbk) => {
        // Calculate how many mtokens should be used on this path
        const {mtokens} = mtokensForMultiPathPayment({
          paying,
          failed: failed.map(n => n.id),
          liquidity: path.liquidity,
          total: args.mtokens,
        });

        // Exit early when there is no more in-flight liquidity needed
        if (!mtokens) {
          return cbk();
        }

        // Identify sent payments by their array index
        const id = paying.length;

        const payment = {id, mtokens, path};

        // Mark the payment as being in flight
        paying.push(payment);

        // Calculate the route for this path
        return getRouteForPayment({
          failures,
          mtokens,
          path,
          cltv_delta: args.cltv_delta || defaultCltvDelta,
          destination: args.destination,
          lnd: args.lnd,
          payment: args.payment,
          routes: args.routes,
          total_mtokens: args.mtokens,
        },
        (err, res) => {
          // Exit early when there is an error getting the route
          if (!!err) {
            return cbk(err);
          }

          const {timeout} = res.route;

          if (!!args.max_timeout && timeout > args.max_timeout) {
            return cbk([503, 'ExceededMaxCltvLimit', {timeout}]);
          }

          fees.push({id, fee_mtokens: res.route.fee_mtokens});

          // Recalculate required total fee millitokens
          const required = fees
            .filter(n => !failed.includes(n.id))
            .map(n => BigInt(n.fee_mtokens))
            .reduce((sum, n) => sum + n, BigInt(Number()))
            .toString();

          // Check that required fees would not exceed the maximum fee amount
          if (BigInt(required) > tokensAsMillitokens(args.max_fee)) {
            const needed = millitokensAsTokens(required);

            return cbk([503, 'ExceededMaxFeeLimit', {required_fee: needed}]);
          }

          // Put the payment into flight
          const sub = subscribeToPayViaRoutes({
            id: args.id,
            lnd: args.lnd,
            routes: [res.route],
          });

          sub.on('error', err => {
            failed.push(payment);

            return cbk();
          });

          // Continue when the payment failed
          sub.on('failure', () => {
            return cbk();
          });

          // Announce that a route is going out
          sub.on('paying', ({route}) => emitter.emit('paying', {route}));

          // The route ended in a failure
          sub.on('routing_failure', failure => {
            attemptFailures.push(failure);

            // Exit early when the overall payment entered terminal condition
            if (failure.reason === 'MppTimeout') {
              return;
            }

            // Exit early when the payment is rejected
            if (failure.reason === 'UnknownPaymentHash') {
              return;
            }

            ignore.push(index);

            // Record specific routing failure details
            failures.push(failure);

            // Record failure of this path
            failed.push(payment);

            // Notify listeners that a path failed
            emitter.emit('routing_failure', failure);

            return;
          });

          // The route ended in a success
          sub.on('success', success => {
            // Announce the first successful shard that indicates payment
            if (!paid.length) {
              emitter.emit('paid', {secret: success.secret});
            }

            // Record that this payment was completed
            paid.push(payment);

            // Announce a path was successful
            emitter.emit('path_success', {success});

            return cbk(null, success);
          });

          return;
        });
      },
      (err, res) => {
        // Exit early with error when there was a Multi-Path Timeout
        if (!!attemptFailures.find(n => isMppTimeout(n))) {
          return cbk([503, 'MultiPathPaymentTimeoutFailure']);
        }

        // Exit early when there was an end rejection
        if (!!attemptFailures.find(n => isRejected(n))) {
          return cbk([503, 'PaymentRejectedByDestination']);
        }

        const routingFails = attemptFailures.filter(n => !isMppTimeout(n));

        // Exit with error when all the shards failed to reach the end
        if (routingFails.length === paying.length) {
          return cbk([503, 'RoutingFailureAttemptingMultiPathPayment']);
        }

        return cbk(err, res);
      });
    },
    (err, res) => {
      // Exit early when there is an error but no listeners for errors
      if (!!err && !emitter.listenerCount('error')) {
        return;
      }

      if (!!err) {
        return emitter.emit('error', err);
      }

      const routes = res.filter(n => !!n);

      // Exit early with failure when there are no successful payment paths
      if (!routes.length) {
        return emitter.emit('failure', {});
      }

      return emitter.emit('success', {routes});
    });
  });

  return emitter;
};
