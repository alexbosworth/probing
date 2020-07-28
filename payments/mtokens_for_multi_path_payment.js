const min = (a, b) => (a < b ? a : b).toString();
const tokensAsMillitokens = tokens => BigInt(tokens) * BigInt(1e3);
const sumOf = arr => arr.reduce((sum, n) => sum + BigInt(n), BigInt(Number()));

/** Derive mtokens to use on a payment path given other in-flight payments

  {
    failed: [<Payment Id Number>]
    liquidity: <Working Liquidity Total Tokens>
    paying: [{
      id: <Payment Id Number>
      mtokens: <Paying Millitokens String>
    }]
    total: <Total Millitokens String>
  }

  @returns
  {
    [mtokens]: <Millitokens To Send On Given Path String>
  }
*/
module.exports = ({failed, liquidity, paying, total}) => {
  // In-flight pending payments have not yet failed
  const pending = paying.filter(({id}) => !failed.includes(id));

  // Convert amounts pending into a BigInt total
  const amountPending = sumOf(pending.map(({mtokens}) => mtokens));

  // How much is still needed to be paid?
  const amountRequired = BigInt(total) - amountPending;

  if (amountRequired > BigInt(Number())) {
    // Return the amount needed or the liquidity, whatever is lower
    return {mtokens: min(amountRequired, tokensAsMillitokens(liquidity))};
  }

  return {};
};
