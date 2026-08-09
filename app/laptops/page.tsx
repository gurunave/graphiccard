import type { Metadata } from "next";
import LaptopClient from "./LaptopClient";

export const metadata: Metadata = {
  title: "Shortlist a gaming laptop",
  description:
    "Find and shortlist gaming laptops by the GPU they ship, ranked on the power each " +
    "chassis actually gives that GPU rather than on the name on the box.",
};

export default function LaptopsPage() {
  return <LaptopClient />;
}
