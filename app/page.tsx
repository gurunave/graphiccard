import Link from "next/link";
import { GPUS } from "@/lib/gpus";
import { DERIVED_LAPTOPS, USED_LAPTOP_GPUS } from "@/lib/laptops";

const SECTIONS = [
  {
    href: "/compare/",
    icon: "⚖️",
    title: "Compare graphics cards",
    body:
      "Put up to four cards side by side across silicon, memory, performance, power and " +
      "value. Winning values in each row are highlighted, and you can hide everything " +
      "the cards agree on.",
    cta: "Build a comparison",
  },
  {
    href: "/gpus/",
    icon: "🗂️",
    title: "GPU database",
    body:
      "Every card in one sortable table — shaders, clocks, bandwidth, board power and " +
      "price. Open any card for a full spec sheet and the laptops that carry a mobile " +
      "version of it.",
    cta: "Browse all cards",
  },
  {
    href: "/laptops/",
    icon: "💻",
    title: "Shortlist a laptop",
    body:
      "Find gaming laptops by the GPU they ship — then shortlist and compare them. Ranked " +
      "on the power each chassis actually gives the GPU, not on the name printed on the box.",
    cta: "Find a laptop",
  },
];

export default function HomePage() {
  const newest = GPUS.reduce((a, b) => (b.released > a.released ? b : a));

  return (
    <>
      <section className="hero">
        <h1>Graphics cards and gaming laptops, compared properly</h1>
        <p className="lede">
          Full specifications, an approximate performance index, efficiency and value — for
          desktop cards and for the laptops that ship their mobile counterparts. Prices in
          US dollars or Indian rupees.
        </p>
      </section>

      <div className="home-grid">
        {SECTIONS.map((s) => (
          <Link className="home-card" href={s.href} key={s.href}>
            <span className="home-icon" aria-hidden="true">
              {s.icon}
            </span>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
            <span className="go">{s.cta} →</span>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>What&rsquo;s in here</h2>
        </div>
        <div className="stat-row">
          <div>
            <b className="big">{GPUS.length}</b>
            <span className="lbl">desktop graphics cards</span>
          </div>
          <div>
            <b className="big">{DERIVED_LAPTOPS.length}</b>
            <span className="lbl">gaming laptops</span>
          </div>
          <div>
            <b className="big">{USED_LAPTOP_GPUS.length}</b>
            <span className="lbl">laptop GPU variants</span>
          </div>
          <div>
            <b className="big">{newest.year}</b>
            <span className="lbl">newest release covered</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>How to read the numbers</h2>
        </div>
        <p className="note" style={{ marginTop: 0 }}>
          <b style={{ color: "var(--text)" }}>Performance index.</b> Every performance figure
          on this site is a relative index with the desktop RTX 4090 at 100, aggregated from
          published review results. It places parts in tiers; it does not predict frame rates
          in a specific game.
        </p>
        <p className="note">
          <b style={{ color: "var(--text)" }}>Prices.</b> USD figures are launch MSRP. INR
          figures are typical Indian street prices including GST, maintained separately rather
          than converted — customs duty and GST put real Indian pricing well above a converted
          MSRP. Both drift over time, so confirm before buying.
        </p>
        <p className="note">
          <b style={{ color: "var(--text)" }}>Laptop GPUs.</b> A laptop RTX 5080 is not a
          desktop RTX 5080, and two laptops with the same GPU can differ by 20% depending on
          the power the chassis allows. The laptop finder ranks on that effective figure.
        </p>
      </section>
    </>
  );
}
