/** Derive hops for finding max liquidity along a path

  {
    channels: [{
      id: <Standard Format Channel Id String>
      is_active: <Channel Is Active Bool>
      local_balance: <Local Balance Tokens Number>
      partner_public_key: <Partner Public Key Hex String>
    }]
    hops: [{
      channel: <Standard Format Channel Id String>
      public_key: <Forward to Public Key With Hex String>
    }]
    probes: [[<Channel Id String>]]
  }

  @returns
  {
    [hops]: [{
      channel: <Standard Format Channel Id String>
      public_key: <Forward to Public Key With Hex String>
    }]
  }
*/
module.exports = ({channels, hops, probes}) => {
  const [outHop, ...networkHops] = hops;

  // Out channels that were already used on other probes will be removed
  const usedOutChannels = probes.map(probe => {
    const [out] = probe;

    return out;
  });

  const [unused] = channels
    .filter(channel => {
      if (!channel.is_active) {
        return false;
      }

      if (!channel.local_balance) {
        return false;
      }

      if (channel.partner_public_key !== outHop.public_key) {
        return false;
      }

      return !usedOutChannels.includes(channel.id);
    })
    .sort((a, b) => {
      if (a.local_balance > b.local_balance) {
        return -1;
      }

      if (a.local_balance < b.local_balance) {
        return 1;
      }

      return 0;
    });

  // Exit early when there is no remaining outbound channel to use
  if (!unused) {
    return {};
  }

  const unusedOutHop = {
    channel: unused.id,
    public_key: unused.partner_public_key,
  };

  return {
    hops: [].concat([unusedOutHop]).concat(networkHops),
    max: unused.local_balance,
  };
};
