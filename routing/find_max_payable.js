const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {getChannel} = require('ln-service');
const {getMaximum} = require('asyncjs-util');
const {parsePaymentRequest} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const channelsFromHints = require('./channels_from_hints');
const isRoutePayable = require('./is_route_payable');
const {maxHtlcAcrossRoute} = require('./../graph');

const accuracy = 10000;
const defaultAttemptDelayMs = 1000 * 1;
const {isArray} = Array;
const from = 1;
const {min} = Math;
const nextAttemptDelayMs = 1000 * 1;
const to = tokens => Math.max(2, tokens - Math.round(Math.random() * 1000));

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
      channels: ['validate', ({}, cbk) => {
        const {channels} = channelsFromHints({request});

        return asyncMap(hops, (hop, cbk) => {
          return getChannel({lnd, id: hop.channel}, (err, channel) => {
            // Avoid returning an error when channel is known from hops
            if (!!err && !!channels.find(n => n.id === hop.channel)) {
              return cbk(null, channels.find(n => n.id === hop.channel));
            }

            // Exit early when there is an error getting the channel
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, {
              capacity: channel.capacity,
              destination: hop.public_key,
              id: hop.channel,
              policies: channel.policies,
            });
          });
        },
        cbk);
      }],

      // Determine if route is payable with a reasonable amount
      isMinimallyPayable: ['channels', ({channels}, cbk) => {
        const tokens = to(accuracy);

        return isRoutePayable({channels, cltv, lnd, tokens}, cbk);
      }],

      // Find maximum
      findMax: [
        'channels',
        'isMinimallyPayable',
        ({channels, isMinimallyPayable}, cbk) =>
      {
        if (!isMinimallyPayable.is_payable) {
          return cbk(null, {maximum: Number()});
        }

        const attemptDelayMs = delay || defaultAttemptDelayMs;
        let isPayable = false;
        const routeMax = maxHtlcAcrossRoute({channels});

        const limit = to(min(routeMax.max_htlc_tokens, max));

        return getMaximum({accuracy, from, to: limit}, ({cursor}, cbk) => {
          const tokens = cursor;

          // Emit evaluating
          emitter.emit('evaluating', {tokens});

          return isRoutePayable({channels, cltv, lnd, tokens}, (err, res) => {
            // Exit early when there is an error probing the route
            if (!!err) {
              return cbk(err);
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

          return cbk(null, {maximum: res.maximum});
        });
      }],
    },
    returnResult({reject, resolve, of: 'findMax'}, cbk));
  });
};
