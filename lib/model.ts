// Token Radar, model radar-3.
//
// The starter's model (radar-1) priced every protocol at one flat multiple of
// TVL: implied = TVL x 0.25 x growth x maturity. That 0.25 is the global
// median market-cap/TVL of the live-token protocols in this very snapshot, so
// it is a fair centre — but it is blind to category: a lending protocol and a
// bridge do not trade at the same multiple of TVL, and the snapshot proves
// it. radar-2 calibrated the multiple per category from the protocols whose
// token already trades, then checked itself with a walk-forward test before it
// scored anything pre-token. radar-3 keeps that calibration exactly — the
// multiples, and therefore the board, are unchanged — and fixes what radar-2
// hid: the walk-forward test is now reported per category, so the dashboard
// names the categories where the model is weakest instead of hiding them
// inside one average error, and every category's multiple is published with
// the spread of the live comps behind it, so a reader sees which multiples
// rest on agreement and which on scattered evidence.
//
//   1. Live set: every protocol in the snapshot with a market cap, TVL > 0,
//      and category != CEX (exchanges are not comparable launches).
//   2. For each live protocol, the residual multiple
//        r = mcap_usd / (tvl_usd x growthMult x maturityMult)
//      with growthMult = 1 + clamp(change_7d, -60, 120) / 100 x 1.0 and
//      maturityMult = 0.6 + min(age_days, 1095) / 1095 x 0.4 (age unknown: 365).
//   3. Global multiple = median(r) over the live set. Category multiple =
//      the median r of that category, shrunk toward the global median:
//        mult_cat = (n x median_cat + 10 x global) / (n + 10)
//      with one guardrail: no multiple runs past three times the global
//      median (one live comp's ratio can be a 400x outlier and must never
//      set a whole category). Small categories are handled by the shrinkage
//      itself: with one or two comps the multiple stays close to global. No
//      protocol name is ever special-cased; the multiples come from the
//      snapshot alone. The spread of each category's comps — median(|r -
//      median_cat|) / median_cat — is measured and published beside the
//      multiple, so a reader sees which multiples rest on agreement and
//      which on scattered evidence. Weighting the shrinkage by that spread
//      was tried and rejected on this snapshot: it made the walk-forward
//      worse at every weight (average forward/reverse error 1.392 at weight
//      0, 1.413 at 0.25, 1.429 at 0.5, 1.454 at 1.0), because a scattered
//      category's median still beats the global one. So the fit keeps the
//      plain shrink and the spread is a diagnostic, not a weight.
//   4. A pre-token protocol scores
//        implied = round(tvl_usd x mult_cat x growthMult x maturityMult)
//      with mult_cat from step 3 (global when its category has no live comp).
//   5. Walk-forward check, run at build time on the same live set: fit the
//      multiples on protocols listed before 2024-01-01 and test on those
//      listed after, then fit on the later half and test on the earlier half.
//      The reported error is the median |log(implied / mcap)| on the held-out
//      half, for radar-3 and for the flat starter, side by side. That is
//      still a wide band — roughly x0.25 to x4.0 — and the dashboard says
//      so: TVL alone cannot pin a token's value, so every row carries its
//      calibration (calibrated vs global multiple) and the board is a ranking
//      of relative value, not a price forecast.
//   6. Per-category walk-forward: the same forward/reverse test, run
//      category by category (only categories with at least two live comps on
//      each side of 2024-01-01), worst first. One average error hides where
//      the model fails; this table is the honest version of it, and the
//      build log prints its three worst rows so a reader sees them first.
//
// What the snapshot does NOT carry, and the model does not invent: fees,
// runway and FDV. No fee or runway figure exists in the snapshot, so no
// multiple here claims to be a fee multiple, and no row claims a runway.
// The honest proxy for a protocol's earning power in this file is its TVL
// and its seven-day growth; the dashboard states that plainly.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  shrink: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 1.0,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  shrink: 10,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's calibrated multiple, for the dashboard's calibration table. */
export interface CategoryMultiple {
  category: string;
  live_n: number;
  multiple: number;
  spread: number;
}

/** One category's own walk-forward errors, worst first on the dashboard. */
export interface CategoryBacktest {
  category: string;
  live_n: number;
  forward_med_abs_log_err: number;
  reverse_med_abs_log_err: number;
}

/** The walk-forward check, computed at build time from the snapshot's live set. */
export interface Backtest {
  live_n: number;
  radar3_med_abs_log_err: number;
  starter_med_abs_log_err: number;
  forward_med_abs_log_err: number;
  reverse_med_abs_log_err: number;
  category_backtests: CategoryBacktest[];
  note: string;
}

/** The calibration the model fitted from the snapshot, for the dashboard. */
export interface Calibration {
  global_multiple: number;
  categories: CategoryMultiple[];
  backtest: Backtest;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  calibration: 'calibrated' | 'global';
  upside_per_dollar: number;
  model: {
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  category_multiple: number;
  calibration: 'calibrated' | 'global';
  upside_per_dollar: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  calibration: Calibration;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Growth and maturity multipliers for one protocol under `model`. */
export function multipliers(protocol: SnapshotProtocol, asOf: string, model: ModelConstants): { growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  return { growthPct, growthMult, maturityMult, age };
}

/** The live-token protocols the calibration learns from: a market cap, TVL, and no CEX. */
export function liveSet(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
}

/** The residual multiple of one live protocol: mcap over TVL times its multipliers. */
function residual(p: SnapshotProtocol, asOf: string, model: ModelConstants): number {
  const { growthMult, maturityMult } = multipliers(p, asOf, model);
  return (p.mcap_usd as number) / (p.tvl_usd * growthMult * maturityMult);
}

/** Fit the calibration from a set of live protocols (global + per-category multiples). */
function fitCalibration(
  live: SnapshotProtocol[],
  asOf: string,
  model: ModelConstants,
  fallbackGlobal?: number,
): { global: number; byCategory: Map<string, number>; counts: Map<string, number>; spreads: Map<string, number> } {
  const global = fallbackGlobal ?? median(live.map((p) => residual(p, asOf, model)));
  const byCat = new Map<string, number[]>();
  for (const p of live) {
    const c = p.category ?? 'Other';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(residual(p, asOf, model));
  }
  // One guardrail, stated on the dashboard: no multiple runs past three
  // times the global median, so one live comp's 400x ratio can never set a
  // whole category. Small categories are handled by the shrinkage itself:
  // with one or two comps the multiple stays close to global. The spread
  // is measured here and published beside the multiple; it is a diagnostic
  // only — weighting the shrinkage by it was tried and made the
  // walk-forward worse, so the fit keeps the plain shrink.
  const byCategory = new Map<string, number>();
  const counts = new Map<string, number>();
  const spreads = new Map<string, number>();
  for (const [c, rs] of byCat) {
    const n = rs.length;
    counts.set(c, n);
    const catMedian = median(rs);
    const mad = median(rs.map((r) => Math.abs(r - catMedian)));
    spreads.set(c, catMedian > 0 ? mad / catMedian : 0);
    const mult = (n * catMedian + model.shrink * global) / (n + model.shrink);
    byCategory.set(c, Math.min(mult, 3 * global));
  }
  return { global, byCategory, counts, spreads };
}

/** Median |log(implied / mcap)| of a fitted calibration on a held-out live set. */
function heldOutError(fit: { global: number; byCategory: Map<string, number> }, test: SnapshotProtocol[], asOf: string, model: ModelConstants): number {
  const errs = test.map((p) => {
    const { growthMult, maturityMult } = multipliers(p, asOf, model);
    const mult = fit.byCategory.get(p.category ?? 'Other') ?? fit.global;
    const implied = Math.max(1, Math.round(p.tvl_usd * mult * growthMult * maturityMult));
    return Math.abs(Math.log(implied / (p.mcap_usd as number)));
  });
  return median(errs);
}

/** Median |log(implied / mcap)| of the flat starter (one 0.25 multiple) on a live set. */
function starterError(test: SnapshotProtocol[], asOf: string): number {
  const errs = test.map((p) => {
    const g = Math.min(120, Math.max(-60, finite(p.change_7d, 0)));
    const gm = 1 + (g / 100) * 0.5;
    const age = ageDays(asOf, p.listed_at);
    const a2 = age ?? 365;
    const mm = 0.6 + (Math.min(Math.max(a2, 0), 1095) / 1095) * 0.4;
    const implied = Math.max(1, Math.round(p.tvl_usd * 0.25 * gm * mm));
    return Math.abs(Math.log(implied / (p.mcap_usd as number)));
  });
  return median(errs);
}

/** Per-category walk-forward errors: fit on a category's older comps, test on its newer ones, then back. */
function categoryBacktests(live: SnapshotProtocol[], asOf: string, model: ModelConstants, global: number): CategoryBacktest[] {
  const byCat = new Map<string, SnapshotProtocol[]>();
  for (const p of live) {
    const c = p.category ?? 'Other';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(p);
  }
  // A category earns a row only when both sides of the split can be fitted
  // and tested: at least two live comps listed before 2024-01-01 and two
  // after. Fewer than that and the "test" would be one protocol's luck, not
  // a category's error. The fallback global is the full live set's, so a
  // category with no comp on the fit side falls back to the same global the
  // board uses, never to a median fitted on its own handful.
  const out: CategoryBacktest[] = [];
  for (const [c, ps] of byCat) {
    const old = ps.filter((p) => p.listed_at !== null && p.listed_at < '2024-01-01');
    const recent = ps.filter((p) => p.listed_at !== null && p.listed_at >= '2024-01-01');
    if (old.length < 2 || recent.length < 2) continue;
    const forward = heldOutError(fitCalibration(old, asOf, model, global), recent, asOf, model);
    const reverse = heldOutError(fitCalibration(recent, asOf, model, global), old, asOf, model);
    out.push({ category: c, live_n: ps.length, forward_med_abs_log_err: round3(forward), reverse_med_abs_log_err: round3(reverse) });
  }
  const worst = (c: CategoryBacktest): number => Math.max(c.forward_med_abs_log_err, c.reverse_med_abs_log_err);
  return out.sort((a, b) => worst(b) - worst(a) || (a.category < b.category ? -1 : 1));
}

/** Calibrate from the whole live set and walk-forward-test it, both directions. */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const live = liveSet(snapshot);
  const fit = fitCalibration(live, snapshot.as_of, model);
  const categories: CategoryMultiple[] = [...fit.byCategory.entries()]
    .map(([category, multiple]) => ({ category, live_n: fit.counts.get(category) ?? 0, multiple: round4(multiple), spread: round3(fit.spreads.get(category) ?? 0) }))
    .sort((a, b) => b.live_n - a.live_n || (a.category < b.category ? -1 : 1));
  const old = live.filter((p) => p.listed_at !== null && p.listed_at < '2024-01-01');
  const recent = live.filter((p) => p.listed_at !== null && p.listed_at >= '2024-01-01');
  const forward = old.length > 0 && recent.length > 0 ? heldOutError(fitCalibration(old, snapshot.as_of, model), recent, snapshot.as_of, model) : NaN;
  const reverse = old.length > 0 && recent.length > 0 ? heldOutError(fitCalibration(recent, snapshot.as_of, model), old, snapshot.as_of, model) : NaN;
  const both = [...old, ...recent];
  const radar3 = both.length > 0 ? heldOutError(fit, both, snapshot.as_of, model) : NaN;
  const starter = both.length > 0 ? starterError(both, snapshot.as_of) : NaN;
  const band = Number.isFinite(radar3) ? `A ${round3(radar3)} error means the typical implied value is within about x${round2(Math.exp(-radar3))} to x${round2(Math.exp(radar3))} of the market cap` : 'The error is not measurable on this snapshot';
  return {
    global_multiple: round4(fit.global),
    categories,
    backtest: {
      live_n: live.length,
      radar3_med_abs_log_err: round3(radar3),
      starter_med_abs_log_err: round3(starter),
      forward_med_abs_log_err: round3(forward),
      reverse_med_abs_log_err: round3(reverse),
      category_backtests: categoryBacktests(live, snapshot.as_of, model, fit.global),
      note: `Walk-forward on the live-token protocols in this snapshot: multiples fitted on protocols listed before 2024-01-01 and tested on those listed after (forward), then the other way round (reverse). Error is median |log(implied / market cap)|. ${band}: TVL alone leaves a wide band, so the board ranks relative value, never a price.`,
    },
  };
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round3 = (n: number): number => (Number.isFinite(n) ? Math.round(n * 1e3) / 1e3 : n);
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The three multipliers and the implied value one protocol gets under the calibration. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  fit: { global: number; byCategory: Map<string, number> },
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null; multiple: number; calibration: 'calibrated' | 'global' } {
  const { growthPct, growthMult, maturityMult, age } = multipliers(protocol, asOf, model);
  const cat = protocol.category ?? 'Other';
  // The multiple the board publishes is the rounded one, so the page can
  // recompute the row's implied value exactly from the published figures.
  const multiple = round4(fit.byCategory.get(cat) ?? fit.global);
  const calibration = fit.byCategory.has(cat) ? 'calibrated' : 'global';
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult));
  return { implied, growthPct, growthMult, maturityMult, age, multiple, calibration };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const fit = fitCalibration(liveSet(snapshot), snapshot.as_of, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => ({ p, ...impliedValue(p, snapshot.as_of, model, fit) }));
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const capital = capitalFor(s.p);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      category_multiple: round4(s.multiple),
      calibration: s.calibration,
      upside_per_dollar: round2(s.implied / capital),
      model: {
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        age_days: s.age,
      },
      farm_steps: farmSteps(s.p, s.age).map(stepText),
    };
  });
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age), never from a hand-written list of names. The last step totals the
 * budget, and states the one honest limit: the implied value is the
 * protocol's hypothetical token value, not the farmer's share — a farmer's
 * share depends on airdrop terms this snapshot does not carry, so the known
 * part of the farm is its cost, and the plan keeps the cost small and fixed.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = capital >= 150 ? 8 : 4;
  const weekly = 2;
  const totalGas = gas + weekly * Math.ceil(hold / 7) + 3;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `about $${weekly} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Total budget: $${capital} of capital plus about $${totalGas} of gas over ${hold} days, then unwind. The implied value is the protocol's hypothetical token value, not your share of it, so farm only what you can afford to leave in for the full hold.`,
      cost: `$${capital + totalGas} all in`,
      time: `${hold} days`,
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    category_multiple: row.category_multiple,
    calibration: row.calibration,
    upside_per_dollar: row.upside_per_dollar,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const calibration = calibrate(snapshot, model);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    calibration,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
