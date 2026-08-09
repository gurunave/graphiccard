"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GPUS, BRAND_ORDER, GENERATIONS, type DerivedGpu } from "@/lib/gpus";
import { formatNumber, formatPrice } from "@/lib/format";
import { useSite } from "@/components/Providers";

type SortKey =
  | "name"
  | "generation"
  | "shaders"
  | "boostClock"
  | "tflops"
  | "vram"
  | "bandwidth"
  | "tdp"
  | "price"
  | "perf";

/** Lower-is-better columns read better ascending on first click. */
const ASC_FIRST: SortKey[] = ["name", "generation", "price", "tdp"];

export default function GpuListClient() {
  const { currency, money } = useSite();
  const [sortKey, setSortKey] = useState<SortKey>("perf");
  const [asc, setAsc] = useState(false);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [generation, setGeneration] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = GPUS.filter((g) => {
      if (brand && g.brand !== brand) return false;
      if (generation && g.generation !== generation) return false;
      if (!q) return true;
      return `${g.name} ${g.generation} ${g.architecture} ${g.gpuChip} ${g.brand}`
        .toLowerCase()
        .includes(q);
    });

    const get = (g: DerivedGpu): number | string => {
      if (sortKey === "perf") return g.perf.raster1440;
      if (sortKey === "price") return currency === "inr" ? g.inr : g.msrp;
      return g[sortKey] as number | string;
    };

    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const cmp = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
      return asc ? cmp : -cmp;
    });
  }, [query, brand, generation, sortKey, asc, currency]);

  const sortOn = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(ASC_FIRST.includes(key));
    }
  };

  const columns: { key: SortKey; label: string; num?: boolean }[] = [
    { key: "name", label: "GPU" },
    { key: "generation", label: "Generation" },
    { key: "shaders", label: "Shaders", num: true },
    { key: "boostClock", label: "Boost", num: true },
    { key: "tflops", label: "TFLOPS", num: true },
    { key: "vram", label: "VRAM", num: true },
    { key: "bandwidth", label: "Bandwidth", num: true },
    { key: "tdp", label: "TBP", num: true },
    { key: "price", label: money.columnLabel, num: true },
    { key: "perf", label: "Perf (1440p)", num: true },
  ];

  return (
    <>
      <section className="hero">
        <h1>GPU database</h1>
        <p className="lede">
          Every card covered here, sortable on any column. Open a card for its full spec sheet,
          or head to the comparison tool to put several side by side.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            All cards <span className="count">{rows.length} shown</span>
          </h2>
          <Link className="btn btn-primary btn-sm" href="/compare/">
            Compare cards
          </Link>
        </div>

        <div className="filters no-rule">
          <div className="field field-grow">
            <label htmlFor="q">Search</label>
            <input
              id="q"
              type="search"
              placeholder="e.g. 5070, Radeon, Battlemage…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="brand">Brand</label>
            <select id="brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All brands</option>
              {BRAND_ORDER.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gen">Generation</label>
            <select id="gen" value={generation} onChange={(e) => setGeneration(e.target.value)}>
              <option value="">All generations</option>
              {GENERATIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-scroll" style={{ marginTop: "1.1rem" }}>
          <table className="db-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={
                      (c.num ? "num " : "") +
                      (sortKey === c.key ? "sorted" : "") +
                      (sortKey === c.key && asc ? " asc" : "")
                    }
                    onClick={() => sortOn(c.key)}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link className="db-name" href={`/gpus/${g.id}/`}>
                      <span className={"dot " + g.brand} />
                      <span>{g.name}</span>
                    </Link>
                  </td>
                  <td>{g.generation}</td>
                  <td className="num">{formatNumber(g.shaders, currency)}</td>
                  <td className="num">{g.boostClock.toFixed(2)} GHz</td>
                  <td className="num">{g.tflops.toFixed(1)}</td>
                  <td className="num">{g.vram} GB</td>
                  <td className="num">{g.bandwidth} GB/s</td>
                  <td className="num">{g.tdp} W</td>
                  <td className="num">
                    {formatPrice(currency === "inr" ? g.inr : g.msrp, currency)}
                  </td>
                  <td className="num">{g.perf.raster1440}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <p className="empty">No cards match those filters.</p> : null}
        <p className="note">{money.specNote}</p>
      </section>
    </>
  );
}
