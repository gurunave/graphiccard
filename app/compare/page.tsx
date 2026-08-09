import type { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare graphics cards",
  description:
    "Put up to four graphics cards side by side: silicon, memory, performance index, ray " +
    "tracing, efficiency and value, in USD or INR.",
};

export default function ComparePage() {
  return <CompareClient />;
}
