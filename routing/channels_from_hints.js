const {parsePaymentRequest} = require('invoices');

const defaultCapacity = Number.MAX_SAFE_INTEGER;

/** Derive channels back from hop hints

  {
    [request]: <BOLT 11 Request String>
    [routes]: [[{
      [base_fee_mtokens]: <Base Fee Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
      [fee_rate]: <Fee Rate Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
  }

  @returns
  {
    channels: [{
      capacity: <Maximum Tokens Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        public_key: <Node Public Key String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      [updated_at]: <Channel Last Updated At ISO 8601 Date String>
    }]
  }
*/
module.exports = ({request, routes}) => {
  const channels = [];

  if (!request && !routes) {
    return {channels};
  }

  const hints = !!routes ? routes : parsePaymentRequest({request}).routes;

  if (!hints || !hints.length) {
    return {channels};
  }

  hints.forEach(route => {
    return route.forEach((hop, i) => {
      // Skip the first hop which is just an anchor
      if (!i) {
        return;
      }

      channels.push({
        capacity: defaultCapacity,
        destination: hop.public_key,
        id: hop.channel,
        policies: [
          {
            base_fee_mtokens: hop.base_fee_mtokens,
            cltv_delta: hop.cltv_delta,
            fee_rate: hop.fee_rate,
            public_key: route[--i].public_key,
          },
          {
            public_key: hop.public_key,
          },
        ],
      });
    });
  });

  return {channels};
};
