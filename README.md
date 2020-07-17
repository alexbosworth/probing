# Probing

Utility methods to assist in probing Lightning Network destinations

# Methods

## subscribeToFindMaxPayable

Subscribe to a probe to find the max routable amount along a route

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

