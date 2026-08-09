"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DERIVED_LAPTOPS,
  LAPTOP_BRANDS,
  USED_LAPTOP_GPUS,
  type DerivedLaptop,
} from "@/lib/laptops";
import { availabilityClass, formatPrice, SERIES_COLORS } from "@/lib/format";
import { useSite } from "@/components/Providers";
import { useSelection } from "@/components/useSelection";
import Bars from "@/components/Bars";

const BY_ID: Record<string, DerivedLaptop> = Object.fromEntries(
  DERIVED_LAPTOPS.map((l) => [l.id, l]),
);

const MAX_SHORTLIST = 4;

/** How much of the GPU's rated power this chassis allows. */
function tgpTone(ratio: number): { cls: string; label: string } {
  if (ratio >= 0.98) return { cls: "", label: "Full power" };
  if (ratio >= 0.85) return { cls: "", label: "Near full power" };
  if (ratio >= 0.7) return { cls: "mid", label: "Reduced" };
  return { cls: "low", label: "Heavily limited" };
}

export default function LaptopClient() {
  const { currency, money, toast } = useSite();
  const { selected, toggle, clear } = useSelection({
    param: "picks",
    isValid: (id) => Boolean(BY_ID[id]),
    max: MAX_SHORTLIST,
    storageKey: "gpucompare-laptop-shortlist",
  });

  const [query, setQuery] = useState("");
  const [gpuId, setGpuId] = useState("");
  const [brand, setBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState(0);
  const [maxWeight, setMaxWeight] = useState(0);
  const [minRefresh, setMinRefresh] = useState(0);
  const [minRam, setMinRam] = useState(0);
  const [fullPowerOnly, setFullPowerOnly] = useState(false);
  const [sortBy, setSortBy] = useState("perf");

  const priceOf = (l: DerivedLaptop) => (currency === "inr" ? l.inr : l.msrp);
  const valueOf = (l: DerivedLaptop) => (currency === "inr" ? l.perfPerInr : l.perfPerDollar);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = DERIVED_LAPTOPS.filter((l) => {
      if (gpuId && l.gpuId !== gpuId) return false;
      if (brand && l.brand !== brand) return false;
      if (maxPrice && (currency === "inr" ? l.inr : l.msrp) > maxPrice) return false;
      if (maxWeight && l.weight > maxWeight) return false;
      if (minRefresh && l.refresh < minRefresh) return false;
      if (minRam && l.ram < minRam) return false;
      if (fullPowerOnly && l.tgpRatio < 0.9) return false;
      if (!q) return true;
      return `${l.brand} ${l.name} ${l.gpu.name} ${l.cpu}`.toLowerCase().includes(q);
    });

    const sorters: Record<string, (a: DerivedLaptop, b: DerivedLaptop) => number> = {
      perf: (a, b) => b.effectivePerf - a.effectivePerf,
      price: (a, b) => priceOf(a) - priceOf(b),
      value: (a, b) => valueOf(b) - valueOf(a),
      weight: (a, b) => a.weight - b.weight,
      tgp: (a, b) => b.tgpRatio - a.tgpRatio,
      newest: (a, b) => b.year - a.year,
    };
    return [...list].sort(sorters[sortBy] || sorters.perf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, gpuId, brand, maxPrice, maxWeight, minRefresh, minRam, fullPowerOnly, sortBy, currency]);

  const shortlist = selected.map((id) => BY_ID[id]).filter(Boolean);
  const full = () => toast(`You can shortlist up to ${MAX_SHORTLIST} laptops at a time.`);

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
        range it sits. A 140 W RTX 4060 is roughly a fifth faster than a 65 W one with the same
        name on the lid. Every card below shows its TGP and the resulting effective index, on
        the same scale as the desktop database (desktop RTX 4090 = 100).
      </div>

      {/* --------------------------------------------------------- shortlist */}
      {shortlist.length > 0 ? (
        <section className="panel">
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
                <h3>
                  {l.brand} {l.name}
                </h3>
                <div className="gen">
                  {l.gpu.short} · {l.tgp} W of {l.gpu.maxTgp} W
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
                  <h3 className="sub">
                    Performance {currency === "inr" ? "per ₹1,00,000" : "per $1,000"}
                  </h3>
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

              <div className="table-scroll" style={{ marginTop: "1.5rem" }}>
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
                    {(
                      [
                        ["GPU", (l: DerivedLaptop) => l.gpu.name, null],
                        ["GPU power (TGP)", (l: DerivedLaptop) => `${l.tgp} W`, "high"],
                        [
                          "Share of rated power",
                          (l: DerivedLaptop) => `${Math.round(l.tgpRatio * 100)}%`,
                          "high",
                        ],
                        ["Effective index", (l: DerivedLaptop) => l.effectivePerf, "high"],
                        ["Ray tracing index", (l: DerivedLaptop) => l.effectiveRt, "high"],
                        ["VRAM", (l: DerivedLaptop) => `${l.gpu.vram} GB`, "high"],
                        ["Processor", (l: DerivedLaptop) => l.cpu, null],
                        [
                          "Memory",
                          (l: DerivedLaptop) =>
                            `${l.ram} GB ${l.ramType}${l.ramUpgradable ? "" : ", soldered"}`,
                          null,
                        ],
                        ["Storage", (l: DerivedLaptop) => `${l.storage} GB`, "high"],
                        [
                          "Display",
                          (l: DerivedLaptop) =>
                            `${l.screenSize}" ${l.resolution} ${l.refresh} Hz ${l.panel}`,
                          null,
                        ],
                        ["Weight", (l: DerivedLaptop) => `${l.weight} kg`, "low"],
                        ["Thickness", (l: DerivedLaptop) => `${l.thickness} mm`, "low"],
                        ["Battery", (l: DerivedLaptop) => `${l.batteryWh} Wh`, "high"],
                        [
                          money.priceLabel === "MSRP" ? "List price" : "India street price",
                          (l: DerivedLaptop) => formatPrice(priceOf(l), currency),
                          "low",
                        ],
                      ] as [string, (l: DerivedLaptop) => string | number, string | null][]
                    ).map(([label, get, better]) => {
                      const raw = shortlist.map(get);
                      // Rank on the underlying number, not the formatted string.
                      const nums = shortlist.map((l) => {
                        if (label === "GPU power (TGP)") return l.tgp;
                        if (label === "Share of rated power") return l.tgpRatio;
                        if (label === "Effective index") return l.effectivePerf;
                        if (label === "Ray tracing index") return l.effectiveRt;
                        if (label === "VRAM") return l.gpu.vram;
                        if (label === "Storage") return l.storage;
                        if (label === "Weight") return l.weight;
                        if (label === "Thickness") return l.thickness;
                        if (label === "Battery") return l.batteryWh;
                        if (better === "low") return priceOf(l);
                        return 0;
                      });
                      const target =
                        better === "low" ? Math.min(...nums) : Math.max(...nums);
                      const unanimous = new Set(nums).size === 1;

                      return (
                        <tr key={label}>
                          <th className="spec-name">{label}</th>
                          {shortlist.map((l, i) => (
                            <td
                              key={l.id}
                              className={
                                better && !unanimous && nums[i] === target ? "best" : undefined
                              }
                            >
                              {raw[i]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            Find a laptop <span className="count">{results.length} match</span>
          </h2>
          <label className="switch">
            <input
              type="checkbox"
              checked={fullPowerOnly}
              onChange={(e) => setFullPowerOnly(e.target.checked)}
            />
            <span>Full-power GPUs only</span>
          </label>
        </div>

        <div className="filters no-rule">
          <div className="field field-grow">
            <label htmlFor="lq">Search</label>
            <input
              id="lq"
              type="search"
              placeholder="e.g. Legion, Zephyrus, Ryzen…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lgpu">Graphics card</label>
            <select id="lgpu" value={gpuId} onChange={(e) => setGpuId(e.target.value)}>
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
            <select id="lbrand" value={brand} onChange={(e) => setBrand(e.target.value)}>
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
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
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
              value={maxWeight}
              onChange={(e) => setMaxWeight(Number(e.target.value))}
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
              value={minRefresh}
              onChange={(e) => setMinRefresh(Number(e.target.value))}
            >
              <option value={0}>Any</option>
              <option value={120}>120 Hz</option>
              <option value={165}>165 Hz</option>
              <option value={240}>240 Hz</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="lram">Min RAM</label>
            <select id="lram" value={minRam} onChange={(e) => setMinRam(Number(e.target.value))}>
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
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- results */}
      <section className="panel">
        <div className="panel-head">
          <h2>Machines</h2>
          <span className="note inline">Click shortlist to compare up to {MAX_SHORTLIST}</span>
        </div>

        {results.length === 0 ? (
          <p className="empty">No laptops match those filters. Try relaxing one.</p>
        ) : (
          <div className="laptop-grid">
            {results.map((l) => {
              const picked = selected.includes(l.id);
              const tone = tgpTone(l.tgpRatio);
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
                    <div className="laptop-price">{formatPrice(priceOf(l), currency)}</div>
                  </div>

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
                    <div className="tgp-bar">
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
                      onClick={() => toggle(l.id, full)}
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
