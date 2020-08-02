/** Attempt a payment on multiple paths

  {
  }
*/
module.exports = ({}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      
    },
    returnResult({reject, resolve, of: 'attempt'}, cbk));
  });
};
