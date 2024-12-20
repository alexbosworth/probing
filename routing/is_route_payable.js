const asyncAuto = require('async/auto');
const asyncTimeout = require('async/timeout');
const {getRouteThroughHops} = require('ln-service');
const {getWalletInfo} = require('ln-service');
const {payViaRoutes} = require('ln-service');
const {returnResult} = require('asyncjs-util');
const {routeFromChannels} = require('ln-service');

const invalidCltvExpiry = 'IncorrectCltvExpiry';
const invalidPaymentMessage = 'UnknownPaymentHash';
const {isArray} = Array;
const mtokensFromTokens = tokens => (BigInt(tokens) * BigInt(1e3)).toString();
const pathfindingTimeoutMs = 1000 * 60 * 90;
const payWithTimeout = timeout => asyncTimeout(payViaRoutes, timeout);

/** Find out if route is payable

  {
    channels: [{
      capacity: <Maximum Tokens Number>
      destination: <Next Node Public Key Hex String>
      id: <Standard Format Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged Per Million Tokens Number>
        is_disabled: <Channel Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
    }]
    cltv: <Final CLTV Delta Number>
    lnd: <Authenticated LND API Object>
    [mtokens]: <Payable Millitokens String>
    timeout: <Path Attempt Timeout Milliseconds Number>
    [tokens]: <Payable Tokens Number>
  }

  @returns via cbk or Promise
  {
    is_payable: <Route is Payable Bool>
    route: {
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Forward Edge Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      [payment]: <Payment Identifier Hex String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
      [total_mtokens]: <Payment Total Millitokens String>
    }
  }
*/
module.exports = ({channels, cltv, lnd, mtokens, timeout, tokens}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isArray(channels)) {
          return cbk([400, 'ExpectedArrayOfChannelsToTestRoutePayable']);
        }

        if (!cltv) {
          return cbk([400, 'ExpectedFinalCltvDeltaToTestRoutePayable']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToTestRoutePayable']);
        }

        if (!mtokens && !tokens) {
          return cbk([400, 'ExpectedMTokensOrTokensToTestRoutePayable']);
        }

        return cbk();
      },

      // Get current height
      getHeight: cbk => getWalletInfo({lnd}, cbk),

      // Build a route
      getRoute: ['validate', ({}, cbk) => {
        const [firstHop] = channels;

        return getRouteThroughHops({
          lnd,
          cltv_delta: cltv,
          mtokens: mtokens || mtokensFromTokens(tokens),
          outgoing_channel: channels.map(n => n.id).slice().shift().id,
          public_keys: channels.map(n => n.destination),
        },
        (err, res) => {
          // Exit early when there is an error and use local route calculation
          if (!!err) {
            return cbk();
          }

          return cbk(null, res.route);
        });
      }],

      // Assemble route
      route: ['getHeight', ({getHeight}, cbk) => {
        const {route} = routeFromChannels({
          channels,
          cltv_delta: cltv,
          height: getHeight.current_block_height,
          mtokens: mtokens || mtokensFromTokens(tokens),
        });

        return cbk(null, route);
      }],

      // Attempt the route
      attempt: ['getRoute', 'route', ({getRoute, route}, cbk) => {
        return payWithTimeout(timeout || pathfindingTimeoutMs)({
          lnd,
          pathfinding_timeout: pathfindingTimeoutMs,
          routes: [getRoute || route],
        },
        err => {
          if (!!err && !isArray(err)) {
            return cbk(null, {is_payable: false});
          }

          const [, code] = err;

          if (code === invalidCltvExpiry) {
            return cbk([503, 'UnexpectedErrorCode', {err}]);
          }

          const isPayable = code === invalidPaymentMessage;

          return cbk(null, {
            is_payable: isPayable,
            route: isPayable ? (getRoute || route) : undefined,
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'attempt'}, cbk));
  });
};
