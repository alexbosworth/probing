const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {getChannel} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {isArray} = Array;

/** Lookup the routing policies for channels in a routing series

  {
    channels: [{
      capacity: <Channel Total Capacity Number>
      destination: <Next Hop Destination Public Key Hex String>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        public_key: <Node Public Key String>
      }]
    }]
    hops: [{
      channel: <Standard Format Channel Id String>
      public_key: <Forward to Public Key With Hex String>
    }]
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    channels: [{
      capacity: <Channel Total Capacity Number>
      destination: <Next Hop Destination Public Key Hex String>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        public_key: <Node Public Key String>
      }]
    }]
  }
*/
module.exports = ({channels, hops, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isArray(channels)) {
          return cbk([400, 'ExpectedKnownChannelsToGetPoliciesForChannels']);
        }

        if (!isArray(hops)) {
          return cbk([400, 'ExpectedHopsSeriesToGetPoliciesForChannels']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedLndObjectToGetPoliciesForCHannels']);
        }

        return cbk();
      },

      // Get the channels
      getChannels: ['validate', ({}, cbk) => {
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

      // Final set of routing channels
      channels: ['getChannels', ({getChannels}, cbk) => {
        return cbk(null, {channels: getChannels});
      }],
    },
    returnResult({reject, resolve, of: 'channels'}, cbk));
  });
};
