const EventEmitter = require('events');

const asyncAuto = require('async/auto');
const {getChannels} = require('ln-service');
const {subscribeToProbeForRoute} = require('ln-service');

const hopsForFindMaxPath = require('./hops_for_find_max_path');
const multiProbeIgnores = require('./multi_probe_ignores');
const subscribeToFindMaxPayable = require('./subscribe_to_find_max_payable');

const defaultStartingMillitokens = (BigInt(1e5) * BigInt(1e3)).toString();
const flatten = arr => [].concat(...arr);
const {isArray} = Array;
const {max} = Math;
const {nextTick} = process;

/** Subscribe to a search within a multi probe given past probes

  {
    cltv_delta: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    [evaluation_delay_ms]: <Evaluation Delay Milliseconds Number>
    [features]: [{
      bit: <Feature Bit Number>
    }]
    [ignore]: [{
      from_public_key: <Avoid Node With Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [incoming_peer]: <Pay In Through Public Key Hex String>
    lnd: <Authenticated LND API Object>
    [max_timeout_height]: <Maximum CLTV Timeout Height Number>
    [mtokens]: <Smallest Path Millitokens String>
    [outgoing_channel]: <Out Through Channel Id String>
    [path_timeout_ms]: <Skip Individual Path Attempt After Milliseconds Number>
    [probe_timeout_ms]: <Fail Entire Probe After Milliseconds Number>
    probes: [{
      channels: [<Channel Id String>]
      liquidity: <Liquidity On Path Tokens Number>
      relays: [<Public Key Hex String>]
    }]
    public_key: <Source Public Key Hex String>
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
    [mtokens]: <Millitokens String>
    [policy]: {
      base_fee_mtokens: <Base Fee Millitokens String>
      cltv_delta: <Locktime Delta Number>
      fee_rate: <Fees Charged in Millitokens Per Million Number>
      [is_disabled]: <Channel is Disabled Bool>
      max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
      min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
    }
    public_key: <Public Key Hex String>
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
    channels: [<Standard Format Channel Id String>]
    fee: <Fee Amount Tokens String>
    fee_mtokens: <Fee Amount Millitokens String>
    liquidity: <Liquidity Total Tokens>
    relays: [<Relaying Node Public Key Hex String>]
  }
*/
module.exports = args => {
  if (!args.cltv_delta) {
    throw [400, 'ExpectedFinalCltvDeltaToFindMultiProbePath'];
  }

  if (!args.destination) {
    throw [400, 'ExpectedDestinationToFindMultiProbePath'];
  }

  if (!args.lnd) {
    throw [400, 'ExpectedLndToFindMultiProbePath'];
  }

  if (!isArray(args.probes)) {
    throw [400, 'ExpectedRecordOfProbesToFindMultiProbePath'];
  }

  if (args.probes.map(n => !!n).length !== args.probes.length) {
    throw [400, 'ExpectedArrayOfProbeDetailsToFindMultiProbePath'];
  }

  if (!args.public_key) {
    throw [400, 'ExpectedSourcePublicKeyToFindMultiProbePath'];
  }

  const emitter = new EventEmitter();

  const emit = (event, data) => emitter.emit(event, data);

  asyncAuto({
    init: cbk => nextTick(cbk),

    // Get the channels to figure out the local liquidity situation
    getChannels: ['init', ({}, cbk) => getChannels({lnd: args.lnd}, cbk)],

    // Run probe with ignore list
    probe: ['getChannels', ({getChannels}, cbk) => {
      // Exit early when there are no channels to probe out of
      if (!getChannels.channels.length) {
        return cbk();
      }

      // Calculate which paths to ignore to avoid interference patterns
      const {ignore} = multiProbeIgnores({
        channels: getChannels.channels,
        from: args.public_key,
        ignore: args.ignore || [],
        mtokens: args.mtokens || defaultStartingMillitokens,
        probes: args.probes.filter(n => !!n.relays),
        routes: args.routes,
      });

      const errors = [];
      const successes = [];

      // Probe to find a route
      const sub = subscribeToProbeForRoute({
        ignore,
        destination: args.destination,
        features: args.features,
        incoming_peer: args.incoming_peer,
        lnd: args.lnd,
        max_timeout_height: args.max_timeout_height,
        mtokens: args.mtokens || defaultStartingMillitokens,
        outgoing_channel: args.outgoing_channel,
        path_timeout_ms: args.path_timeout_ms,
        probe_timeout_ms: args.probe_timeout_ms,
        routes: args.routes,
      });

      // Probing for route found no result
      sub.on('end', () => cbk());

      // Probing for route hit an error
      sub.on('error', err => {
        sub.removeAllListeners();

        return cbk(err);
      });

      // A route was found
      sub.on('probe_success', ({route}) => {
        sub.removeAllListeners();

        emit('routing_success', ({route}));

        return cbk(null, route);
      });

      sub.on('probing', ({route}) => emit('probing', {route}));
      sub.on('routing_failure', failure => emit('routing_failure', failure));

      return;
    }],

    // Find maximum of liquidity on the route
    getLiquidity: ['getChannels', 'probe', ({getChannels, probe}, cbk) => {
      // Exit early when there is no found route
      if (!probe) {
        return cbk(null, {});
      }

      const {hops, max} = hopsForFindMaxPath({
        channels: getChannels.channels,
        hops: probe.hops,
        probes: args.probes.map(n => n.channels),
      });

      if (!hops) {
        return cbk(null, {});
      }

      // Search to find maximum liquidity on the path
      const sub = subscribeToFindMaxPayable({
        hops,
        max,
        cltv: args.cltv_delta,
        delay: args.evaluation_delay_ms,
        lnd: args.lnd,
        request: args.request,
      });

      sub.on('error', err => cbk(err));
      sub.on('evaluating', ({tokens}) => emit('evaluating', {tokens}));
      sub.on('failure', () => cbk(null, {}));

      sub.on('success', ({maximum, route}) => {
        return cbk(null, {hops, maximum, route});
      });

      return;
    }],
  },
  (err, res) => {
    // Exit early when there are no error listeners
    if (!!err && !emitter.listenerCount('error')) {
      return;
    }

    if (!!err) {
      return emit('error', err);
    }

    // Exit with failure when there was no maximum found for a route
    if (!res.getLiquidity.maximum) {
      return emit('failure', {});
    }

    return emit('success', {
      channels: res.getLiquidity.hops.map(n => n.channel),
      fee: res.getLiquidity.route.fee,
      fee_mtokens: res.getLiquidity.route.fee_mtokens,
      liquidity: res.getLiquidity.maximum,
      relays: res.probe.hops.map(n => n.public_key),
    });
  });

  return emitter;
};
