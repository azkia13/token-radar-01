# Token Radar — radar-2

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/azkia13/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a frozen DefiLlama snapshot of 758 protocols,
ranks the 200 pre-token ones by an implied token value, and shows a reader how
to farm each one — what to do, what it costs, and how long it takes.

## The model (radar-2)

The starter priced every protocol at one flat multiple of TVL (0.25x). radar-2
calibrates the multiple per category from the protocols whose token already
trades in the same snapshot: the residual multiple
`mcap / (TVL x growth x maturity)` is taken per category, shrunk toward the
global median, and capped at 3x global so one outlier comp can never set a
whole category. Then it checks itself with a walk-forward test — multiples
fitted on protocols listed before 2024, tested on those listed after, and the
other way round — reported on the dashboard next to the calibration table.

- Whole live set (in-sample): median |log error| 1.24 vs the flat starter's 1.53
- Walk-forward: 1.54 forward, 1.24 reverse (starter: 1.59 / 1.50)
- Honest limit, stated on the page: the snapshot carries no fees and no
  runway, so no multiple here claims to be a fee multiple, and a ~1.3 log
  error means the typical implied value sits within about x0.29–x3.45 of a
  live token's market cap. The board ranks relative value; it never promises
  a price.

## The dashboard

A static page, no framework and no network. It shows:

- **Farm first**: the top 10 by implied value, with the capital each plan needs
- **The model, tested**: the formula, every calibrated category multiple, and
  the walk-forward backtest
- **The board**: 200 pre-token rows, sortable by implied value, TVL, 7-day
  growth, age, implied per $1 farmed, or name; filterable by search, category,
  and chain; a detail view per protocol with the model's own inputs and the
  six-step farm plan
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
