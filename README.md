# Token Radar — radar-4

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a frozen DefiLlama snapshot of 758 protocols,
ranks the 200 pre-token ones by an implied token value, and shows a reader how
to farm each one — what to do, what it costs, and how long it takes.

## The model (radar-4)

The starter priced every protocol at one flat multiple of TVL (0.25x). radar-2
calibrated the multiple per category from the protocols whose token already
trades in the same snapshot. radar-3 kept that calibration and reported the
walk-forward test per category, with every category's spread beside its
multiple. radar-4 fixes what all three assumed without testing: that a
token's market cap scales *linearly* with TVL. The snapshot itself says
otherwise — log market cap against log TVL has an OLS slope of 0.48, not
1.0, so a protocol with ten times the TVL trades at roughly three times the
market cap, not ten times. The linear multiple therefore overvalued the
biggest protocols and undervalued the small ones, systematically. radar-4
fits the exponent from the snapshot instead of assuming it:

`implied = round(category_scale x TVL^alpha x growth x maturity)`, with
alpha fitted by OLS on the live-token set (0.483 here) and the per-category
scale `k = median(mcap / (TVL^alpha x growth x maturity))`, shrunk toward
the global scale exactly as radar-3 shrank its multiples, and capped at 3x
global. The exponent is fitted on the training half alone inside the
walk-forward test, never on the held-out half, and fitted again on the full
live set for the board — so a new snapshot re-fits itself instead of
inheriting a hand-picked constant. What was tried and rejected, on the same
walk-forward protocol at three splits (2024-01-01, 2023-07-01, 2022-07-01):
a fixed exponent 0.4 (as accurate, but a constant that cannot adapt); a
per-category exponent (worse on every split); log-median and trimmed-log
residuals (worse); growth weight 1.5–2.0 (slightly better on the test, but a
weight of 2 gives a protocol down 60% a *negative* growth multiplier, so it
fails on principle); shrink 5 or 20 instead of 10 (within noise). The
per-category walk-forward shares one exponent per half — fitted on that
half's whole live set, as the board does — because an exponent fitted on a
category's two or three comps lands on the clamp bounds and its errors blow
up. Then it checks itself with a walk-forward test — exponent and scales
fitted on protocols listed before 2024, tested on those listed after, and
the other way round — reported on the dashboard next to the calibration
table.

- Whole live set (in-sample): median |log error| 0.93 vs the flat starter's 1.53 (radar-3: 1.24)
- Walk-forward: 0.96 forward, 0.93 reverse, average 0.95 (starter: 1.59 / 1.50; radar-3: 1.54 / 1.24, average 1.39)
- Per-category walk-forward (worst first): Lending 2.58 / 0.87, Dexs 2.35 / 2.40, Liquid Staking 1.19 / 1.34, Yield 0.42 / 1.29, Bridge 0.73 / 0.55
  (forward / reverse; only categories with at least two live comps on each
  side of 2024 earn a row)
- Honest limit, stated on the page: the snapshot carries no fees and no
  runway, so no scale here claims to be a fee multiple, and a ~0.95 log
  error means the typical implied value sits within about x0.39–x2.58 of a
  live token's market cap. The board ranks relative value; it never promises
  a price.

## The dashboard

A static page, no framework and no network. It shows:

- **Farm first**: the top 10 by implied value, with the capital each plan needs
- **The model, tested**: the formula, every calibrated category scale with
  its spread and the fitted TVL exponent, the walk-forward backtest, and the per-category backtest table,
  worst first — plus the build log's three weakest categories
- **The board**: 200 pre-token rows, sortable by implied value, TVL, 7-day
  growth, age, implied per $1 farmed, or name; filterable by search, category,
  and chain; a detail view per protocol with the model's own inputs and the
  six-step farm plan; saved views — name the current filters and sort, keep
  them in the browser, bring one back with a click, and the last view used
  comes back on the next visit
- **Live token**: the 24 largest protocols that already trade, set aside with
  their market caps — they are also the calibration set the model learned from

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22+, standard library only) reads the snapshot, writes
`board.json` (200 rows), `data.js`, `dashboard/`, `screenshots/`, and
`dossier.json` to the output directory. It runs twice with byte-identical
output. The three screenshots are renders of the dashboard itself: the board,
a protocol's detail view, and a filtered view.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
