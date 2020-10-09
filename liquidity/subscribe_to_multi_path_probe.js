const EventEmitter = require('events');

const asyncAuto = require('async/auto');
const asyncWhilst = require('async/whilst');
const {getWalletInfo} = require('ln-service');

const subscribeToFindPath = require('./subscribe_to_find_path');

const defaultMaxPaths = 5;
const {nextTick} = process;

/** Subscribe to find multiple paths to a destination

  This method is not supported on versions below LND 0.10.0

  {
    [allow_stacking]: [{
      from_public_key: <Allow Path Stacking From Public Key Hex String>
      to_public_key: <Allow Path Stacking To Public Key Hex String>
    }]
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

  @event 'path'
  {
    channels: [<Standard Format Channel Id String>]
    fee: <Fee Amount Tokens>
    fee_mtokens: <Fee Amount Millitokens String>
    liquidity: <Liquidity Total Tokens>
    relays: [<Relaying Node Public Key Hex String>]
  }

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
    [mtokens]: <Millitokens String>
    [policy]: {
      base_fee_mtokens: <Base Fee Millitokens String>
      cltv_delta: <Locktime Delta Number>
      fee_rate: <Fees Charged in Millitokens Per Million Number>
      [is_disabled]: <Channel is Disabled Bool>
      max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
      min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
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
*/
module.exports = args => {
  const emitter = new EventEmitter();

  if (!args.cltv_delta) {
    throw [400, 'ExpectedFinalCltvDeltaToSubscribeToMultiPathProbe'];
  }

  if (!args.destination && !args.request) {
    throw [400, 'ExpectedDestinationOrRequestToSubscribeToMultiPathProbe'];
  }

  if (!args.lnd) {
    throw [400, 'ExpectedLndApiObjectToSubscribeToMultiPathProbe'];
  }

  const emit = (event, data) => emitter.emit(event, data);
  const failures = [];
  const paths = [];

  asyncAuto({
    // Wait for subscribers to attach events
    init: cbk => nextTick(cbk),

    // Get the source public key
    getPublicKey: ['init', ({}, cbk) => getWalletInfo({lnd: args.lnd}, cbk)],

    // Find paths
    getPaths: ['getPublicKey', ({getPublicKey}, cbk) => {
      return asyncWhilst(
        cbk => {
          // Exit when specified paths have been tried
          if ((args.max_paths || defaultMaxPaths) === paths.length) {
            return cbk(null, false);
          }

          // Exit when a path has a failure to find a route
          if (!!failures.length) {
            return cbk(null, false);
          }

          return cbk(null, true);
        },
        cbk => {
          const sub = subscribeToFindPath({
            allow_stacking: args.allow_stacking,
            cltv_delta: args.cltv_delta,
            destination: args.destination,
            evaluation_delay_ms: args.evaluation_delay_ms,
            features: args.features,
            ignore: args.ignore,
            incoming_peer: args.incoming_peer,
            lnd: args.lnd,
            max_timeout_height: args.max_timeout_height,
            mtokens: args.mtokens,
            outgoing_channel: args.outgoing_channel,
            path_timeout_ms: args.path_timeout_ms,
            probe_timeout_ms: args.probe_timeout_ms,
            probes: paths,
            public_key: getPublicKey.public_key,
            routes: args.routes,
            tokens: args.tokens,
          });

          sub.on('error', err => cbk(err));
          sub.on('evaluating', ({tokens}) => emit('evaluating', {tokens}));

          // A probe failed
          sub.on('failure', failure => {
            failures.push(failure);

            return cbk();
          });

          sub.on('probing', ({route}) => emit('probing', {route}));
          sub.on('routing_failure', fail => emit('routing_failure', fail));

          sub.on('routing_success', ({route}) => {
            return emit('routing_success', ({route}));
          });

          // A path was found
          sub.on('success', path => {
            emit('path', path);

            paths.push({
              channels: path.channels,
              fee: path.fee,
              fee_mtokens: path.fee_mtokens,
              liquidity: path.liquidity,
              relays: path.relays,
            });

            return cbk();
          });

          return;
        },
        cbk
      );
    }],
  },
  err => {
    // Exit early when there is an error but no error listener
    if (!!err && !emitter.listenerCount('error')) {
      return;
    }

    if (!!err) {
      return emitter.emit('error', err);
    }

    // Exit early with failure when no probes resulted in amount
    if (!paths.length) {
      return emitter.emit('failure', {});
    }

    return emitter.emit('success', {paths});
  });

  return emitter;
};
