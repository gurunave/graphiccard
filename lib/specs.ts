import type { DerivedGpu } from "./gpus";

/**
 * Spec table definition.
 *
 * `better` says which direction wins for highlighting: "high", "low", or null
 * for informational rows that are not ranked. `label` may vary by currency.
 * `format: "price"` and `"perfPerMoney"` resolve against the active currency
 * rather than a fixed field, and `onlyWhen` hides a row outside that currency.
 */
export type Better = "high" | "low" | null;

export interface SpecRow {
  key: string;
  label: string | { usd: string; inr: string };
  better: Better;
  format?: "price" | "date" | "cu" | "rt" | "tensor" | "perfPerMoney";
  unit?: string;
  onlyWhen?: "usd" | "inr";
}

export interface SpecGroup {
  group: string;
  rows: SpecRow[];
}

export const SPEC_GROUPS: SpecGroup[] = [
  {
    "group": "Overview",
    "rows": [
      {
        "key": "brand",
        "label": "Brand",
        "better": null
      },
      {
        "key": "generation",
        "label": "Generation",
        "better": null
      },
      {
        "key": "tier",
        "label": "Market tier",
        "better": null
      },
      {
        "key": "released",
        "label": "Release date",
        "better": null,
        "format": "date"
      },
      {
        "key": "price",
        "label": {
          "usd": "Launch MSRP",
          "inr": "India street price"
        },
        "better": "low",
        "format": "price"
      },
      {
        "key": "indiaAvailability",
        "label": "Availability in India",
        "better": null,
        "onlyWhen": "inr"
      }
    ]
  },
  {
    "group": "Silicon",
    "rows": [
      {
        "key": "architecture",
        "label": "Architecture",
        "better": null
      },
      {
        "key": "gpuChip",
        "label": "GPU die",
        "better": null
      },
      {
        "key": "process",
        "label": "Process node",
        "better": null
      },
      {
        "key": "transistors",
        "label": "Transistors",
        "better": "high",
        "unit": "B"
      },
      {
        "key": "dieSize",
        "label": "Die size",
        "better": null,
        "unit": "mm²"
      }
    ]
  },
  {
    "group": "Compute",
    "rows": [
      {
        "key": "shaders",
        "label": "Shading units",
        "better": "high"
      },
      {
        "key": "computeUnits",
        "label": "Compute units",
        "better": "high",
        "format": "cu"
      },
      {
        "key": "rtCores",
        "label": "Ray tracing cores",
        "better": "high",
        "format": "rt"
      },
      {
        "key": "tensorCores",
        "label": "AI / tensor cores",
        "better": "high",
        "format": "tensor"
      },
      {
        "key": "baseClock",
        "label": "Base clock",
        "better": "high",
        "unit": " GHz"
      },
      {
        "key": "boostClock",
        "label": "Boost clock",
        "better": "high",
        "unit": " GHz"
      },
      {
        "key": "tflops",
        "label": "FP32 compute",
        "better": "high",
        "unit": " TFLOPS"
      }
    ]
  },
  {
    "group": "Memory",
    "rows": [
      {
        "key": "vram",
        "label": "Memory size",
        "better": "high",
        "unit": " GB"
      },
      {
        "key": "vramType",
        "label": "Memory type",
        "better": null
      },
      {
        "key": "memoryBus",
        "label": "Memory bus",
        "better": "high",
        "unit": "-bit"
      },
      {
        "key": "memoryClock",
        "label": "Memory speed",
        "better": "high",
        "unit": " Gbps"
      },
      {
        "key": "bandwidth",
        "label": "Bandwidth",
        "better": "high",
        "unit": " GB/s"
      },
      {
        "key": "l2Cache",
        "label": "L2 / Infinity Cache",
        "better": "high",
        "unit": " MB"
      }
    ]
  },
  {
    "group": "Performance index (RTX 4090 = 100)",
    "rows": [
      {
        "key": "perf.raster1080",
        "label": "1080p raster",
        "better": "high"
      },
      {
        "key": "perf.raster1440",
        "label": "1440p raster",
        "better": "high"
      },
      {
        "key": "perf.raster2160",
        "label": "4K raster",
        "better": "high"
      },
      {
        "key": "perf.rt1440",
        "label": "1440p ray tracing",
        "better": "high"
      },
      {
        "key": "perfPerMoney",
        "label": {
          "usd": "Performance per $100",
          "inr": "Performance per ₹10,000"
        },
        "better": "high",
        "format": "perfPerMoney"
      },
      {
        "key": "perfPerWatt",
        "label": "Performance per 100 W",
        "better": "high"
      }
    ]
  },
  {
    "group": "Power & physical",
    "rows": [
      {
        "key": "tdp",
        "label": "Board power (TBP)",
        "better": "low",
        "unit": " W"
      },
      {
        "key": "psu",
        "label": "Recommended PSU",
        "better": "low",
        "unit": " W"
      },
      {
        "key": "powerConnector",
        "label": "Power connector",
        "better": null
      },
      {
        "key": "slots",
        "label": "Slot width",
        "better": "low",
        "unit": " slots"
      },
      {
        "key": "length",
        "label": "Reference length",
        "better": "low",
        "unit": " mm"
      }
    ]
  },
  {
    "group": "Connectivity & features",
    "rows": [
      {
        "key": "pcie",
        "label": "Bus interface",
        "better": null
      },
      {
        "key": "outputs",
        "label": "Display outputs",
        "better": null
      },
      {
        "key": "encoders",
        "label": "Media engine",
        "better": null
      },
      {
        "key": "upscaling",
        "label": "Upscaling / frame gen",
        "better": null
      }
    ]
  }
];

/** Reads a possibly dotted path off a gpu, e.g. "perf.raster1440". */
export function pick(gpu: DerivedGpu, key: string): unknown {
  return key.includes(".")
    ? key.split(".").reduce<unknown>(
        (o, k) => (o == null ? o : (o as Record<string, unknown>)[k]),
        gpu,
      )
    : (gpu as unknown as Record<string, unknown>)[key];
}
