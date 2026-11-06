// The sums behind HPP, the price ladder, and the channel calculator. No database, no framework:
// the Excel workbook of production and marketing is the reference for these numbers.
// Contract: backend/tests/pricing.test.ts.

export interface PriceRates {
  /** Fractions: 0.2 is 20%. */
  gpm: number;
  affiliate: number;
  app: number;
}

export interface PriceLadder {
  hpp: number;
  net: number;
  affiliate: number;
  commerce: number;
}

/** Net = HPP / (1 - GPM), Affiliate = Net / (1 - %), E-commerce = Affiliate / (1 - APL). */
export const priceLadder = (hpp: number, rates: PriceRates): PriceLadder => {
  const net = hpp / (1 - rates.gpm);
  const affiliate = net / (1 - rates.affiliate);
  return { hpp, net, affiliate, commerce: affiliate / (1 - rates.app) };
};

/** Rounded to the nearest multiple; 0 or less keeps the value as it is. */
export const roundTo = (value: number, nearest: number): number =>
  nearest > 0 ? Math.round(value / nearest) * nearest : value;

//==================================================
//==== RECIPE
//==================================================

export interface RecipeLine {
  qty: number;
  unitPrice: number;
}

export const lineTotal = (line: RecipeLine): number => line.qty * line.unitPrice;

export const recipeHpp = (lines: RecipeLine[]): number =>
  lines.reduce((sum, line) => sum + lineTotal(line), 0);

//==================================================
//==== QUANTITY FORMULAS
//==================================================

export type FormulaVariables = Record<string, number>;

/**
 * A quantity written from the size, such as (2*L + 5*T) / 100. Only numbers, the given variables,
 * + - * / and brackets exist: anything else is an error, never code that runs. Throws on an
 * invalid formula or a division by zero.
 */
export const evaluateFormula = (formula: string, variables: FormulaVariables): number => {
  const tokens = formula.match(/\d+(?:\.\d+)?|[A-Za-z_]+|[()+\-*/]|\S/g) ?? [];
  let at = 0;
  const peek = () => tokens[at];
  const next = () => tokens[at++];

  const atom = (): number => {
    const token = next();
    if (token === undefined) throw new Error('FORMULA_INCOMPLETE');
    if (token === '(') {
      const value = sum();
      if (next() !== ')') throw new Error('FORMULA_BRACKET');
      return value;
    }
    if (token === '-') return -atom();
    if (/^\d/.test(token)) return Number(token);
    if (/^[A-Za-z_]+$/.test(token) && Object.hasOwn(variables, token)) return variables[token];
    throw new Error(`FORMULA_UNKNOWN:${token}`);
  };
  const product = (): number => {
    let value = atom();
    while (peek() === '*' || peek() === '/') {
      const operator = next();
      const right = atom();
      if (operator === '/' && right === 0) throw new Error('FORMULA_DIVISION');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  function sum(): number {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      value = next() === '+' ? value + product() : value - product();
    }
    return value;
  }

  const result = sum();
  if (at !== tokens.length || !Number.isFinite(result)) throw new Error('FORMULA_INVALID');
  return result;
};

//==================================================
//==== CHANNELS
//==================================================

export interface FeeRule {
  name: string;
  type: 'percent' | 'fixed';
  /** A fraction for percent, an amount for fixed. */
  value: number;
  /** Highest charge per item, for percent rules; null for none. */
  cap: number | null;
  per: 'item' | 'order';
}

export interface Scenario {
  hpp: number;
  /** Price per item before the discount. */
  price: number;
  qty: number;
  /** Seller's discount per item, an amount. */
  discount: number;
  /** Seller's voucher for the whole order, an amount. */
  voucher: number;
  /** Advertising as a fraction of what the buyer pays. */
  adsRate: number;
  /** Shipping paid by the seller for the whole order, an amount. */
  shipping: number;
  /** Tax as a fraction of what the buyer pays; 0 while no tax is set up. */
  taxRate: number;
}

export interface ScenarioFee {
  name: string;
  amount: number;
}

export interface ScenarioResult {
  /** What the buyer pays for the items. */
  revenue: number;
  fees: ScenarioFee[];
  received: number;
  cost: number;
  profit: number;
  /** Profit as a fraction of revenue; 0 when there is no revenue. */
  margin: number;
}

/** One order on one channel: what is charged, what arrives, what remains after HPP. */
export const channelScenario = (scenario: Scenario, rules: FeeRule[]): ScenarioResult => {
  const qty = Math.max(1, scenario.qty);
  const unit = Math.max(0, scenario.price - scenario.discount);
  const revenue = Math.max(0, unit * qty - scenario.voucher);
  const fees: ScenarioFee[] = rules.map((rule) => {
    if (rule.type === 'fixed') {
      return { name: rule.name, amount: rule.per === 'item' ? rule.value * qty : rule.value };
    }
    const perItem = (revenue / qty) * rule.value;
    const capped = rule.cap != null && rule.cap > 0 ? Math.min(perItem, rule.cap) : perItem;
    return { name: rule.name, amount: capped * qty };
  });
  if (scenario.adsRate > 0) fees.push({ name: 'Iklan', amount: revenue * scenario.adsRate });
  if (scenario.shipping > 0) fees.push({ name: 'Ongkir', amount: scenario.shipping });
  if (scenario.taxRate > 0) fees.push({ name: 'Pajak', amount: revenue * scenario.taxRate });
  const charged = fees.reduce((total, fee) => total + fee.amount, 0);
  const received = revenue - charged;
  const cost = scenario.hpp * qty;
  const profit = received - cost;
  return { revenue, fees, received, cost, profit, margin: revenue > 0 ? profit / revenue : 0 };
};

/**
 * The lowest price per item that reaches the target margin, found by bisection because capped
 * and fixed fees make the sum non-linear. Null when no price reaches it, as when percentages
 * already take more than what the target leaves.
 */
export const minimumPrice = (
  scenario: Omit<Scenario, 'price'>,
  rules: FeeRule[],
  targetMargin: number,
): number | null => {
  const reaches = (price: number) => {
    const result = channelScenario({ ...scenario, price }, rules);
    return result.revenue > 0 && result.margin >= targetMargin;
  };
  let high = Math.max(1, scenario.hpp, scenario.discount) * 2;
  for (let step = 0; !reaches(high); step += 1) {
    if (step >= 40) return null;
    high *= 2;
  }
  let low = 0;
  for (let step = 0; step < 80 && high - low > 0.005; step += 1) {
    const middle = (low + high) / 2;
    if (reaches(middle)) high = middle;
    else low = middle;
  }
  return high;
};
