import { geocodeAddress } from './utils/geocoding';

type Case = {
  name: string;
  address: string;
  mock: (query: string) => any;
  expect: (r: any, queries: string[]) => boolean;
};

const cases: Case[] = [
  {
    name: 'exact match found (number resolved)',
    address: 'Rua Fulano, 123',
    mock: () => [{ lat: '-24.9555', lon: '-53.4561' }],
    expect: (r) => r?.approximate === false && r.latitude === -24.9555,
  },
  {
    name: 'exact fails, fallback without number succeeds',
    address: 'Rua Fulano, 123',
    mock: (q) => (/\b123\b/.test(q) ? [] : [{ lat: '-24.9', lon: '-53.4' }]),
    expect: (r) => r?.approximate === true && r.latitude === -24.9,
  },
  {
    name: 'both fail -> null',
    address: 'Rua Fulano, 123',
    mock: () => [],
    expect: (r) => r === null,
  },
  {
    name: 'street with number in name preserved in fallback',
    address: 'Rua 7 de Setembro, 500',
    mock: (q) => (/\b500\b/.test(q) ? [] : [{ lat: '-25.1', lon: '-53.1' }]),
    expect: (r, queries) =>
      r?.approximate === true && queries.some((q) => q.includes('Rua 7 de Setembro') && !/\b500\b/.test(q)),
  },
  {
    name: 'number before bairro stripped, bairro kept',
    address: 'Av. Brasil, 3102 - Bairro São Cristóvão',
    mock: (q) => (/\b3102\b/.test(q) ? [] : [{ lat: '-24.95', lon: '-53.45' }]),
    expect: (r, queries) =>
      r?.approximate === true &&
      queries.some((q) => q.includes('São Cristóvão') && !/\b3102\b/.test(q)),
  },
  {
    name: 'address without house number -> no fallback retry, null',
    address: 'Rua Fulano',
    mock: () => [],
    expect: (r, queries) => r === null && queries.length === 1,
  },
];

async function run() {
  let failures = 0;
  for (const c of cases) {
    const queries: string[] = [];
    (global as any).fetch = async (url: string) => {
      const q = decodeURIComponent(url.split('q=')[1]);
      queries.push(q);
      return { ok: true, json: async () => c.mock(q) };
    };
    const result = await geocodeAddress(c.address, 'Cidade', 'PR');
    const pass = c.expect(result, queries);
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${c.name}`, result, pass ? '' : queries);
    if (!pass) failures++;
  }
  process.exit(failures ? 1 : 0);
}

run();
