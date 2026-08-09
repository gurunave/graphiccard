# graphiccard

Compare graphics cards in detail, and shortlist gaming laptops by the GPU they
ship. A Next.js app exported to static files.

**Live site: https://gurunave.github.io/graphiccard/**

## Run it

```sh
npm install
npm run dev     # http://localhost:3000
```

```sh
npm run build   # static export to ./out
```

The build sets `output: "export"`, so `./out` is a plain folder of HTML, CSS and
JS that any static host will serve. There is no server-side runtime.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Landing page — entry points and how to read the numbers |
| `/compare` | Put up to four graphics cards side by side |
| `/gpus` | Sortable, filterable database of every card |
| `/gpus/[id]` | Full spec sheet for one card, statically generated for all 28 |
| `/laptops` | Find and shortlist gaming laptops by GPU |

Currency (USD/INR) and theme are global, shared across every page, and remembered
between visits.

### Compare

Pick up to four cards from a searchable library or the database table. You get
per-card summary tiles, verdict chips (fastest, best ray tracing, best value,
most efficient, most VRAM, lowest power), performance charts for 1080p/1440p/4K
raster and 1440p ray tracing, value and efficiency charts, and a 30-row spec
table in seven groups. The best value in each ranked row is highlighted, and
"Only show differences" hides rows where every selected card agrees. Selections
live in the URL (`?gpus=rtx-5080,rx-9070-xt`) so a comparison is shareable.

### Laptop finder

Gaming laptops filtered by GPU, brand, price, weight, refresh rate and RAM, then
shortlisted (up to four) into a side-by-side comparison with charts and a spec
table. The shortlist persists in `localStorage` and in the URL (`?picks=...`).

The point of this page is **TGP**. Laptop GPUs run within a power range set by
the manufacturer, and the chassis decides where in that range a given machine
sits — so two laptops with the same GPU name can differ by around 20%. Every
result shows its TGP, how much of the GPU's rated power that is, and the
resulting effective index, and results are ranked on that effective figure
rather than on the badge. The RTX 4060 machines listed here span 65 W to 140 W,
which is exactly the trap this is meant to expose.

## Adding or editing data

- `lib/gpus.ts` — desktop cards. Append to `RAW_GPUS`; `id` must be unique and
  URL-safe since it is the detail-page route and the share-link token. Derived
  fields (`tflops`, `perfPerDollar`, `perfPerInr`, `perfPerWatt`, `year`) are
  computed at load.
- `lib/specs.ts` — the comparison table. Add a `SpecRow` to a group:
  `{ key: "myField", label: "My field", better: "high", unit: " GB" }`.
  `better` is `"high"`, `"low"` or `null` and controls the winner highlight;
  `key` supports dotted paths such as `perf.raster1440`; `label` may be
  `{ usd, inr }` to vary by currency; `onlyWhen` restricts a row to one currency.
- `lib/laptops.ts` — `LAPTOP_GPUS` (mobile silicon and its TGP range) and
  `LAPTOPS` (machines, each with the TGP that model allows). A laptop GPU may
  name a `desktopCousin` to cross-link the two databases.

## About the data

Specifications are manufacturer figures for the reference / Founders Edition
board. Partner cards vary in clocks, power limit and dimensions.

Performance is an **approximate relative index** normalised so the desktop
RTX 4090 = 100, aggregated from published review results. It places parts in
tiers; it does not predict frame rates in a specific game. Laptop figures apply
a power-scaling model (`perfAtTgp`, a 0.35 exponent that lands within a few
percent of published TGP-scaling tests) to the GPU's full-power figure — a
model, not a measurement, and it ignores cooling quality, CPU pairing and
Dynamic Boost.

USD prices are launch MSRP. **Indian prices are hand-maintained ballpark street
prices including GST** — deliberately not a conversion of the dollar figure,
since customs duty and GST put real Indian prices well above the converted MSRP.
They go stale as import duty, the rupee/dollar rate and stock move, so treat
them as a starting point and confirm with a retailer. Because value is computed
from them, "best value" can legitimately differ between USD and INR mode.

## Deployment

`.github/workflows/pages.yml` runs `npm ci && npm run build` and publishes `./out`
to GitHub Pages on every push to `main`. `next.config.mjs` sets
`basePath: "/graphiccard"` for production builds to match the Pages project URL,
and `trailingSlash: true` so every route exports as `index.html` (Pages has no
server to rewrite extensionless URLs). `public/.nojekyll` stops Pages from
discarding the `_next` directory.
