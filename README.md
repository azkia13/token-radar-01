# Token Radar — radar-5

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a frozen DefiLlama snapshot of 758 protocols,
ranks the 200 pre-token ones by an implied token value, and shows a reader how
to farm each one — what to do, what it costs, and how long it takes.

## The model (radar-5)

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
fits the exponent from the snapshot instead of assuming it. radar-5 fixes
what radar-4 assumed without testing: that the growth multiplier is linear
in the seven-day TVL change, the same slope up as down. The snapshot says
otherwise — punishing outflows more than inflows cuts the walk-forward
error from 0.97 to 0.87:

`implied = round(category_scale x TVL^alpha x growth(change_7d) x maturity)`,
with alpha fitted by OLS on the live-token set (0.477 here) and the
per-category scale `k = median(mcap / (TVL^alpha x growth x maturity))`,
shrunk toward the global scale exactly as radar-3 shrank its multiples, and
capped at 3x global. `growth(g) = 1 + g / 100` for a rise and
`(1 + g / 100)^3` for a fall, with g clamped to [-60, 120] — the market
values a protocol on the TVL it is heading toward, about three weeks out
at the current weekly rate, while a week's inflow may be a single deposit,
not a trend, so it counts once. The power form stays positive for every
clamped g, so unlike a linear weight of 2 it can never give a negative
multiplier. The exponent is fitted on the training half alone inside the
walk-forward test, never on the held-out half, and fitted again on the full
live set for the board — so a new snapshot re-fits itself instead of
inheriting a hand-picked constant. What was tried and rejected in the
radar-5 round, on the same walk-forward protocol at three splits
(2024-01-01, 2023-07-01, 2022-07-01), forward and reverse: a listing-year
(vintage) factor (worse, and it adds nothing on top of the power growth, so
the growth effect is not a vintage proxy — growth is uncorrelated with
listing age, r = -0.06); a chains-count factor (within noise); a local
TVL-neighbourhood calibration and k-nearest-neighbour residuals (no better
than the per-category scale); trimming the worst training residuals
(not confirmed on the six-split protocol); an ensemble with log-median
scales (worse); full median regression with category dummies (the fit
blows up); an extra log-age factor (worse); shrinking the exponent toward
0.5 (within noise); a down-power above 3 (the gain saturates, so 3.0, the
round value with the cleanest reading, wins over the argmax). The
per-category walk-forward shares one exponent per half — fitted on that
half's whole live set, as the board does — because an exponent fitted on a
category's two or three comps lands on the clamp bounds and its errors blow
up. Then it checks itself with a walk-forward test — exponent and scales
fitted on protocols listed before 2024, tested on those listed after, and
the other way round — reported on the dashboard next to the calibration
table.

- Whole live set (in-sample): median |log error| 0.88 vs the flat starter's 1.53 (radar-4: 0.93)
- Walk-forward: 0.78 forward, 0.96 reverse, average 0.87 (starter: 1.59 / 1.50; radar-4: 0.96 / 0.93, average 0.95). Three-split mean 0.87 vs radar-4's 0.97 and the starter's 1.54.
- Per-category walk-forward (worst first): Lending 2.42 / 0.66, Liquid Staking 1.45 / 1.53, Dexs 1.33 / 1.39, Yield 0.53 / 1.20, Bridge 0.84 / 0.57
  (forward / reverse; only categories with at least two live comps on each
  side of 2024 earn a row)
- Honest limit, stated on the page: the snapshot carries no fees and no
  runway, so no scale here claims to be a fee multiple, and a ~0.87 log
  error means the typical implied value sits within about x0.42–x2.40 of a
  live token's market cap. The board ranks relative value; it never promises
  a price. One more caveat: the growth signal is one week of data, so the
  walk-forward test validates the form across protocols, not across market
  weeks, and leave-one-out does not confirm the gain.

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
