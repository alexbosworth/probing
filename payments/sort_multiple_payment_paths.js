/** Sort the multiple payment paths

  {
    paths: [{
      channels: [<Standard Format Channel Id String>]
      fee: <Fee Amount Tokens>
      liquidity: <Liquidity Total Tokens>
      relays: [<Relaying Node Public Key Hex String>]
    }]
  }

  @returns
  {
    sorted: [{
      channels: [<Standard Format Channel Id String>]
      fee: <Fee Amount Tokens>
      liquidity: <Liquidity Total Tokens>
      relays: [<Relaying Node Public Key Hex String>]
    }]
  }
*/
module.exports = ({paths}) => {
  const sorted = paths.slice().sort((a, b) => {
    // Favor cheaper liquidity rates
    if (a.fee / a.liquidity < b.fee / b.liquidity) {
      return -1;
    }

    if (a.fee / a.liquidity > b.fee / b.liquidity) {
      return 1;
    }

    // In a tie on fees, favor more liquidity
    if (a.liquidity > b.liquidity) {
      return -1;
    }

    if (a.liquidity < b.liquidity) {
      return 1;
    }

    // In a tie on fees and liquidity, favor shorter paths
    if (a.channels.length < b.channels.length) {
      return -1;
    }

    if (a.channels.length > b.channels.length) {
      return 1;
    }

    return 0;
  });

  return {sorted};
};
