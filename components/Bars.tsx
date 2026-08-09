"use client";

import { SERIES_COLORS } from "@/lib/format";

export interface BarDatum {
  key: string;
  label: string;
  brand?: string;
  value: number;
  display: string;
}

/**
 * Horizontal bar chart. Bars are scaled against the largest value and each
 * non-leading row is annotated with its deficit against the leader, which is
 * the number people actually want when comparing two parts.
 */
export default function Bars({
  data,
  colors = SERIES_COLORS,
}: {
  data: BarDatum[];
  colors?: string[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const leader = Math.max(...data.map((d) => d.value));

  return (
    <div className="charts">
      {data.map((d, i) => (
        <div className="bar-row" key={d.key}>
          <div className="bar-label" title={d.label}>
            {d.brand ? <span className={"dot " + d.brand} /> : null}
            <span>{d.label}</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={
                {
                  width: (d.value / max) * 100 + "%",
                  "--bar-color": colors[i % colors.length],
                } as React.CSSProperties
              }
            />
          </div>
          <div className="bar-value">
            {d.display}
            {d.value !== leader && leader > 0 ? (
              <span className="bar-delta">
                ({Math.round((d.value / leader - 1) * 100)}%)
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
