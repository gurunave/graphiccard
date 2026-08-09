"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MONEY, type Currency, type MoneyMode } from "@/lib/format";

type Theme = "light" | "dark";

interface SiteContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  money: MoneyMode;
  theme: Theme;
  toggleTheme: () => void;
  /** True once client-side preferences have been read, to avoid hydration drift. */
  ready: boolean;
  toast: (message: string) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside <Providers>");
  return ctx;
}

/** Default to rupees for visitors in India, dollars elsewhere. */
function detectCurrency(): Currency {
  try {
    const saved = localStorage.getItem("gpucompare-currency");
    if (saved === "usd" || saved === "inr") return saved;
  } catch {
    /* private mode */
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || ""];
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const inIndia = langs.some((l) => /-IN\b/i.test(l)) || /(Kolkata|Calcutta)/.test(zone);
  return inIndia ? "inr" : "usd";
}

function detectTheme(): Theme {
  try {
    const saved = localStorage.getItem("gpucompare-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function Providers({ children }: { children: ReactNode }) {
  // Server-rendered markup must match the first client render, so preferences
  // are applied in an effect rather than during render.
  const [currency, setCurrencyState] = useState<Currency>("usd");
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCurrencyState(detectCurrency());
    setTheme(detectTheme());
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("gpucompare-currency", c);
    } catch {
      /* private mode */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("gpucompare-theme", next);
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const toast = useCallback((text: string) => setMessage(text), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2400);
    return () => clearTimeout(timer);
  }, [message]);

  const value = useMemo(
    () => ({ currency, setCurrency, money: MONEY[currency], theme, toggleTheme, ready, toast }),
    [currency, setCurrency, theme, toggleTheme, ready, toast],
  );

  return (
    <SiteContext.Provider value={value}>
      {children}
      <div className={"toast" + (message ? " show" : "")} role="status" aria-live="polite">
        {message}
      </div>
    </SiteContext.Provider>
  );
}
