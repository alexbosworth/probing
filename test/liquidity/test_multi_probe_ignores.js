const {test} = require('tap');

const multiProbeIgnores = require('./../../liquidity/multi_probe_ignores');

const makeArgs = overrides => {
  const args = {
    channels: [
      {
        id: 'channel-a1',
        local_balance: 1000000,
        local_reserve: 1000,
        partner_public_key: 'a',
      },
      {
        id: 'channel-a2',
        local_balance: 5000,
        local_reserve: 1000,
        partner_public_key: 'a',
      },
      {
        id: 'channel-a2',
        local_balance: 200000,
        local_reserve: 1000,
        partner_public_key: 'a',
      },
      {
        id: 'channel-e1-partially-used-up',
        local_balance: 1e8,
        local_reserve: 1e1,
        partner_public_key: 'e',
      },
    ],
    from: 'origin',
    ignore: [{from_public_key: 'd'}],
    mtokens: (BigInt(1e5) * BigInt(1e3)).toString(),
    probes: [
      {
        liquidity: 898000,
        relays: ['a', 'b', 'c'],
      },
      {
        liquidity: 1e5,
        relays: ['a', 'b', 'c'],
      },
      {
        liquidity: 150000,
        relays: ['a', 'b', 'c'],
      },
      {
        liquidity: 100000,
        relays: ['e', 'f', 'g'],
      },
    ],
  };

  Object.keys(overrides).forEach(k => args[k] = overrides[k]);

  return args;
};

const tests = [
  {
    args: makeArgs({channels: undefined}),
    description: 'Channels are required',
    error: 'ExpectedArrayofChannelsToGenerateMultiProbeIgnores',
  },
  {
    args: makeArgs({from: undefined}),
    description: 'From public key is required',
    error: 'ExpectedFromPublicKeyToGenerateMultiProbeIgnores',
  },
  {
    args: makeArgs({ignore: undefined}),
    description: 'Ignore array is required',
    error: 'ExpectedIgnoreArrayToGenerateMultiProbeIgnores',
  },
  {
    args: makeArgs({mtokens: undefined}),
    description: 'Millitokens amount is required',
    error: 'ExpectedStartingMtokensWhenGeneratingMultiProbeIgnores',
  },
  {
    args: makeArgs({probes: undefined}),
    description: 'Probes array is required',
    error: 'ExpectedArrayOfProbesToGenerateMultiProbeIgnores',
  },
  {
    args: makeArgs({probes: [null]}),
    description: 'Probes in probes array are required',
    error: 'ExpectedProbeDetailsToGenerateMultiProbeIgnores',
  },
  {
    args: makeArgs({probes: [{liquidity: 1}]}),
    description: 'Relays in probes array are required',
    error: 'ExpectedArrayOfRelaysToGenerateMultiProbeIgnores',
  },
  {
    args: makeArgs({routes: {}}),
    description: 'Routes should be an array',
    error: 'ExpectedRoutesToBeArrayWhenGeneratingMultiProbeIgnores',
  },
  {
    args: makeArgs({}),
    description: 'A history of probes is mapped to updated probe parameters',
    expected: {
      ignore: [
        {
          from_public_key: 'd',
        },
        {
          from_public_key: 'a',
          to_public_key: 'b',
        },
        {
          from_public_key: 'b',
          to_public_key: 'c',
        },
        {
          from_public_key: 'a',
          to_public_key: 'b',
        },
        {
          from_public_key: 'b',
          to_public_key: 'c',
        },
        {
          from_public_key: 'a',
          to_public_key: 'b',
        },
        {
          from_public_key: 'b',
          to_public_key: 'c',
        },
        {
          from_public_key: 'e',
          to_public_key: 'f',
        },
        {
          from_public_key: 'f',
          to_public_key: 'g',
        },
      ],
    },
  },
  {
    args: {
      channels: [
        {
          id: '0x0x1',
          local_balance: 1000000,
          local_reserve: 1000,
          partner_public_key: 'a',
        },
        {
          id: '0x0x2',
          local_balance: 5000,
          local_reserve: 1000,
          partner_public_key: 'a',
        },
        {
          id: '0x0x3',
          local_balance: 200000,
          local_reserve: 1000,
          partner_public_key: 'a',
        },
        {
          id: '0x0x4',
          local_balance: 1e8,
          local_reserve: 1e1,
          partner_public_key: 'e',
        },
      ],
      from: 'origin',
      ignore: [{from_public_key: 'd'}],
      mtokens: (BigInt(1e5) * BigInt(1e3)).toString(),
      probes: [
        {
          liquidity: 898000,
          relays: ['a', 'b', 'c'],
        },
        {
          liquidity: 1e5,
          relays: ['a', 'b', 'c'],
        },
        {
          liquidity: 150000,
          relays: ['a', 'b', 'c'],
        },
        {
          liquidity: 100000,
          relays: ['e', 'f', 'g'],
        },
      ],
      routes: [
        [
          {
            public_key: 'f',
          },
          {
            base_fee_mtokens: '1',
            channel: '0x0x4',
            cltv_delta: 1,
            fee_rate: 1,
            public_key: 'g',
          },
        ],
        [
          {
            public_key: 'f',
          },
          {
            base_fee_mtokens: '1',
            channel: '0x0x4',
            cltv_delta: 1,
            fee_rate: 1,
            public_key: 'ff',
          },
          {
            base_fee_mtokens: '1',
            channel: '0x0x4',
            cltv_delta: 1,
            fee_rate: 1,
            public_key: 'g',
          },
        ],
      ],
    },
    description: 'Routes create a whitelist of edges',
    expected: {
      ignore: [
        {
          from_public_key: 'd',
        },
        {
          from_public_key: 'a',
          to_public_key: 'b',
        },
        {
          from_public_key: 'b',
          to_public_key: 'c',
        },
        {
          from_public_key: 'a',
          to_public_key: 'b',
        },
        {
          from_public_key: 'b',
          to_public_key: 'c',
        },
        {
          from_public_key: 'a',
          to_public_key: 'b',
        },
        {
          from_public_key: 'b',
          to_public_key: 'c',
        },
        {
          from_public_key: 'e',
          to_public_key: 'f',
        },
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, strictSame, throws}) => {
    if (!!error) {
      throws(() => multiProbeIgnores(args), new Error(error), 'Got error');
    } else {
      const res = multiProbeIgnores(args);

      strictSame(res, expected, 'Got expected result');
    }

    return end();
  });
});
