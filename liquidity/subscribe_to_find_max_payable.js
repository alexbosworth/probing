const EventEmitter = require('events');

const findMaxPayable = require('./find_max_payable');

const {nextTick} = process;

/** Subscribe to a probe to find the max routable amount along a route

  {
    cltv: <Final CLTV Delta Number>
    [delay]: <Attempt Delay Milliseconds Number>
    hops: [{
      channel: <Standard Format Channel Id String>
      public_key: <Forward to Public Key With Hex String>
    }]
    lnd: <Authenticated LND API Object>
    max: <Max Attempt Tokens Number>
    [request]: <BOLT 11 Payment Request String>
    [routes]: [[{
      base_fee_mtokens: <Base Routing Fee In Millitokens Number>
      channel: <Standard Format Channel Id String>
      cltv_delta: <CLTV Blocks Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]]
  }

  @returns
  <Find Max Payable EventEmitter Object>

  @event 'error'
  <Error Array>

  @event 'evaluating'
  {
    tokens: <Evaluating Tokens Number>
  }

  @event 'failure'
  {}

  @event 'success'
  {
    maximum: <Maximum Routeable Tokens Number>
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
      mtokens: <Total Fee-Inclusive Millitokens String>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }
  }
*/
module.exports = ({cltv, delay, hops, lnd, max, request, routes}) => {
  const emitter = new EventEmitter();

  const emit = (event, data) => emitter.emit(event, data);

  nextTick(() => {
    return findMaxPayable({
      cltv,
      delay,
      emitter,
      hops,
      lnd,
      max,
      request,
      routes,
    },
    (err, res) => {
      if (!!err) {
        return !!emitter.listenerCount('error') ? emit('error', err) : null;
      }

      if (!res.maximum) {
        return emit('failure', {});
      }

      return emit('success', {maximum: res.maximum, route: res.route});
    });

    return;
  });

  return emitter;
};
