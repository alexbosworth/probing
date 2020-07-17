const EventEmitter = require('events');

const findMaxPayable = require('./find_max_payable');

/** Subscribe to a probe to find the max routable amount along a route

  {
    cltv: <Final CLTV Delta Number>
    hops: [{
      channel: <Standard Format Channel Id String>
      public_key: <Forward to Public Key With Hex String>
    }]
    lnd: <Authenticated LND API Object>
    max: <Max Attempt Tokens Number>
    [request]: <BOLT 11 Payment Request String>
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

  @event 'success'
  {
    maximum: <Maximum Routeable Tokens Number>
  }
*/
module.exports = ({cltv, hops, lnd, max, request}) => {
  const emitter = new EventEmitter();

  findMaxPayable({cltv, emitter, hops, lnd, max, request}, (err, res) => {
    if (!!err) {
      return !!emitter.listenerCount('error') ? emitter.emit('error') : null;
    }

    if (!res.maximum) {
      return emitter.emit('failure', {});
    }

    return emitter.emit('success', {maximum: res.maximum});
  });

  return emitter;
};
