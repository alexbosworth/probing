# Probing

Utility methods to assist in probing Lightning Network destinations

# Methods

## getSyntheticOutIgnores

Get a synthetic ignore list to simulate an outbound restriction

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

## subscribeToFindMaxPayable

Subscribe to a probe to find the max routable amount along a route

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
    }

## subscribeToMultiPathPay

Subscribe to a payment over multiple paths

    {
      [cltv_delta]: <Final CLTV Delta Number>
      destination: <Destination Public Key Hex String>
      id: <Payment Hash Hex String>
      lnd: <Authenticated LND API Object>
      [max_attempts]: <Maximum Routing Failure Retries Number>
      max_fee: <Maximum Total Fee Tokens>
      [max_timeout]: <Maximum Payment Expiration Height Number>
      mtokens: <Total Millitokens to Send String>
      paths: [{
        channels: [<Standard Format Channel Id String>]
        fee: <Fee Amount Tokens>
        fee_mtokens: <Fee Amount Millitokens String>
        liquidity: <Liquidity Total Tokens>
        relays: [<Relaying Node Public Key Hex String>]
      }]
      payment: <Payment Identifier Hex String>
      [routes]: [[{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <Final CLTV Expiration Blocks Delta Number>
        [fee_rate]: <Fee Rate Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
    }

    @throws
    <Error Object>

    @returns
    <EventEmitter Object>

    @event 'error'
    <Error Array>

    @event 'failure'
    {}

    @event 'paid'
    {
      secret: <Payment Secret Preimage Hex String>
    }

    @event 'path_success'
    {
      fee: <Fee Paid Tokens Number>
      fee_mtokens: <Fee Paid Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Hop Channel Capacity Tokens Number>
        fee_mtokens: <Hop Forward Fee Millitokens String>
        forward_mtokens: <Hop Forwarded Millitokens String>
        timeout: <Hop CLTV Expiry Block Height Number>
      }]
      id: <Payment Hash Hex String>
      is_confirmed: <Is Confirmed Bool>
      is_outgoing: <Is Outoing Bool>
      mtokens: <Total Millitokens Sent String>
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
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Secret Preimage Hex String>
      tokens: <Total Tokens Sent Number>
    }

    @event 'paying'
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
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
    }

    @event 'routing_failure'
    {
      [channel]: <Standard Format Channel Id String>
      [height]: <Failure Height Context Number>
      [index]: <Failure Hop Index Number>
      [mtokens]: <Failure Related Millitokens String>
      [policy]: {
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged in Millitokens Per Million Number>
        [is_disabled]: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HLTC Millitokens value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
      }
      public_key: <Public Key Hex String>
      reason: <Failure Reason String>
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
        mtokens: <Total Millitokens To Pay String>
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }
      [timeout_height]: <Failure Related CLTV Timeout Height Number>
      [update]: {
        chain: <Chain Id Hex String>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Hex String>
        message_flags: <Message Flags Number>
        signature: <Channel Update Signature Hex String>
      }
    }

    @event 'success'
    {
      routes: [{
        fee: <Fee Paid Tokens Number>
        fee_mtokens: <Fee Paid Millitokens String>
        hops: [{
          channel: <Standard Format Channel Id String>
          channel_capacity: <Hop Channel Capacity Tokens Number>
          fee_mtokens: <Hop Forward Fee Millitokens String>
          forward_mtokens: <Hop Forwarded Millitokens String>
          timeout: <Hop CLTV Expiry Block Height Number>
        }]
        id: <Payment Hash Hex String>
        is_confirmed: <Is Confirmed Bool>
        is_outgoing: <Is Outoing Bool>
        mtokens: <Total Millitokens Sent String>
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
          mtokens: <Total Millitokens To Pay String>
          timeout: <Expiration Block Height Number>
          tokens: <Total Tokens To Pay Number>
        }
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        secret: <Payment Secret Preimage Hex String>
        tokens: <Total Tokens Sent Number>
      }]
    }

## subscribeToMultiPathProbe

Subscribe to find multiple paths to a destination

This method is not supported on versions below LND 0.10.0

    {
      cltv_delta: <Final CLTV Delta Number>
      [destination]: <Destination Public Key Hex String>
      [features]: [{
        bit: <Feature Bit Number>
      }]
      [ignore]: [{
        from_public_key: <Avoid Node With Public Key Hex String>
        [to_public_key]: <To Public Key Hex String>
      }]
      [incoming_peer]: <Pay In Through Public Key Hex String>
      lnd: <Authenticated LND API Object>
      [max_paths]: <Maximum Probe Paths Number>
      [max_timeout_height]: <Maximum CLTV Timeout Height Number>
      [mtokens]: <Smallest Path Liquidity Millitokens Number>
      [outgoing_channel]: <Out Through Channel Id String>
      [path_timeout_ms]: <Skip Individual Path Attempt After Milliseconds Number>
      [probe_timeout_ms]: <Fail Individual Probe After Milliseconds Number>
      [routes]: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
    }

    @throws
    <Error Array>

    @returns
    <EventEmitter Object>

    @event 'error'
    <Error Array>

    @event 'evaluating'
    {
      tokens: <Tokens Number>
    }

    @event 'failure'
    {}

    @event 'probing'
    {
      route: {
        [confidence]: <Route Confidence Score Out Of One Million Number>
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
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sent Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
        [total_mtokens]: <Total Millitokens String>
      }
    }

    @event 'routing_failure'
    {
      [channel]: <Standard Format Channel Id String>
      index: <Failure Index Number>
      [mtokens]: <Millitokens String>
      [policy]: {
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged in Millitokens Per Million Number>
        [is_disabled]: <Channel is Disabled Bool>
        max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        [public_key]: <Public Key Hex String>
        [updated_at]: <Updated At ISO 8601 Date String>
      }
      [public_key]: <Public Key Hex String>
      reason: <Failure Reason String>
      route: {
        [confidence]: <Route Confidence Score Out Of One Million Number>
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
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sent Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
        [total_mtokens]: <Total Millitokens String>
      }
      [update]: {
        chain: <Chain Id Hex String>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Hex String>
        message_flags: <Message Flags Number>
        signature: <Channel Update Signature Hex String>
      }
    }

    @event 'routing_success'
    {
      route: {
        [confidence]: <Route Confidence Score Out Of One Million Number>
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
        safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Sent Tokens Rounded Up Number>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
        [total_mtokens]: <Total Millitokens String>
      }
      [update]: {
        chain: <Chain Id Hex String>
        channel_flags: <Channel Flags Number>
        extra_opaque_data: <Extra Opaque Data Hex String>
        message_flags: <Message Flags Number>
        signature: <Channel Update Signature Hex String>
      }
    }

    @event 'success'
    {
      paths: [{
        channels: [<Standard Format Channel Id String>]
        fee: <Fee Amount Tokens>
        fee_mtokens: <Fee Amount Millitokens String>
        liquidity: <Liquidity Total Tokens>
        relays: [<Relaying Node Public Key Hex String>]
      }]
    }

