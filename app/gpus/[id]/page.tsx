import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GPUS, getGpu } from "@/lib/gpus";
import GpuDetailClient from "./GpuDetailClient";

export function generateStaticParams() {
  return GPUS.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const gpu = getGpu(id);
  if (!gpu) return { title: "Card not found" };
  return {
    title: gpu.name,
    description:
      `${gpu.name} full specifications: ${gpu.shaders.toLocaleString("en-US")} shaders, ` +
      `${gpu.vram} GB ${gpu.vramType}, ${gpu.tdp} W board power, plus performance, ` +
      `efficiency and value figures.`,
  };
}

export default async function GpuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gpu = getGpu(id);
  if (!gpu) notFound();
  return <GpuDetailClient id={id} />;
}
