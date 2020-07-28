const EventEmitter = require('events');

const asyncMap = require('async/map');
const asyncWhilst = require('async/whilst');
const {subscribeToPayViaRoutes} = require('ln-service');

const getRouteForPayment = require('./get_route_for_payment');
const mtokensForMultiPathPayment = require('./mtokens_for_multi_path_payment');
const sortMultiplePaymentPaths = require('./sort_multiple_payment_paths');

const defaultCltvDelta = 144;
const {isArray} = Array;
const {nextTick} = process;
const tokensAsMillitokens = tokens => BigInt(tokens) * BigInt(1e3);

/** Subscribe to a payment over multiple paths

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    id: <Payment Hash Hex String>
    lnd: <Authenticated LND API Object>
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
  {}
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

  const {sorted} = sortMultiplePaymentPaths({paths: args.paths});

  const emitter = new EventEmitter();
  const failed = [];
  const fees = [];
  const paid = [];
  const paying = [];

  asyncMap(sorted, (path, cbk) => {
    const pathFailures = []

    // Try to execute this path until the payment is completed or fails
    return asyncWhilst(
      cbk => {
        // Exit the loop when we have a paid result
        if (!!paid.length) {
          return cbk(null, false);
        }

        // Exit the loop when we have a routing failure on the path
        if (!!pathFailures.length) {
          return cbk(null, false);
        }

        return cbk(null, true);
      },
      cbk => {
        // Calculate how many mtokens should be used on this path
        const {mtokens} = mtokensForMultiPathPayment({
          paying,
          failed: failed.map(n => n.id),
          liquidity: path.liquidity,
          total: args.mtokens,
        });

        // Exit early when there is no more in-flight liquidity needed
        if (!mtokens) {
          return nextTick(cbk);
        }

        // Identify sent payments by their array index
        const id = paying.length;

        const payment = {id, mtokens, path};

        // Mark the payment as being in flight
        paying.push(payment);

        // Calculate the route for this path
        return getRouteForPayment({
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

          const {timeout} = res;

          if (!!args.max_timeout && timeout > args.max_timeout) {
            return cbk([503, 'ExceededMaxCltvLimit', {timeout}]);
          }

          fees.push({id, fee_mtokens: res.fee_mtokens});

          // Recalculate required total fee millitokens
          const required = fees
            .filter(n => !failed.includes(n.id))
            .map(n => BigInt(n.fee_mtokens))
            .reduce((sum, n) => sum + n, BigInt(Number()))
            .toString();

          // Check that required fees would not exceed the maximum fee amount
          if (BigInt(required) > tokensAsMillitokens(args.max_fee)) {
            return cbk([503, 'ExceededMaxFeeLimit', {required}]);
          }

          // Put the payment into flight
          const sub = subscribeToPayViaRoutes({
            id: args.id,
            lnd: args.lnd,
            routes: [res],
          });

          // Announce that a route is going out
          sub.on('paying', ({route}) => emitter.emit('paying', {route}));

          // The route ended in a failure
          sub.on('routing_failure', failure => {
            // Record failure of the payment
            [failed, pathFailures].forEach(n => n.push(payment));

            // Notify listeners that a path failed
            emitter.emit('routing_failure', {failure});

            return cbk();
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
        nextTick(() => cbk(err, res));
      }
    )
  },
  (err, res) => {
    if (!!err && !emitter.listenerCount('error')) {
      return;
    }

    if (!!err) {
      return emitter.emit('error', err);
    }

    // Exit early with failure when there are no successful payment paths
    if (!paid.length) {
      return emitter.emit('failure', {});
    }

    return emitter.emit('success', {});
  });

  return emitter;
};
