import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  channelScenario,
  evaluateFormula,
  FeeRule,
  minimumPrice,
  priceLadder,
  recipeHpp,
  roundTo,
} from '../src/helper/pricing.helper';

const near = (actual: number, expected: number, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not near ${expected}`);

test('the ladder gives the numbers of the Excel workbook', () => {
  const rates = { gpm: 0.2, affiliate: 0.05, app: 0.2 };
  const first = priceLadder(880550, rates);
  near(first.net, 1100687.5);
  near(first.affiliate, 1158618.42);
  near(first.commerce, 1448273.03);
  // A row with its own margin.
  near(priceLadder(32020, { gpm: 0.23, affiliate: 0.05, app: 0.2 }).commerce, 54716.34, 200);
});

test('rounding', () => {
  assert.equal(roundTo(1448273.03, 1), 1448273);
  assert.equal(roundTo(1448273.03, 1000), 1448000);
  assert.equal(roundTo(4.637, 0), 4.637);
});

test('a recipe adds up its lines', () => {
  // The first row of DETAIL HITUNGAN.
  const hpp = recipeHpp([
    { qty: 4.32, unitPrice: 35000 },
    { qty: 0.054, unitPrice: 8000000 },
    { qty: 2.05, unitPrice: 27000 },
    { qty: 1, unitPrice: 30000 },
    { qty: 2.05, unitPrice: 40000 },
    { qty: 1, unitPrice: 30000 },
    { qty: 1, unitPrice: 100000 },
  ]);
  near(hpp, 880550);
});

test('formulas read the size and nothing else', () => {
  const size = { L: 90, P: 200, T: 5 };
  near(evaluateFormula('(L + L + T + T + T + T + T) / 100', size), 2.05);
  near(evaluateFormula('L * P * (T - 3) / 1000000 * 120', size), 4.32);
  near(evaluateFormula('-L + 100', size), 10);
  for (const bad of [
    'process.exit(1)',
    'constructor',
    'L +',
    '(L',
    'L )',
    '1 / 0',
    'X * 2',
    '2 ** 3',
    'L; T',
  ]) {
    assert.throws(() => evaluateFormula(bad, size), bad);
  }
});

const base = {
  hpp: 100000,
  price: 200000,
  qty: 1,
  discount: 0,
  voucher: 0,
  adsRate: 0,
  shipping: 0,
  taxRate: 0,
};
const rules: FeeRule[] = [
  { name: 'Admin', type: 'percent', value: 0.1, cap: null, per: 'item' },
  { name: 'Proses', type: 'fixed', value: 1250, cap: null, per: 'order' },
];

test('a channel takes its fees, and what remains is the profit', () => {
  const result = channelScenario(base, rules);
  assert.equal(result.revenue, 200000);
  assert.deepEqual(
    result.fees.map((fee) => fee.amount),
    [20000, 1250],
  );
  assert.equal(result.received, 178750);
  assert.equal(result.profit, 78750);
  near(result.margin, 0.39375);
});

test('quantity, discount, voucher, ads, shipping, tax, and caps', () => {
  const result = channelScenario(
    {
      ...base,
      qty: 2,
      discount: 10000,
      voucher: 20000,
      adsRate: 0.05,
      shipping: 5000,
      taxRate: 0.01,
    },
    [
      { name: 'Admin', type: 'percent', value: 0.5, cap: 40000, per: 'item' },
      { name: 'Per item', type: 'fixed', value: 100, cap: null, per: 'item' },
    ],
  );
  assert.equal(result.revenue, 360000);
  assert.deepEqual(
    result.fees.map((fee) => [fee.name, fee.amount]),
    [
      ['Admin', 80000],
      ['Per item', 200],
      ['Iklan', 18000],
      ['Ongkir', 5000],
      ['Pajak', 3600],
    ],
  );
  assert.equal(result.cost, 200000);
  assert.equal(result.profit, 360000 - 106800 - 200000);
});

test('a discount above the price cannot make the revenue negative', () => {
  const result = channelScenario({ ...base, discount: 300000 }, []);
  assert.equal(result.revenue, 0);
  assert.equal(result.margin, 0);
});

test('the minimum price reaches the target margin and no less', () => {
  const { price: _price, ...rest } = base;
  const price = minimumPrice(rest, rules, 0.2);
  assert.ok(price);
  const result = channelScenario({ ...base, price: price! }, rules);
  assert.ok(result.margin >= 0.2);
  near(result.margin, 0.2, 0.0001);
});

test('no minimum price when the percentages leave nothing', () => {
  const { price: _price, ...rest } = base;
  assert.equal(
    minimumPrice(
      rest,
      [{ name: 'Besar', type: 'percent', value: 0.9, cap: null, per: 'item' }],
      0.2,
    ),
    null,
  );
});
