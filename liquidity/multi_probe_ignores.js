const flatten = arr => [].concat(...arr);
const {isArray} = Array;
const notFound = -1;
const tokensAsMillitokens = tokens => BigInt(tokens) * BigInt(1e3);
const uniq = arr => Array.from(new Set(arr));

/** Calculate multi-probe ignore adjustments

  Treat all hops except the first as already used, so as not to overlap on
  subsequent probes.

  Every probe success on a peer will draw down budgets of their channels.

  The caller can check on these budgets to decide if it's time to move on to
  another public key, due to lack of budget.

  {
    channels: [{
      id: <Standard Format Channel Id String>
      local_balance: <Local Balance Tokens Number>
      local_reserve: <Local Reserve Tokens Number>
      partner_public_key: <Public Key Hex String>
    }]
    from: <From Public Key Hex String>
    ignore: [{
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    mtokens: <Starting Millitokens Number>
    probes: [{
      liquidity: <Route Maximum Number>
      relays: [<Public Key Hex String>]
    }]
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
  }

  @throws
  <Error>

  @returns
  {
    ignore: [{
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
  }
*/
module.exports = ({channels, from, ignore, mtokens, probes, routes}) => {
  if (!isArray(channels)) {
    throw new Error('ExpectedArrayofChannelsToGenerateMultiProbeIgnores');
  }

  if (!from) {
    throw new Error('ExpectedFromPublicKeyToGenerateMultiProbeIgnores');
  }

  if (!isArray(ignore)) {
    throw new Error('ExpectedIgnoreArrayToGenerateMultiProbeIgnores');
  }

  if (!mtokens) {
    throw new Error('ExpectedStartingMtokensWhenGeneratingMultiProbeIgnores');
  }

  if (!isArray(probes)) {
    throw new Error('ExpectedArrayOfProbesToGenerateMultiProbeIgnores');
  }

  if (probes.filter(n => !!n).length !== probes.length) {
    throw new Error('ExpectedProbeDetailsToGenerateMultiProbeIgnores');
  }

  if (!!probes.find(n => n.liquidity === undefined)) {
    throw new Error('ExpectedLiquidityDataToGenerateMultiProbeIgnores');
  }

  if (!!probes.find(n => !isArray(n.relays))) {
    throw new Error('ExpectedArrayOfRelaysToGenerateMultiProbeIgnores');
  }

  if (!!routes && !isArray(routes)) {
    throw new Error('ExpectedRoutesToBeArrayWhenGeneratingMultiProbeIgnores');
  }

  const pairs = probes.map(probe => {
    const [out, ...network] = probe.relays.map((to, i, arr) => {
      return {from_public_key: arr[--i] || from, to_public_key: to};
    });

    return {network, out: out.to_public_key, used: probe.liquidity};
  });

  // Collect the direct peers that were used to probe out of
  const outPeers = uniq(pairs.map(n => n.out));

  // Which direct peers have their liquidity exhausted?
  const exhausted = outPeers.filter(out => {
    const used = pairs.filter(n => n.out === out).map(n => n.used);

    const available = channels
      .filter(n => n.partner_public_key === out)
      .map(n => n.local_balance - n.local_reserve)
      .filter(n => tokensAsMillitokens(n) > BigInt(mtokens))
      .sort()
      .reverse();

    // Exit early when there are no available channels
    if (!available.length) {
      return true;
    }

    used.forEach(amount => {
      available.sort().reverse();

      const index = available.findIndex(n => n > amount);

      // Use the largest amount when there isn't a available fit
      if (index === notFound) {
        return available.shift();
      }

      available[index] -= amount;

      return;
    });

    // No channels with sufficient minimum balance means the peer is exhausted
    return !available.find(n => tokensAsMillitokens(n) > BigInt(mtokens));
  });

  // Direct peers with exhausted local liquidity should no longer be used
  const exhaustedIgnores = exhausted.map(to => ({
    from_public_key: from,
    to_public_key: to,
  }));

  // Indirect routing nodes should not be used twice
  const networkIgnores = flatten(pairs.map(n => n.network));

  // Final set of ignores without route exceptions
  const normalIgnores = []
    .concat(ignore)
    .concat(exhaustedIgnores)
    .concat(networkIgnores);

  // Exit early with normal ignores when there are no whitelisted hop hint hops
  if (!routes || !routes.length) {
    return {ignore: normalIgnores};
  }

  const [firstRoute] = routes;

  // The final hop includes the destination public key
  const [finalHop] = firstRoute.slice().reverse();  

  // When routes are specified, never ignore them
  const antiIgnores = flatten(routes.map(route => {
    return route.map(n => n.public_key).map((hop, i, hops) => {
      if (!i) {
        return {};
      }

      const nextHop = hops[i + [hop].length];
      const prevHop = hops[i - [hop].length];

      return {
        from_public_key: !!prevHop ? prevHop : getKey.public_key,
        to_public_key: !!nextHop ? nextHop : finalHop.public_key,
      };
    });
  }));

  // Derive a final set of ignores to use for a path search
  const filteredIgnores = normalIgnores.filter(ignore => {
    return !antiIgnores.find(anti => {
      const from = ignore.from_public_key;
      const to = ignore.to_public_key;

      return anti.from_public_key === from && anti.to_public_key === to;
    });
  });

  return {ignore: filteredIgnores};
};
