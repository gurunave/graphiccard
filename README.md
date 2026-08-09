# graphiccard

A detailed graphics card comparison page. Pick up to four GPUs and compare them
side by side across silicon, memory, performance, power and value.

**Live site: https://gurunave.github.io/graphiccard/**

No build step, no dependencies — plain HTML, CSS and JavaScript.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Because it is fully static it can be hosted as-is on GitHub Pages, Netlify,
S3 or any static host.

## Deployment

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on
every push to `main`, and can also be run manually from the Actions tab. There
is no build step — the files are uploaded as-is. Pages is configured in
"GitHub Actions" mode, so the workflow is the only thing that publishes; the
branch-based Pages build no longer applies.

## Features

- **Compare up to 4 cards** side by side, picked from a searchable library or
  from the full database table at the bottom of the page.
- **Filters** by brand, generation, minimum VRAM and maximum MSRP, with
  sorting by performance, price, performance-per-dollar, performance-per-watt,
  VRAM or release date.
- **Performance charts** for 1080p / 1440p / 4K rasterised gaming and 1440p
  ray tracing, showing each card's deficit against the leader.
- **Value and efficiency charts** — performance per $100 of MSRP and per 100 W
  of board power.
- **Full spec table** across seven groups (overview, silicon, compute, memory,
  performance index, power & physical, connectivity). The best value in each
  ranked row is highlighted, and "Only show differences" hides rows where every
  selected card is identical.
- **At a glance verdicts** — fastest, best ray tracing, best value, most
  efficient, most VRAM, lowest power.
- **Presets** for common questions ("Blackwell vs Ada", "Budget builds",
  "Is it time to upgrade?").
- **Shareable URLs** — the selection is stored as `?gpus=rtx-5080,rx-9070-xt`,
  and the Share button copies the current link.
- Light/dark theme (follows the system setting, remembered per browser) and a
  responsive layout down to phone width.

## Adding or editing cards

Everything lives in `assets/js/data.js`. Append an object to the `GPUS` array —
`id` must be unique and URL-safe, since it is what appears in the share link.
Derived fields (`tflops`, `perfPerDollar`, `perfPerWatt`, `year`) are computed
at load time, so they do not need to be filled in.

To add a new spec row to the comparison table, add an entry to `SPEC_GROUPS` in
the same file:

```js
{ key: "myField", label: "My field", better: "high", unit: " GB" }
```

`better` is `"high"`, `"low"` or `null` — it controls which cell gets the
winner highlight. `key` supports dotted paths such as `perf.raster1440`.

## About the data

Specifications are manufacturer-published figures for the reference or Founders
Edition board; partner cards vary in clocks, power limit and dimensions. MSRP is
the launch price, not current street price.

The performance numbers are an **approximate relative index** normalised so the
RTX 4090 = 100, aggregated from published review results. They are intended for
placing cards in tiers, not for predicting per-game frame rates.

## Layout

```
index.html            page markup
assets/css/styles.css theming, layout, components
assets/js/data.js     GPU database + spec table definition
assets/js/app.js      selection state, filtering, charts, tables, URL sync
```
