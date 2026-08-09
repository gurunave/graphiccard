"use client";

import { Fragment } from "react";
import Link from "next/link";
import { GPUS, GPU_BY_ID, type DerivedGpu } from "@/lib/gpus";
import { SPEC_GROUPS, pick, type SpecRow } from "@/lib/specs";
import { laptopsForDesktopGpu } from "@/lib/laptops";
import {
  availabilityClass,
  formatDate,
  formatNumber,
  formatPrice,
  type Currency,
} from "@/lib/format";
import { useSite } from "@/components/Providers";
import Bars from "@/components/Bars";

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

export default function GpuDetailClient({ id }: { id: string }) {
  const { currency, money } = useSite();
  const gpu = GPU_BY_ID[id];
  if (!gpu) return null;

  const price = currency === "inr" ? gpu.inr : gpu.msrp;
  const value = currency === "inr" ? gpu.perfPerInr : gpu.perfPerDollar;
  const laptops = laptopsForDesktopGpu(gpu.id);

  // Nearest cards by 1440p index, for a quick "what else is around here" list.
  const neighbours = GPUS.filter((g) => g.id !== gpu.id)
    .sort(
      (a, b) =>
        Math.abs(a.perf.raster1440 - gpu.perf.raster1440) -
        Math.abs(b.perf.raster1440 - gpu.perf.raster1440),
    )
    .slice(0, 4);

  return (
    <>
      <section className="hero" style={{ maxWidth: "none" }}>
        <div className="crumbs">
          <Link href="/gpus/">GPU database</Link> / {gpu.name}
        </div>
        <div className="detail-head">
          <div>
            <h1>{gpu.name}</h1>
            <p className="lede">
              {gpu.generation} · {gpu.architecture} on {gpu.process} · released{" "}
              {formatDate(gpu.released, currency)}
            </p>
            {currency === "inr" ? (
              <div
                className={"availability " + availabilityClass(gpu.indiaAvailability)}
                style={{ marginTop: ".7rem" }}
              >
                {gpu.indiaAvailability} in India
              </div>
            ) : null}
          </div>
          <Link className="btn btn-primary" href={`/compare/?gpus=${gpu.id}`}>
            Compare this card
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Headline numbers</h2>
        </div>
        <div className="kv-grid">
          <div className="kv">
            <span>{money.priceLabel}</span>
            <b>{formatPrice(price, currency)}</b>
          </div>
          <div className="kv">
            <span>1440p index</span>
            <b>{gpu.perf.raster1440}</b>
          </div>
          <div className="kv">
            <span>Ray tracing</span>
            <b>{gpu.perf.rt1440}</b>
          </div>
          <div className="kv">
            <span>Memory</span>
            <b>
              {gpu.vram} GB {gpu.vramType}
            </b>
          </div>
          <div className="kv">
            <span>FP32</span>
            <b>{gpu.tflops} TFLOPS</b>
          </div>
          <div className="kv">
            <span>Board power</span>
            <b>{gpu.tdp} W</b>
          </div>
          <div className="kv">
            <span>Value {money.valueShort}</span>
            <b>{value.toFixed(2)}</b>
          </div>
          <div className="kv">
            <span>Per 100 W</span>
            <b>{gpu.perfPerWatt.toFixed(1)}</b>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Performance across resolutions</h2>
        </div>
        <Bars
          data={[
            { key: "r1080", label: "1080p raster", value: gpu.perf.raster1080, display: String(gpu.perf.raster1080) },
            { key: "r1440", label: "1440p raster", value: gpu.perf.raster1440, display: String(gpu.perf.raster1440) },
            { key: "r2160", label: "4K raster", value: gpu.perf.raster2160, display: String(gpu.perf.raster2160) },
            { key: "rt", label: "1440p ray tracing", value: gpu.perf.rt1440, display: String(gpu.perf.rt1440) },
          ]}
        />
        <p className="note">
          Relative index, desktop RTX 4090 = 100. The percentages compare each row against this
          card&rsquo;s own best result, not against other cards.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Full specifications</h2>
        </div>
        <div className="table-scroll">
          <table className="spec-table">
            <tbody>
              {SPEC_GROUPS.map((group) => {
                const rows = group.rows.filter(
                  (row) => !row.onlyWhen || row.onlyWhen === currency,
                );
                return (
                  <Fragment key={group.group}>
                    <tr className="group-row">
                      <td colSpan={2}>{group.group}</td>
                    </tr>
                    {rows.map((row) => (
                      <tr key={group.group + row.key}>
                        <th className="spec-name">
                          {typeof row.label === "string" ? row.label : row.label[currency]}
                        </th>
                        <td>{cellText(gpu, row, currency)}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">{money.specNote}</p>
      </section>

      {laptops.length > 0 ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Laptops in this performance class</h2>
            <Link className="btn btn-ghost btn-sm" href="/laptops/">
              Open laptop finder
            </Link>
          </div>
          <p className="note" style={{ marginTop: 0, marginBottom: "1rem" }}>
            These machines ship a mobile GPU loosely comparable to the {gpu.name}. Loosely is
            the operative word — laptop parts are cut down, and how much power the chassis
            allows matters as much as the name.
          </p>
          <div className="laptop-grid">
            {laptops.map((l) => (
              <div className="laptop" key={l.id}>
                <div className="laptop-top">
                  <div>
                    <div className="laptop-name">
                      {l.brand} {l.name}
                    </div>
                    <div className="laptop-brand">
                      {l.gpu.short} at {l.tgp} W · index {l.effectivePerf}
                    </div>
                  </div>
                  <div className="laptop-price">
                    {formatPrice(currency === "inr" ? l.inr : l.msrp, currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Cards with similar performance</h2>
        </div>
        <div className="laptop-grid">
          {neighbours.map((n) => (
            <Link
              className="laptop"
              href={`/compare/?gpus=${gpu.id},${n.id}`}
              key={n.id}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="laptop-top">
                <div>
                  <div className="laptop-name">
                    <span className={"dot " + n.brand} style={{ marginRight: ".4rem" }} />
                    {n.name}
                  </div>
                  <div className="laptop-brand">
                    Index {n.perf.raster1440} · {n.vram} GB · {n.tdp} W
                  </div>
                </div>
                <div className="laptop-price">
                  {formatPrice(currency === "inr" ? n.inr : n.msrp, currency)}
                </div>
              </div>
              <div className="laptop-actions">
                <span className="go" style={{ color: "var(--accent)", fontSize: ".85rem" }}>
                  Compare with {gpu.name} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
