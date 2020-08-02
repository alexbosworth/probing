const asyncAuto = require('async/auto');
const {getChannels} = require('ln-service');
const {getWalletInfo} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {isArray} = Array;

/** Get a synthetic ignore list to simulate an outbound restriction

  {
    [ignore]: [{
      from_public_key: <From Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    lnd: <Authenticated LND API Object>
    out: [<Out Through Public Key Hex String>]
  }

  @returns via cbk or Promise
  {
    ignore: [{
      from_public_key: <From Public Key Hex String>
      to_public_key: <From Public Key Hex String>
    }]
  }
*/
module.exports = ({ignore, lnd, out}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd) {
          return cbk([400, 'ExpectedAuthenticatedLndToGetOutIgnores']);
        }

        if (!isArray(out)) {
          return cbk([400, 'ExpectedArrayOfOutWhitelistedPublicKeys']);
        }

        return cbk();
      },

      // Get list of channels
      getChannels: ['validate', ({}, cbk) => getChannels({lnd}, cbk)],

      // Get local public key
      getPublicKey: ['validate', ({}, cbk) => getWalletInfo({lnd}, cbk)],

      // Calculate total ignores
      ignore: [
        'getChannels',
        'getPublicKey',
        ({getChannels, getPublicKey}, cbk) =>
      {
        const peers = getChannels.channels.map(n => n.partner_public_key);

        const ignorePeers = peers.filter(peer => !out.includes(peer));

        const ignorePairs = ignorePeers.map(peer => ({
          from_public_key: getPublicKey.public_key,
          to_public_key: peer,
        }));

        return cbk(null, {
          ignore: [].concat(ignore || []).concat(ignorePairs),
        });
      }],
    },
    returnResult({reject, resolve, of: 'ignore'}, cbk));
  });
};
