"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DERIVED_LAPTOPS,
  LAPTOP_BRANDS,
  TGP_SPREAD_BY_GPU,
  USED_LAPTOP_GPUS,
  WIDEST_TGP_SPREAD,
  type DerivedLaptop,
} from "@/lib/laptops";
import {
  availabilityClass,
  formatPrice,
  SERIES_COLORS,
  type Currency,
  type MoneyMode,
} from "@/lib/format";
import { useSite } from "@/components/Providers";
import { useSelection } from "@/components/useSelection";
import Bars from "@/components/Bars";

const BY_ID: Record<string, DerivedLaptop> = Object.fromEntries(
  DERIVED_LAPTOPS.map((l) => [l.id, l]),
);

const MAX_SHORTLIST = 4;

interface Filters {
  query: string;
  gpuId: string;
  brand: string;
  maxPrice: number;
  maxWeight: number;
  minRefresh: number;
  minRam: number;
  fullPowerOnly: boolean;
}

const NO_FILTERS: Filters = {
  query: "",
  gpuId: "",
  brand: "",
  maxPrice: 0,
  maxWeight: 0,
  minRefresh: 0,
  minRam: 0,
  fullPowerOnly: false,
};

const FILTER_KEYS = Object.keys(NO_FILTERS) as (keyof Filters)[];

/** How much of the GPU's rated power this chassis allows. */
function tgpTone(ratio: number): { cls: string; label: string } {
  if (ratio >= 0.98) return { cls: "", label: "Full power" };
  if (ratio >= 0.85) return { cls: "", label: "Near full power" };
  if (ratio >= 0.7) return { cls: "mid", label: "Reduced" };
  return { cls: "low", label: "Heavily limited" };
}

interface SpecRow {
  label: string;
  get: (l: DerivedLaptop) => string | number;
  /** The underlying number to rank on, when the displayed string is not one. */
  rank?: (l: DerivedLaptop) => number;
  better?: "high" | "low";
}

/** Rows of the shortlist comparison, each carrying its own ranking rule. */
function specRows(currency: Currency, money: MoneyMode): SpecRow[] {
  const priceOf = (l: DerivedLaptop) => (currency === "inr" ? l.inr : l.msrp);
  const valueOf = (l: DerivedLaptop) => (currency === "inr" ? l.perfPerInr : l.perfPerDollar);

  return [
    { label: "GPU", get: (l) => l.gpu.name },
    { label: "GPU power (TGP)", get: (l) => `${l.tgp} W`, rank: (l) => l.tgp, better: "high" },
    {
      label: "Share of rated power",
      get: (l) => `${Math.round(l.tgpRatio * 100)}%`,
      rank: (l) => l.tgpRatio,
      better: "high",
    },
    {
      label: "Effective index",
      get: (l) => l.effectivePerf,
      rank: (l) => l.effectivePerf,
      better: "high",
    },
    {
      label: "Ray tracing index",
      get: (l) => l.effectiveRt,
      rank: (l) => l.effectiveRt,
      better: "high",
    },
    { label: "VRAM", get: (l) => `${l.gpu.vram} GB`, rank: (l) => l.gpu.vram, better: "high" },
    { label: "Upscaling", get: (l) => l.gpu.upscaling },
    { label: "Processor", get: (l) => l.cpu },
    {
      label: "Memory",
      get: (l) => `${l.ram} GB ${l.ramType}${l.ramUpgradable ? "" : ", soldered"}`,
      rank: (l) => l.ram,
      better: "high",
    },
    { label: "Storage", get: (l) => `${l.storage} GB`, rank: (l) => l.storage, better: "high" },
    {
      label: "Display",
      get: (l) => `${l.screenSize}" ${l.resolution} ${l.refresh} Hz ${l.panel}`,
    },
    { label: "Weight", get: (l) => `${l.weight} kg`, rank: (l) => l.weight, better: "low" },
    {
      label: "Thickness",
      get: (l) => `${l.thickness} mm`,
      rank: (l) => l.thickness,
      better: "low",
    },
    { label: "Battery", get: (l) => `${l.batteryWh} Wh`, rank: (l) => l.batteryWh, better: "high" },
    {
      label: currency === "inr" ? "India street price" : "List price",
      get: (l) => formatPrice(priceOf(l), currency),
      rank: priceOf,
      better: "low",
    },
    {
      label: `Performance ${money.laptopValueShort}`,
      get: (l) => valueOf(l).toFixed(2),
      rank: valueOf,
      better: "high",
    },
    ...(currency === "inr"
      ? [{ label: "India availability", get: (l: DerivedLaptop) => l.indiaAvailability }]
      : []),
  ];
}

export default function LaptopClient() {
  const { currency, money, toast } = useSite();
  const { selected, toggle, clear } = useSelection({
    param: "picks",
    isValid: (id) => Boolean(BY_ID[id]),
    max: MAX_SHORTLIST,
    storageKey: "gpucompare-laptop-shortlist",
  });

  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sortBy, setSortBy] = useState("perf");
  const [diffOnly, setDiffOnly] = useState(false);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const filtersActive = FILTER_KEYS.some((k) => filters[k] !== NO_FILTERS[k]);

  // A price cap is an absolute amount, so a dollar cap is meaningless once the
  // page switches to rupees — it would either filter nothing or everything
  // while the select reads "Any". Drop it and say so.
  const priceCap = useRef(0);
  useEffect(() => {
    priceCap.current = filters.maxPrice;
  }, [filters.maxPrice]);
  useEffect(() => {
    if (!priceCap.current) return;
    priceCap.current = 0;
    setFilters((f) => ({ ...f, maxPrice: 0 }));
    toast("Price cap cleared — the two currencies use different steps.");
  }, [currency, toast]);

  const priceOf = (l: DerivedLaptop) => (currency === "inr" ? l.inr : l.msrp);
  const valueOf = (l: DerivedLaptop) => (currency === "inr" ? l.perfPerInr : l.perfPerDollar);

  const results = useMemo(() => {
    const { query, gpuId, brand, maxPrice, maxWeight, minRefresh, minRam, fullPowerOnly } =
      filters;
    const q = query.trim().toLowerCase();
    const price = (l: DerivedLaptop) => (currency === "inr" ? l.inr : l.msrp);
    const value = (l: DerivedLaptop) => (currency === "inr" ? l.perfPerInr : l.perfPerDollar);

    const list = DERIVED_LAPTOPS.filter((l) => {
      if (gpuId && l.gpuId !== gpuId) return false;
      if (brand && l.brand !== brand) return false;
      if (maxPrice && price(l) > maxPrice) return false;
      if (maxWeight && l.weight > maxWeight) return false;
      if (minRefresh && l.refresh < minRefresh) return false;
      if (minRam && l.ram < minRam) return false;
      if (fullPowerOnly && l.tgpRatio < 0.9) return false;
      if (!q) return true;
      return `${l.brand} ${l.name} ${l.gpu.name} ${l.cpu}`.toLowerCase().includes(q);
    });

    // Every sort falls back to raw speed so equal-ranking machines stay in a
    // predictable order rather than shuffling with the filter set.
    const byPerf = (a: DerivedLaptop, b: DerivedLaptop) => b.effectivePerf - a.effectivePerf;
    const sorters: Record<string, (a: DerivedLaptop, b: DerivedLaptop) => number> = {
      perf: byPerf,
      price: (a, b) => price(a) - price(b) || byPerf(a, b),
      value: (a, b) => value(b) - value(a) || byPerf(a, b),
      weight: (a, b) => a.weight - b.weight || byPerf(a, b),
      tgp: (a, b) => b.tgpRatio - a.tgpRatio || byPerf(a, b),
      battery: (a, b) => b.batteryWh - a.batteryWh || byPerf(a, b),
      newest: (a, b) => b.year - a.year || byPerf(a, b),
    };
    return [...list].sort(sorters[sortBy] || sorters.perf);
  }, [filters, sortBy, currency]);

  // Badges on the result cards, so the machine that wins on a measure is
  // visible without re-sorting the list to find it.
  const leaders = useMemo(() => {
    if (results.length < 2) return {} as Record<string, string[]>;
    const pick = (fn: (l: DerivedLaptop) => number, dir: "high" | "low" = "high") =>
      results.reduce((a, b) => (dir === "low" ? (fn(b) < fn(a) ? b : a) : fn(b) > fn(a) ? b : a));
    const tags: Record<string, string[]> = {};
    const add = (l: DerivedLaptop, label: string) => (tags[l.id] ||= []).push(label);
    add(pick((l) => l.effectivePerf), "Fastest");
    add(pick(valueOf), "Best value");
    add(pick((l) => l.weight, "low"), "Lightest");
    return tags;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, currency]);

  const shortlist = selected.map((id) => BY_ID[id]).filter(Boolean);
  const rows = useMemo(() => specRows(currency, money), [currency, money]);
  const visibleRows = diffOnly
    ? rows.filter((r) => new Set(shortlist.map((l) => String(r.get(l)))).size > 1)
    : rows;

  const spread = filters.gpuId ? TGP_SPREAD_BY_GPU[filters.gpuId] : null;

  const onToggle = (l: DerivedLaptop) => {
    const removing = selected.includes(l.id);
    toggle(l.id, () => toast(`You can shortlist up to ${MAX_SHORTLIST} laptops at a time.`));
    if (removing) toast(`Removed ${l.name} from the shortlist.`);
    else if (selected.length < MAX_SHORTLIST)
      toast(`${l.name} shortlisted — ${selected.length + 1} of ${MAX_SHORTLIST}.`);
  };

  const share = async () => {
    if (!selected.length) return toast("Shortlist a laptop first.");
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Shortlist link copied to clipboard.");
    } catch {
      toast("Copy failed — the link is in your address bar.");
    }
  };

  const best = (fn: (l: DerivedLaptop) => number, dir: "high" | "low" = "high") =>
    shortlist.reduce((a, b) => (dir === "low" ? (fn(b) < fn(a) ? b : a) : fn(b) > fn(a) ? b : a));

  return (
    <>
      <section className="hero">
        <h1>Shortlist a gaming laptop</h1>
        <p className="lede">
          Filter machines by the GPU they ship, then shortlist up to four and compare them
          properly. Ranked on the performance each chassis actually delivers, not on the badge.
        </p>
      </section>

      <div className="callout">
        <b>Why two laptops with the same GPU are not the same laptop.</b> Laptop GPUs run
        within a power range set by the manufacturer, and the chassis decides where in that
        range it sits. Of the machines listed here, the {WIDEST_TGP_SPREAD.highestTgp} W{" "}
        {WIDEST_TGP_SPREAD.gpu.short} is <b>{WIDEST_TGP_SPREAD.gap}% faster</b> than the{" "}
        {WIDEST_TGP_SPREAD.lowestTgp} W one with the same name on the lid. Every card below
        shows its TGP and the resulting effective index, on the same scale as the desktop
        database (desktop RTX 4090 = 100).
      </div>

      {/* --------------------------------------------------------- shortlist */}
      {shortlist.length > 0 ? (
        <section className="panel" id="shortlist">
          <div className="panel-head">
            <h2>
              Your shortlist{" "}
              <span className="count">
                {shortlist.length} / {MAX_SHORTLIST}
              </span>
            </h2>
            <div className="panel-head-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={share}>
                Share
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={clear}>
                Clear
              </button>
            </div>
          </div>

          <div className="summary-grid">
            {shortlist.map((l, i) => (
              <div
                className="summary-card"
                key={l.id}
                style={{ "--card-color": SERIES_COLORS[i] } as React.CSSProperties}
              >
                <div className="summary-card-head">
                  <div>
                    <h3>
                      {l.brand} {l.name}
                    </h3>
                    <div className="gen">
                      {l.gpu.short} · {l.tgp} W of {l.gpu.maxTgp} W
                    </div>
                  </div>
                  <button
                    className="slot-remove"
                    type="button"
                    onClick={() => onToggle(l)}
                    aria-label={`Remove ${l.brand} ${l.name} from the shortlist`}
                  >
                    ×
                  </button>
                </div>
                <div className="summary-price">
                  {formatPrice(priceOf(l), currency)} <small>{money.priceLabel}</small>
                </div>
                {currency === "inr" ? (
                  <div className={"availability " + availabilityClass(l.indiaAvailability)}>
                    {l.indiaAvailability} in India
                  </div>
                ) : null}
                <div className="summary-stats">
                  <div>
                    <span>Effective index</span>
                    {l.effectivePerf}
                  </div>
                  <div>
                    <span>Ray tracing</span>
                    {l.effectiveRt}
                  </div>
                  <div>
                    <span>Display</span>
                    {l.screenSize}&quot; {l.refresh} Hz
                  </div>
                  <div>
                    <span>Panel</span>
                    {l.panel}
                  </div>
                  <div>
                    <span>Memory</span>
                    {l.ram} GB {l.ramUpgradable ? "" : "(soldered)"}
                  </div>
                  <div>
                    <span>Weight</span>
                    {l.weight} kg
                  </div>
                </div>
              </div>
            ))}
          </div>

          {shortlist.length > 1 ? (
            <>
              <div className="verdicts">
                {(
                  [
                    ["Fastest", best((l) => l.effectivePerf)],
                    ["Best value", best(valueOf)],
                    ["Most GPU power", best((l) => l.tgpRatio)],
                    ["Lightest", best((l) => l.weight, "low")],
                    ["Best screen", best((l) => l.pixels * l.refresh)],
                    ["Biggest battery", best((l) => l.batteryWh)],
                    ["Cheapest", best(priceOf, "low")],
                  ] as [string, DerivedLaptop][]
                ).map(([label, l]) => (
                  <div className="verdict" key={label}>
                    {label}:{" "}
                    <b>
                      {l.brand} {l.name}
                    </b>
                  </div>
                ))}
              </div>

              <div className="two-col" style={{ marginTop: "1.5rem" }}>
                <div>
                  <h3 className="sub">Effective performance index</h3>
                  <Bars
                    data={shortlist.map((l) => ({
                      key: l.id,
                      label: `${l.brand} ${l.name}`,
                      brand: l.gpu.brand,
                      value: l.effectivePerf,
                      display: String(l.effectivePerf),
                    }))}
                  />
                </div>
                <div>
                  <h3 className="sub">{money.laptopValueHeading}</h3>
                  <Bars
                    data={shortlist.map((l) => ({
                      key: l.id,
                      label: `${l.brand} ${l.name}`,
                      brand: l.gpu.brand,
                      value: valueOf(l),
                      display: valueOf(l).toFixed(2),
                    }))}
                  />
                </div>
              </div>

              <div className="panel-subhead">
                <h3 className="sub">Specifications</h3>
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
                      {shortlist.map((l, i) => (
                        <th key={l.id}>
                          <div className="col-head">
                            <b style={{ color: SERIES_COLORS[i] }}>{l.name}</b>
                            <em>{l.brand}</em>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const nums = row.rank ? shortlist.map(row.rank) : null;
                      const unanimous = !nums || new Set(nums).size === 1;
                      const target = !nums
                        ? 0
                        : row.better === "low"
                          ? Math.min(...nums)
                          : Math.max(...nums);

                      return (
                        <tr key={row.label}>
                          <th className="spec-name">{row.label}</th>
                          {shortlist.map((l, i) => (
                            <td
                              key={l.id}
                              className={
                                row.better && nums && !unanimous && nums[i] === target
                                  ? "best"
                                  : undefined
                              }
                            >
                              {row.get(l)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visibleRows.length === 0 ? (
                <p className="empty">
                  These machines match on every specification listed. Turn off &ldquo;only show
                  differences&rdquo; to see the full sheet.
                </p>
              ) : null}
            </>
          ) : (
            <p className="note">Shortlist one more machine to see them compared side by side.</p>
          )}
        </section>
      ) : null}

      {/* ----------------------------------------------------------- filters */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            Find a laptop{" "}
            <span className="count" aria-live="polite">
              {results.length === DERIVED_LAPTOPS.length
                ? `${results.length} machines`
                : `${results.length} of ${DERIVED_LAPTOPS.length}`}
            </span>
          </h2>
          <div className="panel-head-actions">
            <label className="switch">
              <input
                type="checkbox"
                checked={filters.fullPowerOnly}
                onChange={(e) => setFilter("fullPowerOnly", e.target.checked)}
              />
              <span>Full-power GPUs only</span>
            </label>
            {filtersActive ? (
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
              >
                Reset filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="filters no-rule">
          <div className="field field-grow">
            <label htmlFor="lq">Search</label>
            <input
              id="lq"
              type="search"
              placeholder="e.g. Legion, Zephyrus, Ryzen…"
              autoComplete="off"
              value={filters.query}
              onChange={(e) => setFilter("query", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lgpu">Graphics card</label>
            <select
              id="lgpu"
              value={filters.gpuId}
              onChange={(e) => setFilter("gpuId", e.target.value)}
            >
              <option value="">Any GPU</option>
              {USED_LAPTOP_GPUS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.short}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lbrand">Brand</label>
            <select
              id="lbrand"
              value={filters.brand}
              onChange={(e) => setFilter("brand", e.target.value)}
            >
              <option value="">All brands</option>
              {LAPTOP_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lprice">{money.filterLabel}</label>
            <select
              id="lprice"
              value={filters.maxPrice}
              onChange={(e) => setFilter("maxPrice", Number(e.target.value))}
            >
              <option value={0}>Any</option>
              {money.laptopFilterSteps.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lweight">Max weight</label>
            <select
              id="lweight"
              value={filters.maxWeight}
              onChange={(e) => setFilter("maxWeight", Number(e.target.value))}
            >
              <option value={0}>Any</option>
              <option value={1.8}>1.8 kg</option>
              <option value={2.3}>2.3 kg</option>
              <option value={2.8}>2.8 kg</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="lrefresh">Min refresh</label>
            <select
              id="lrefresh"
              value={filters.minRefresh}
              onChange={(e) => setFilter("minRefresh", Number(e.target.value))}
            >
              <option value={0}>Any</option>
              <option value={120}>120 Hz</option>
              <option value={165}>165 Hz</option>
              <option value={240}>240 Hz</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="lram">Min RAM</label>
            <select
              id="lram"
              value={filters.minRam}
              onChange={(e) => setFilter("minRam", Number(e.target.value))}
            >
              <option value={0}>Any</option>
              <option value={16}>16 GB</option>
              <option value={32}>32 GB</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="lsort">Sort by</label>
            <select id="lsort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="perf">Effective performance</option>
              <option value="price">Price</option>
              <option value="value">Performance / price</option>
              <option value="weight">Lightest</option>
              <option value="tgp">Most GPU power</option>
              <option value="battery">Biggest battery</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- results */}
      <section className="panel">
        <div className="panel-head">
          <h2>Machines</h2>
          {shortlist.length ? (
            <a className="note inline" href="#shortlist">
              {shortlist.length} shortlisted — compare
            </a>
          ) : (
            <span className="note inline">Click shortlist to compare up to {MAX_SHORTLIST}</span>
          )}
        </div>

        {results.length > 0 && spread && spread.machines > 1 && spread.gap > 0 ? (
          <div className="spread">
            The {spread.machines} <b>{spread.gpu.short}</b> machines in this database run{" "}
            {spread.lowestTgp} W to {spread.highestTgp} W. That is one GPU name covering an
            effective index of {spread.slowest} at the bottom and {spread.fastest} at the top —{" "}
            <b>{spread.gap}% apart</b>.
          </div>
        ) : null}

        {results.length === 0 ? (
          <div className="empty">
            <p>No laptops match those filters.</p>
            <button
              className="btn btn-sm btn-primary"
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="laptop-grid">
            {results.map((l) => {
              const picked = selected.includes(l.id);
              const tone = tgpTone(l.tgpRatio);
              const badges = leaders[l.id];
              return (
                <article className={"laptop" + (picked ? " shortlisted" : "")} key={l.id}>
                  <div className="laptop-top">
                    <div>
                      <div className="laptop-name">
                        {l.brand} {l.name}
                      </div>
                      <div className="laptop-brand">
                        {l.year} · {l.cpu}
                      </div>
                    </div>
                    <div className="laptop-price">
                      {formatPrice(priceOf(l), currency)}
                      <small>
                        {valueOf(l).toFixed(2)} {money.laptopValueShort}
                      </small>
                    </div>
                  </div>

                  {badges || currency === "inr" ? (
                    <div className="laptop-badges">
                      {badges?.map((b) => (
                        <span className="badge" key={b}>
                          {b}
                        </span>
                      ))}
                      {currency === "inr" ? (
                        <span className={"availability " + availabilityClass(l.indiaAvailability)}>
                          {l.indiaAvailability}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="laptop-gpu">
                    <span className={"dot " + l.gpu.brand} />
                    <b style={{ color: "var(--text)" }}>{l.gpu.short}</b>
                    <span>
                      {l.gpu.vram} GB · index {l.effectivePerf}
                    </span>
                    <span className="perf-pill" style={{ marginLeft: "auto" }}>
                      {tone.label}
                    </span>
                  </div>

                  <div>
                    <div
                      className="tgp-bar"
                      role="img"
                      aria-label={`${l.tgp} watts of the ${l.gpu.maxTgp} watt rating — ${tone.label.toLowerCase()}`}
                    >
                      <div
                        className={"tgp-fill " + tone.cls}
                        style={{ width: l.tgpRatio * 100 + "%" }}
                      />
                    </div>
                    <div className="tgp-line">
                      <span>
                        {l.tgp} W of {l.gpu.maxTgp} W rated
                      </span>
                      {l.tgp < l.gpu.maxTgp && l.perfLostToTgp >= 1 ? (
                        <span className={l.perfLostToTgp >= 5 ? "tgp-warn" : undefined}>
                          −{l.perfLostToTgp}% vs full power
                        </span>
                      ) : (
                        <span>Full power</span>
                      )}
                    </div>
                  </div>

                  <div className="laptop-specs">
                    <div>
                      Display{" "}
                      <b>
                        {l.screenSize}&quot; {l.refresh} Hz
                      </b>
                    </div>
                    <div>
                      Panel <b>{l.panel}</b>
                    </div>
                    <div>
                      Memory{" "}
                      <b>
                        {l.ram} GB{l.ramUpgradable ? "" : " soldered"}
                      </b>
                    </div>
                    <div>
                      Storage <b>{l.storage} GB</b>
                    </div>
                    <div>
                      Weight <b>{l.weight} kg</b>
                    </div>
                    <div>
                      Battery <b>{l.batteryWh} Wh</b>
                    </div>
                  </div>

                  <div className="laptop-note">{l.notes}</div>

                  <div className="laptop-actions">
                    <button
                      type="button"
                      className={"btn btn-sm " + (picked ? "btn-ghost" : "btn-primary")}
                      aria-pressed={picked}
                      onClick={() => onToggle(l)}
                    >
                      {picked ? "Remove from shortlist" : "Shortlist"}
                    </button>
                    {l.gpu.desktopCousin ? (
                      <Link
                        className="btn btn-ghost btn-sm"
                        href={`/gpus/${l.gpu.desktopCousin}/`}
                      >
                        Desktop equivalent
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="note">
          Effective index applies a power-scaling model to the GPU&rsquo;s full-power figure —
          it is an approximation, not a measurement of a specific machine, and it ignores
          cooling quality, CPU pairing and Dynamic Boost. Configurations sold under one model
          name vary, so check the TGP and panel of the exact SKU. {money.specNote}
        </p>
      </section>
    </>
  );
}
