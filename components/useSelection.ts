"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A list of picked ids kept in the URL (and optionally localStorage) so a
 * selection can be shared or survives a reload.
 *
 * The query string is read in an effect rather than with useSearchParams:
 * under `output: "export"` that hook forces the page into client-side bailout
 * rendering, and this avoids the extra Suspense dance for a one-line read.
 */
export function useSelection(options: {
  param: string;
  isValid: (id: string) => boolean;
  max?: number;
  storageKey?: string;
}) {
  const { param, isValid, max, storageKey } = options;
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromUrl = (new URLSearchParams(window.location.search).get(param) || "")
      .split(",")
      .filter(Boolean);

    let initial = fromUrl;
    if (!initial.length && storageKey) {
      try {
        initial = JSON.parse(localStorage.getItem(storageKey) || "[]");
      } catch {
        initial = [];
      }
    }
    const valid = Array.isArray(initial) ? initial.filter(isValid) : [];
    setSelected(max ? valid.slice(0, max) : valid);
    setHydrated(true);
    // isValid is a stable data lookup; re-running on its identity would clobber
    // the user's picks on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, max, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (selected.length) url.searchParams.set(param, selected.join(","));
    else url.searchParams.delete(param);
    window.history.replaceState(null, "", url);

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(selected));
      } catch {
        /* private mode */
      }
    }
  }, [selected, hydrated, param, storageKey]);

  const toggle = useCallback(
    (id: string, onFull?: () => void) => {
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (max && prev.length >= max) {
          onFull?.();
          return prev;
        }
        return [...prev, id];
      });
    },
    [max],
  );

  const clear = useCallback(() => setSelected([]), []);

  return { selected, setSelected, toggle, clear, hydrated };
}
