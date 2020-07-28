const asTokens = millitokens => Number(millitokens / BigInt(1e3));
const isSmaller = (a, b) => BigInt(a) < BigInt(b);
const maxPossible = Number.MAX_SAFE_INTEGER;

/** Given a set of channels representing a route, return max HTLC size

  {
    channels: [{
      capacity: <Capacity Tokens Number>
      destination: <Next Hop Public Key Hex String>
      policies: [{
        max_htlc_mtokens: <Maximum HTLC Millitokens String>
        public_key: <Public Key Hex String>
      }]
    }]
  }

  @returns
  {
    max_htlc_mtokens: <Maximum HTLC Millitokens String>
    max_htlc_tokens: <Maximum HTLC Tokens Number>
  }
*/
module.exports = ({channels}) => {
  // The maximum HTLC size is equal to the smallest max htlc mtokens
  const smallestMaxHtlcMtokens = channels
    .map(({destination, policies}) => {
      const [policy] = policies.filter(n => n.public_key !== destination);

      if (!policy.max_htlc_mtokens) {
        return BigInt(policy.capacity || maxPossible);
      }

      return BigInt(policy.max_htlc_mtokens);
    })
    .reduce((sum, n) => isSmaller(n, sum) ? n : sum, BigInt(maxPossible));

  return {
    max_htlc_tokens: asTokens(smallestMaxHtlcMtokens),
    max_htlc_mtokens: smallestMaxHtlcMtokens.toString(),
  };
};
