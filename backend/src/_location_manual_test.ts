import { median, distanceInMeters } from './utils/location';

type Case = { name: string; run: () => boolean };

const cases: Case[] = [
  { name: 'mediana impar', run: () => median([3, 1, 2]) === 2 },
  { name: 'mediana par', run: () => median([1, 2, 3, 4]) === 2.5 },
  {
    name: 'mediana ignora outlier de GPS (par)',
    run: () => Math.abs(median([-24.95, -24.951, -24.949, -10.0]) - -24.9495) < 1e-9,
  },
  {
    name: 'mediana ignora outlier de GPS (impar)',
    run: () => median([-24.95, -24.951, -24.949, -24.952, -10.0]) === -24.95,
  },
  { name: 'mediana de um elemento', run: () => median([7]) === 7 },
  {
    name: 'distancia ~111m por 0.001 grau de latitude',
    run: () => {
      const d = distanceInMeters(-24.95, -53.45, -24.951, -53.45);
      return d > 100 && d < 120;
    },
  },
  { name: 'distancia zero no mesmo ponto', run: () => distanceInMeters(-24.95, -53.45, -24.95, -53.45) === 0 },
];

let failures = 0;
for (const c of cases) {
  const pass = c.run();
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${c.name}`);
  if (!pass) failures++;
}
process.exit(failures ? 1 : 0);
