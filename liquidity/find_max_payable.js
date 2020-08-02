const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {getChannel} = require('ln-service');
const {getMaximum} = require('asyncjs-util');
const {parsePaymentRequest} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {channelsFromHints} = require('./../routing');
const {getPoliciesForChannels} = require('./../graph');
const {isRoutePayable} = require('./../routing');
const {maxHtlcAcrossRoute} = require('./../graph');

const accuracy = 50000;
const defaultAttemptDelayMs = 1000 * 1;
const {isArray} = Array;
const from = 1;
const {min} = Math;
const nextAttemptDelayMs = 1000 * 1;
const to = tokens => Math.max(2, tokens - Math.round(Math.random() * 20000));

/** Find max routable

  {
    cltv: <Final CLTV Delta Number>
    [delay]: <Attempt Delay Milliseconds Number>
    emitter: <EventEmitter Object>
    hops: [{
      channel: <Standard Format Channel Id String>
      public_key: <Forward to Public Key With Hex String>
    }]
    lnd: <Authenticated LND API Object>
    logger: <Winston Logger Object>
    max: <Max Attempt Tokens Number>
    [request]: <BOLT 11 Payment Request String>
  }

  @returns via cbk or Promise
  {
    [maximum]: <Maximum Routeable Tokens Number>
    [route]: {
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
      mtokens: <Total Fee-Inclusive Millitokens String>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }
  }
*/
module.exports = ({cltv, delay, emitter, hops, lnd, max, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!cltv) {
          return cbk([400, 'ExpectedFinalCltvToFindMaxPayable']);
        }

        if (!emitter) {
          return cbk([400, 'ExpectedEmitterToFindMaxPayable']);
        }

        if (!isArray(hops)) {
          return cbk([400, 'ExpectedArrayOfHopsToFindMaxPayable']);
        }

        if (!!hops.find(({channel}) => !channel)) {
          return cbk([400, 'ExpectedChannelsInHopsToFindMaxPayable']);
        }

        if (!!hops.find(n => !n.public_key)) {
          return cbk([400, 'ExpectedPublicKeyInHopsToFindMaxPayable']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndToFindMaxPayableAmount']);
        }

        if (!max) {
          return cbk([400, 'ExpectedMaxLimitTokensToFindMaxPayable']);
        }

        return cbk();
      },

      // Get channels
      getChannels: ['validate', ({}, cbk) => {
        const {channels} = channelsFromHints({request});

        return getPoliciesForChannels({channels, hops, lnd}, cbk);
      }],

      // Determine if route is payable with a reasonable amount
      isMinimallyPayable: ['getChannels', ({getChannels}, cbk) => {
        const {channels} = getChannels;
        const tokens = to(accuracy);

        return isRoutePayable({channels, cltv, lnd, tokens}, cbk);
      }],

      // Find maximum
      findMax: [
        'getChannels',
        'isMinimallyPayable',
        ({getChannels, isMinimallyPayable}, cbk) =>
      {
        if (!isMinimallyPayable.is_payable) {
          return cbk(null, {maximum: Number()});
        }

        const attemptDelayMs = delay || defaultAttemptDelayMs;
        const {channels} = getChannels;
        let isPayable = false;
        const routeMax = maxHtlcAcrossRoute({channels});
        const routes = [];

        const limit = Math.max(
          accuracy + accuracy,
          to(min(routeMax.max_htlc_tokens, max))
        );

        return getMaximum({accuracy, from, to: limit}, ({cursor}, cbk) => {
          const tokens = cursor;

          // Emit evaluating
          emitter.emit('evaluating', {tokens});

          return isRoutePayable({channels, cltv, lnd, tokens}, (err, res) => {
            // Exit early when there is an error probing the route
            if (!!err) {
              return cbk(err);
            }

            if (!!res.is_payable) {
              routes.push(res.route);
            }

            isPayable = !!res.is_payable ? tokens : isPayable;

            return setTimeout(() => cbk(null, res.is_payable), attemptDelayMs);
          });
        },
        (err, res) => {
          if (!!err) {
            return cbk(err);
          }

          if (!isPayable) {
            return cbk(null, {maximum: Number()});
          }

          const [route] = routes.sort((a, b) => a.tokens - b.tokens).reverse();

          return cbk(null, {route, maximum: res.maximum});
        });
      }],
    },
    returnResult({reject, resolve, of: 'findMax'}, cbk));
  });
};
