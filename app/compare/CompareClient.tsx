"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { GPUS, GPU_BY_ID, BRAND_ORDER, GENERATIONS, type DerivedGpu } from "@/lib/gpus";
import { SPEC_GROUPS, pick, type SpecRow } from "@/lib/specs";
import {
  SERIES_COLORS,
  availabilityClass,
  formatDate,
  formatNumber,
  formatPrice,
  type Currency,
} from "@/lib/format";
import { useSite } from "@/components/Providers";
import { useSelection } from "@/components/useSelection";
import Bars from "@/components/Bars";

const MAX_SLOTS = 4;

const METRICS = [
  { key: "raster1080", label: "1080p" },
  { key: "raster1440", label: "1440p" },
  { key: "raster2160", label: "4K" },
  { key: "rt1440", label: "Ray tracing" },
] as const;

const PRESETS: [string, string[]][] = [
  ["This gen flagships", ["rtx-5090", "rtx-5080", "rx-9070-xt"]],
  ["$500–800 sweet spot", ["rtx-5070", "rx-9070-xt", "rtx-4070-super"]],
  ["Budget builds", ["rtx-5060", "rx-9060-xt-16", "arc-b580"]],
  ["Blackwell vs Ada", ["rtx-5070-ti", "rtx-4070-ti-super"]],
  ["NVIDIA vs AMD vs Intel", ["rtx-5060-ti-16", "rx-9060-xt-16", "arc-b580"]],
  ["Is it time to upgrade?", ["rtx-3070", "rtx-4070", "rtx-5070"]],
];

/** Price and value rows resolve against whichever currency is active. */
function rowValue(gpu: DerivedGpu, row: SpecRow, currency: Currency): unknown {
  if (row.format === "price") return currency === "inr" ? gpu.inr : gpu.msrp;
  if (row.format === "perfPerMoney") return currency === "inr" ? gpu.perfPerInr : gpu.perfPerDollar;
  return pick(gpu, row.key);
}

function cellText(gpu: DerivedGpu, row: SpecRow, currency: Currency): string {
  const raw = rowValue(gpu, row, currency);
  if (raw == null || raw === "") return "—";
  if (row.format === "price") return formatPrice(raw as number, currency);
  if (row.format === "date") return formatDate(raw as string, currency);
  if (row.format === "cu") return formatNumber(raw as number, currency) + " " + gpu.cuLabel;
  if (row.format === "rt") return formatNumber(raw as number, currency) + " (" + gpu.rtGen + ")";
  if (row.format === "tensor")
    return formatNumber(raw as number, currency) + " (" + gpu.tensorGen + ")";
  return formatNumber(raw as number | string, currency) + (row.unit || "");
}

export default function CompareClient() {
  const { currency, money, toast } = useSite();
  const { selected, setSelected, toggle, clear } = useSelection({
    param: "gpus",
    isValid: (id) => Boolean(GPU_BY_ID[id]),
    max: MAX_SLOTS,
  });

  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("raster1440");
  const [diffOnly, setDiffOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [generation, setGeneration] = useState("");
  const [minVram, setMinVram] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sortBy, setSortBy] = useState("perf");

  const priceOf = (g: DerivedGpu) => (currency === "inr" ? g.inr : g.msrp);
  const valueOf = (g: DerivedGpu) => (currency === "inr" ? g.perfPerInr : g.perfPerDollar);

  const cards = selected.map((id) => GPU_BY_ID[id]).filter(Boolean);

  const library = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = GPUS.filter((g) => {
      if (brand && g.brand !== brand) return false;
      if (generation && g.generation !== generation) return false;
      if (minVram && g.vram < minVram) return false;
      if (maxPrice && (currency === "inr" ? g.inr : g.msrp) > maxPrice) return false;
      if (!q) return true;
      return `${g.name} ${g.generation} ${g.architecture} ${g.gpuChip} ${g.brand}`
        .toLowerCase()
        .includes(q);
    });

    const sorters: Record<string, (a: DerivedGpu, b: DerivedGpu) => number> = {
      perf: (a, b) => b.perf.raster1440 - a.perf.raster1440,
      price: (a, b) => priceOf(a) - priceOf(b),
      value: (a, b) => valueOf(b) - valueOf(a),
      efficiency: (a, b) => b.perfPerWatt - a.perfPerWatt,
      vram: (a, b) => b.vram - a.vram || b.perf.raster1440 - a.perf.raster1440,
      newest: (a, b) => b.released.localeCompare(a.released),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(sorters[sortBy] || sorters.perf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, brand, generation, minVram, maxPrice, sortBy, currency]);

  const full = () => toast(`You can compare up to ${MAX_SLOTS} cards at a time.`);

  const best = (fn: (g: DerivedGpu) => number, dir: "high" | "low" = "high") =>
    cards.reduce((a, b) => (dir === "low" ? (fn(b) < fn(a) ? b : a) : fn(b) > fn(a) ? b : a));

  const share = async () => {
    if (!selected.length) return toast("Select some cards first.");
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Comparison link copied to clipboard.");
    } catch {
      toast("Copy failed — the link is in your address bar.");
    }
  };

  return (
    <>
      <section className="hero">
        <h1>Compare graphics cards in detail</h1>
        <p className="lede">
          Pick up to four GPUs and see every spec side by side — silicon, memory, performance,
          efficiency and value. Winning values in each row are highlighted.
        </p>
      </section>

      {/* ------------------------------------------------------------ picker */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            Your comparison{" "}
            <span className="count">
              {selected.length} / {MAX_SLOTS}
            </span>
          </h2>
          <div className="panel-head-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={share}>
              Share
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={clear}>
              Clear all
            </button>
          </div>
        </div>

        <div className="slots">
          {Array.from({ length: MAX_SLOTS }, (_, i) => {
            const g = cards[i];
            if (!g) {
              return (
                <div className="slot" key={i}>
                  Empty slot {i + 1}
                </div>
              );
            }
            return (
              <div
                className="slot filled"
                key={g.id}
                style={{ "--slot-color": SERIES_COLORS[i] } as React.CSSProperties}
              >
                <div className="slot-info" title={g.name}>
                  <div className="slot-name">{g.name}</div>
                  <div className="slot-meta">
                    {g.vram} GB {g.vramType} · {g.tdp} W · {formatPrice(priceOf(g), currency)}
                  </div>
                </div>
                <button
                  className="slot-remove"
                  type="button"
                  title={"Remove " + g.name}
                  onClick={() => toggle(g.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="filters">
          <div className="field field-grow">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              type="search"
              placeholder="e.g. 5070, Radeon, Battlemage…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="brandFilter">Brand</label>
            <select id="brandFilter" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All brands</option>
              {BRAND_ORDER.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="genFilter">Generation</label>
            <select
              id="genFilter"
              value={generation}
              onChange={(e) => setGeneration(e.target.value)}
            >
              <option value="">All generations</option>
              {GENERATIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="vramFilter">Min VRAM</label>
            <select
              id="vramFilter"
              value={minVram}
              onChange={(e) => setMinVram(Number(e.target.value))}
            >
              <option value={0}>Any</option>
              <option value={8}>8 GB+</option>
              <option value={12}>12 GB+</option>
              <option value={16}>16 GB+</option>
              <option value={24}>24 GB+</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="priceFilter">{money.filterLabel}</label>
            <select
              id="priceFilter"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            >
              <option value={0}>Any</option>
              {money.gpuFilterSteps.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sortBy">Sort by</label>
            <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="perf">Performance</option>
              <option value="price">Price</option>
              <option value="value">Performance / price</option>
              <option value="efficiency">Performance / W</option>
              <option value="vram">VRAM</option>
              <option value="newest">Newest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        <div className="library">
          {library.map((g) => {
            const isSelected = selected.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className={"gpu-card" + (isSelected ? " selected" : "")}
                disabled={!isSelected && selected.length >= MAX_SLOTS}
                onClick={() => toggle(g.id, full)}
              >
                <span className="gpu-card-top">
                  <span className={"dot " + g.brand} />
                  <span className="gpu-card-name">{g.name}</span>
                </span>
                <span className="gpu-card-specs">
                  {g.vram} GB {g.vramType} · {formatNumber(g.shaders, currency)} shaders ·{" "}
                  {g.tdp} W
                </span>
                <span className="gpu-card-foot">
                  <span>{formatPrice(priceOf(g), currency)}</span>
                  <span>Index {g.perf.raster1440}</span>
                </span>
              </button>
            );
          })}
        </div>
        {library.length === 0 ? <p className="empty">No cards match those filters.</p> : null}
      </section>

      {/* ------------------------------------------------------- placeholder */}
      {cards.length === 0 ? (
        <section className="panel placeholder">
          <h2>Nothing selected yet</h2>
          <p>Choose at least two cards above to build a comparison, or start from a preset:</p>
          <div className="presets">
            {PRESETS.map(([label, ids]) => (
              <button
                key={label}
                type="button"
                className="preset"
                onClick={() => setSelected(ids.filter((id) => GPU_BY_ID[id]).slice(0, MAX_SLOTS))}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- results */}
      {cards.length > 0 ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>At a glance</h2>
            </div>
            <div className="summary-grid">
              {cards.map((g, i) => (
                <div
                  className="summary-card"
                  key={g.id}
                  style={{ "--card-color": SERIES_COLORS[i] } as React.CSSProperties}
                >
                  <h3>
                    <Link href={`/gpus/${g.id}/`} style={{ color: "inherit" }}>
                      {g.name}
                    </Link>
                  </h3>
                  <div className="gen">{g.generation}</div>
                  <div className="summary-price">
                    {formatPrice(priceOf(g), currency)} <small>{money.priceLabel}</small>
                  </div>
                  {currency === "inr" ? (
                    <div className={"availability " + availabilityClass(g.indiaAvailability)}>
                      {g.indiaAvailability} in India
                    </div>
                  ) : null}
                  <div className="summary-stats">
                    <div>
                      <span>VRAM</span>
                      {g.vram} GB {g.vramType}
                    </div>
                    <div>
                      <span>Board power</span>
                      {g.tdp} W
                    </div>
                    <div>
                      <span>FP32</span>
                      {g.tflops} TFLOPS
                    </div>
                    <div>
                      <span>Bandwidth</span>
                      {g.bandwidth} GB/s
                    </div>
                    <div>
                      <span>1440p index</span>
                      {g.perf.raster1440}
                    </div>
                    <div>
                      <span>RT index</span>
                      {g.perf.rt1440}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cards.length > 1 ? (
              <div className="verdicts">
                {(
                  [
                    ["Fastest at 1440p", best((g) => g.perf.raster1440)],
                    ["Best ray tracing", best((g) => g.perf.rt1440)],
                    ["Best value", best(valueOf)],
                    ["Most efficient", best((g) => g.perfPerWatt)],
                    ["Most VRAM", best((g) => g.vram)],
                    ["Lowest power", best((g) => g.tdp, "low")],
                  ] as [string, DerivedGpu][]
                ).map(([label, g]) => (
                  <div className="verdict" key={label}>
                    {label}: <b>{g.name}</b>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Performance</h2>
              <div className="segmented" role="tablist" aria-label="Benchmark scenario">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    role="tab"
                    type="button"
                    className={metric === m.key ? "active" : ""}
                    onClick={() => setMetric(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <Bars
              data={cards.map((g) => ({
                key: g.id,
                label: g.name,
                brand: g.brand,
                value: g.perf[metric],
                display: String(g.perf[metric]),
              }))}
            />
            <p className="note">
              Relative index, RTX 4090 = 100. Aggregated approximation of published review
              results — use it to place cards in tiers, not as a per-game FPS prediction.
            </p>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Value &amp; efficiency</h2>
            </div>
            <div className="two-col">
              <div>
                <h3 className="sub">{money.valueHeading}</h3>
                <Bars
                  data={cards.map((g) => ({
                    key: g.id,
                    label: g.name,
                    brand: g.brand,
                    value: valueOf(g),
                    display: valueOf(g).toFixed(2),
                  }))}
                />
              </div>
              <div>
                <h3 className="sub">Performance per 100 W of board power</h3>
                <Bars
                  data={cards.map((g) => ({
                    key: g.id,
                    label: g.name,
                    brand: g.brand,
                    value: g.perfPerWatt,
                    display: g.perfPerWatt.toFixed(1),
                  }))}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Full specifications</h2>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={diffOnly}
                  onChange={(e) => setDiffOnly(e.target.checked)}
                />
                <span>Only show differences</span>
              </label>
            </div>
            <div className="table-scroll">
              <table className="spec-table">
                <thead>
                  <tr>
                    <th className="spec-name">Specification</th>
                    {cards.map((g, i) => (
                      <th key={g.id}>
                        <div className="col-head">
                          <b style={{ color: SERIES_COLORS[i] }}>{g.name}</b>
                          <em>
                            {g.architecture} · {g.gpuChip}
                          </em>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SPEC_GROUPS.map((group) => {
                    const rows = group.rows.filter((row) => {
                      if (row.onlyWhen && row.onlyWhen !== currency) return false;
                      if (!diffOnly) return true;
                      const vals = cards.map((g) => String(rowValue(g, row, currency)));
                      return new Set(vals).size > 1;
                    });
                    if (!rows.length) return null;

                    return (
                      <Fragment key={group.group}>
                        <tr className="group-row">
                          <td colSpan={cards.length + 1}>{group.group}</td>
                        </tr>
                        {rows.map((row) => {
                          const values = cards.map((g) => rowValue(g, row, currency));
                          const numeric =
                            row.better !== null && values.every((v) => typeof v === "number");
                          const nums = values as number[];
                          const target = numeric
                            ? row.better === "low"
                              ? Math.min(...nums)
                              : Math.max(...nums)
                            : null;
                          const unanimous = numeric && new Set(nums).size === 1;

                          return (
                            <tr key={group.group + row.key}>
                              <th className="spec-name">
                                {typeof row.label === "string" ? row.label : row.label[currency]}
                              </th>
                              {cards.map((g, i) => (
                                <td
                                  key={g.id}
                                  className={
                                    numeric && !unanimous && nums[i] === target && cards.length > 1
                                      ? "best"
                                      : undefined
                                  }
                                >
                                  {cellText(g, row, currency)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">{money.specNote}</p>
          </section>
        </>
      ) : null}
    </>
  );
}
