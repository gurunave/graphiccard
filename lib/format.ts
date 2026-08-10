/*
 * Currency modes.
 *
 * USD shows the announced launch/list price; INR shows the typical Indian
 * street price, which is a separately maintained figure rather than a converted
 * one — customs duty and GST put real Indian prices well above the converted
 * dollar figure. Each mode also carries the locale used for every number and
 * date on the site, so INR mode gets lakh/crore digit grouping.
 */

export type Currency = "usd" | "inr";

export interface MoneyMode {
  locale: string;
  priceKey: "msrp" | "inr";
  valueKey: "perfPerDollar" | "perfPerInr";
  priceLabel: string;
  valueHeading: string;
  valueShort: string;
  /** Laptop value is quoted per a larger unit of money — machines cost more. */
  laptopValueHeading: string;
  laptopValueShort: string;
  filterLabel: string;
  columnLabel: string;
  gpuFilterSteps: [number, string][];
  laptopFilterSteps: [number, string][];
  format: (v: number) => string;
  specNote: string;
}

export const MONEY: Record<Currency, MoneyMode> = {
  usd: {
    locale: "en-US",
    priceKey: "msrp",
    valueKey: "perfPerDollar",
    priceLabel: "MSRP",
    valueHeading: "Performance per $100 of MSRP",
    valueShort: "per $100",
    laptopValueHeading: "Performance per $1,000",
    laptopValueShort: "per $1,000",
    filterLabel: "Max MSRP",
    columnLabel: "MSRP",
    gpuFilterSteps: [
      [300, "$300"],
      [500, "$500"],
      [800, "$800"],
      [1200, "$1200"],
    ],
    laptopFilterSteps: [
      [900, "$900"],
      [1300, "$1300"],
      [2000, "$2000"],
      [3500, "$3500"],
    ],
    format: (v) => "$" + v.toLocaleString("en-US"),
    specNote:
      "Figures are for reference / Founders Edition boards. Partner cards vary in " +
      "clocks, power limit and dimensions. MSRP is the launch price, not current " +
      "street price.",
  },
  inr: {
    locale: "en-IN",
    priceKey: "inr",
    valueKey: "perfPerInr",
    priceLabel: "street price",
    valueHeading: "Performance per ₹10,000 spent",
    valueShort: "per ₹10k",
    laptopValueHeading: "Performance per ₹1,00,000",
    laptopValueShort: "per ₹1L",
    filterLabel: "Max price",
    columnLabel: "India price",
    gpuFilterSteps: [
      [30000, "₹30k"],
      [50000, "₹50k"],
      [80000, "₹80k"],
      [130000, "₹1.3L"],
    ],
    laptopFilterSteps: [
      [80000, "₹80k"],
      [120000, "₹1.2L"],
      [180000, "₹1.8L"],
      [300000, "₹3L"],
    ],
    format: (v) => "₹" + v.toLocaleString("en-IN"),
    specNote:
      "Figures are for reference / Founders Edition boards. Partner cards vary in " +
      "clocks, power limit and dimensions. Indian prices are approximate street " +
      "prices including GST, hand-maintained rather than live — they move with " +
      "import duty, the dollar rate and stock, so confirm with a retailer before " +
      "buying.",
  },
};

export function formatPrice(value: number, currency: Currency): string {
  return MONEY[currency].format(value);
}

export function formatNumber(value: number | string, currency: Currency): string {
  return typeof value === "number" ? value.toLocaleString(MONEY[currency].locale) : value;
}

export function formatDate(iso: string, currency: Currency): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString(MONEY[currency].locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Slug used on the availability badge, e.g. "Widely available" -> "widely". */
export function availabilityClass(availability: string): string {
  return availability.split(" ")[0].toLowerCase();
}

export const SERIES_COLORS = ["#4f6ef7", "#ef8b3c", "#25b18a", "#c46bd8"];
