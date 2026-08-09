import type { Metadata } from "next";
import GpuListClient from "./GpuListClient";

export const metadata: Metadata = {
  title: "GPU database",
  description:
    "Every graphics card in one sortable table — shaders, clocks, bandwidth, board power, " +
    "price and performance index.",
};

export default function GpusPage() {
  return <GpuListClient />;
}
