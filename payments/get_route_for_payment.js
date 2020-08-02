const asyncAuto = require('async/auto');
const {getChannels} = require('ln-service');
const {getRouteThroughHops} = require('ln-service');
const {getWalletInfo} = require('ln-service');
const {returnResult} = require('asyncjs-util');
const {routeFromChannels} = require('ln-service');

const {channelsFromHints} = require('./../routing');
const {getPoliciesForChannels} = require('./../graph');

const {isArray} = Array;

/** Get a payment route for a payment along a path of channels and relays

  {
    cltv_delta: <Final CLTV Delta Number>
    destination: <Final Destination Public Key Hex String>
    lnd: <Authenticated LND API Object>
    [messages]: [{
      type: <Message Type Number String>
      value: <Message Raw Value Hex Encoded String>
    }]
    mtokens: <Millitokens To Send String>
    path: {
      channels: [<Standard Format Channel Id String>]
      relays: [<Relaying Node Public Key Hex String>]
    }
    payment: <Payment Identifier Hex String>
    [routes]: [[{
      [base_fee_mtokens]: <Base Fee Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
      [fee_rate]: <Fee Rate Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    total_mtokens: <Total Millitokens String>
  }

  @returns via cbk or Promise
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
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Millitokens To Pay String>
      [payment]: <Payment Identifier Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
      [total_mtokens]: <Total Millitokens String>
    }
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.cltv_delta) {
          return cbk([400, 'ExpectedFinalCltvDeltaToGetRouteForPayment']);
        }

        if (!args.destination) {
          return cbk([400, 'ExpectedDestinationToGetRouteForPayment']);
        }

        if (!args.lnd) {
          return cbk([400, 'ExpectedLndToGetRouteForPayment']);
        }

        if (!args.mtokens) {
          return cbk([400, 'ExpectedMillitokensToGetRouteForPayment']);
        }

        if (!args.path) {
          return cbk([400, 'ExpectedPaymentPathToGetRouteForPayment']);
        }

        if (!isArray(args.path.channels)) {
          return cbk([400, 'ExpectedArrayOfChannelsInPath']);
        }

        if (!args.payment) {
          return cbk([400, 'ExpectedPaymentIdentifierToGetRouteForPayment']);
        }

        if (!!args.routes && !isArray(args.routes)) {
          return cbk([400, 'ExpectedRoutesArrayToGetRouteForPayment']);
        }

        if (!args.total_mtokens) {
          return cbk([400, 'ExpectedTotalMillitokensToGetRouteForPayment']);
        }

        return cbk();
      },

      // Build a route from the channels
      getRoute: ['validate', ({}, cbk) => {
        // Exit early when hop hint routes are specified
        if (!!args.routes) {
          return cbk();
        }

        const [channel] = args.path.channels;

        return getRouteThroughHops({
          cltv_delta: args.cltv_delta,
          lnd: args.lnd,
          mtokens: args.mtokens,
          outgoing_channel: channel,
          payment: args.payment,
          public_keys: args.path.relays,
          total_mtokens: args.total_mtokens,
        },
        (err, res) => {
          // Exit early when there is an error and use local route calculation
          if (!!err) {
            return cbk();
          }

          return cbk(null, res.route);
        });
      }],

      // Get the current liquidity for the outgoing relaying peer
      getLiquidity: ['getRoute', ({getRoute}, cbk) => {
        // Exit early when getting a route worked
        if (!!getRoute) {
          return cbk();
        }

        const [partnerPublicKey] = args.path.relays;

        return getChannels({
          is_active: true,
          lnd: args.lnd,
          partner_public_key: partnerPublicKey,
        },
        cbk);
      }],

      // Calculate the hops from paths
      hops: ['getLiquidity', 'getRoute', ({getLiquidity, getRoute}, cbk) => {
        // Exit early when a route has been calculated by LND
        if (!!getRoute) {
          return cbk();
        }

        const hops = args.path.channels.map((channel, i) => {
          return {channel, public_key: args.path.relays[i]};
        });

        return cbk(null, hops);
      }],

      // Get the channel policy data associated with the payment
      getChannels: ['getRoute', 'hops', ({getRoute, hops}, cbk) => {
        // Exit early when a route has been calculated by LND
        if (!!getRoute) {
          return cbk();
        }

        const {channels} = channelsFromHints({routes: args.routes});

        return getPoliciesForChannels({channels, hops, lnd: args.lnd}, cbk);
      }],

      // Get current height as needed for route calculation
      getHeight: ['getRoute', ({getRoute}, cbk) => {
        // Exit early when a route has been calculated by LND
        if (!!getRoute) {
          return cbk();
        }

        return getWalletInfo({lnd: args.lnd}, cbk);
      }],

      // Fallback to directly assembling route to pay along
      route: [
        'getChannels',
        'getHeight',
        'getRoute',
        ({getChannels, getHeight, getRoute}, cbk) =>
      {
        // Exit early when a route has been calculated by LND
        if (!!getRoute) {
          return cbk(null, {route: getRoute});
        }

        // Derive the route locally
        const {route} = routeFromChannels({
          channels: getChannels.channels,
          cltv_delta: args.cltv_delta,
          height: getHeight.current_block_height,
          messages: args.messages,
          mtokens: args.mtokens,
          payment: args.payment,
          total_mtokens: args.total_mtokens,
        });

        return cbk(null, {route});
      }],
    },
    returnResult({reject, resolve, of: 'route'}, cbk));
  });
};
