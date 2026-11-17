# Token Radar — radar-3

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a frozen DefiLlama snapshot of 758 protocols,
ranks the 200 pre-token ones by an implied token value, and shows a reader how
to farm each one — what to do, what it costs, and how long it takes.

## The model (radar-3)

The starter priced every protocol at one flat multiple of TVL (0.25x). radar-2
calibrates the multiple per category from the protocols whose token already
trades in the same snapshot: the residual multiple
`mcap / (TVL x growth x maturity)` is taken per category, shrunk toward the
global median, and capped at 3x global so one outlier comp can never set a
whole category. radar-3 keeps that calibration exactly — the multiples, and
therefore the board, are unchanged — and reports what radar-2 hid: the
walk-forward test per category, worst first, and every category's spread
(relative median absolute deviation of its live comps) beside its multiple,
so a reader sees which multiples rest on agreement and which on scattered
evidence. Weighting the shrinkage by that spread was tried and rejected on
this snapshot: it made the walk-forward worse at every weight (average
forward/reverse error 1.392 at weight 0, 1.413 at 0.25, 1.429 at 0.5, 1.454
at 1.0), because a scattered category's median still beats the global one.
So the fit keeps the plain shrink and the spread is a diagnostic, not a
weight. Then it checks itself with a walk-forward test — multiples
fitted on protocols listed before 2024, tested on those listed after, and the
other way round — reported on the dashboard next to the calibration table.

- Whole live set (in-sample): median |log error| 1.24 vs the flat starter's 1.53
- Walk-forward: 1.54 forward, 1.24 reverse (starter: 1.59 / 1.50)
- Per-category walk-forward (worst first): Bridge 1.31 / 2.07, Liquid Staking
  0.84 / 1.86, Lending 1.77 / 1.10, Dexs 1.16 / 1.64, Yield 1.01 / 1.25
  (forward / reverse; only categories with at least two live comps on each
  side of 2024 earn a row)
- Honest limit, stated on the page: the snapshot carries no fees and no
  runway, so no multiple here claims to be a fee multiple, and a ~1.3 log
  error means the typical implied value sits within about x0.29–x3.45 of a
  live token's market cap. The board ranks relative value; it never promises
  a price.

## The dashboard

A static page, no framework and no network. It shows:

- **Farm first**: the top 10 by implied value, with the capital each plan needs
- **The model, tested**: the formula, every calibrated category multiple with
  its spread, the walk-forward backtest, and the per-category backtest table,
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
