/* GPU comparison page — selection, charts, spec diffing, URL state. */
(function () {
  "use strict";

  const MAX_SLOTS = 4;
  const SERIES_COLORS = ["#4f6ef7", "#ef8b3c", "#25b18a", "#c46bd8"];

  const state = {
    selected: [],                 // array of gpu ids, in pick order
    metric: "raster1440",
    diffOnly: false,
    currency: "usd",              // "usd" (launch MSRP) or "inr" (India street)
    filters: { q: "", brand: "", gen: "", vram: 0, price: 0 },
    sortBy: "perf",
    dbSort: { key: "perf", asc: false }
  };

  /*
   * Currency modes. USD shows the announced launch MSRP; INR shows the typical
   * Indian street price, which is a separately maintained figure rather than a
   * converted one. Each mode also carries the locale used for every number and
   * date on the page, so INR mode gets lakh/crore digit grouping.
   */
  const MONEY = {
    usd: {
      locale: "en-US",
      priceKey: "msrp",
      valueKey: "perfPerDollar",
      priceLabel: "MSRP",
      valueHeading: "Performance per $100 of MSRP",
      filterLabel: "Max MSRP",
      columnLabel: "MSRP",
      filterSteps: [[300, "$300"], [500, "$500"], [800, "$800"], [1200, "$1200"]],
      format: (v) => "$" + v.toLocaleString("en-US"),
      note: "Figures are for reference / Founders Edition boards. Partner cards vary in " +
            "clocks, power limit and dimensions. MSRP is the launch price, not current " +
            "street price."
    },
    inr: {
      locale: "en-IN",
      priceKey: "inr",
      valueKey: "perfPerInr",
      priceLabel: "street price",
      valueHeading: "Performance per ₹10,000 spent",
      filterLabel: "Max price",
      columnLabel: "India price",
      filterSteps: [[30000, "₹30k"], [50000, "₹50k"], [80000, "₹80k"], [130000, "₹1.3L"]],
      format: (v) => "₹" + v.toLocaleString("en-IN"),
      note: "Figures are for reference / Founders Edition boards. Partner cards vary in " +
            "clocks, power limit and dimensions. Indian prices are approximate street " +
            "prices including GST, hand-maintained rather than live — they move with " +
            "import duty, the dollar rate and stock, so confirm with a retailer before " +
            "buying."
    }
  };

  const money = () => MONEY[state.currency];

  const byId = Object.fromEntries(GPUS.map((g) => [g.id, g]));
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ------------------------------------------------------------ formatting */
  const fmt = {
    price: (v) => money().format(v),
    date: (v) =>
      new Date(v + "T00:00:00Z").toLocaleDateString(money().locale, {
        year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
      }),
    num: (v) => (typeof v === "number" ? v.toLocaleString(money().locale) : v)
  };

  function pick(gpu, key) {
    return key.includes(".")
      ? key.split(".").reduce((o, k) => (o == null ? o : o[k]), gpu)
      : gpu[key];
  }

  /* Price and value rows resolve against whichever currency is active. */
  function rowValue(gpu, row) {
    if (row.format === "price") return gpu[money().priceKey];
    if (row.format === "perfPerMoney") return gpu[money().valueKey];
    return pick(gpu, row.key);
  }

  function rowLabel(row) {
    return typeof row.label === "string" ? row.label : row.label[state.currency];
  }

  function cellText(gpu, row) {
    const raw = rowValue(gpu, row);
    if (raw == null || raw === "") return "—";
    if (row.format === "price") return fmt.price(raw);
    if (row.format === "date") return fmt.date(raw);
    if (row.format === "cu") return fmt.num(raw) + " " + gpu.cuLabel;
    if (row.format === "rt") return fmt.num(raw) + " (" + gpu.rtGen + ")";
    if (row.format === "tensor") return fmt.num(raw) + " (" + gpu.tensorGen + ")";
    return fmt.num(raw) + (row.unit || "");
  }

  /* Convenience accessors for the active currency. */
  const priceOf = (gpu) => gpu[money().priceKey];
  const valueOf = (gpu) => gpu[money().valueKey];

  const colorOf = (id) => SERIES_COLORS[state.selected.indexOf(id)] || SERIES_COLORS[0];

  /* --------------------------------------------------------------- URL sync */
  function readUrl() {
    const ids = (new URLSearchParams(location.search).get("gpus") || "")
      .split(",")
      .filter((id) => byId[id]);
    state.selected = ids.slice(0, MAX_SLOTS);
  }

  function writeUrl() {
    const url = new URL(location.href);
    if (state.selected.length) url.searchParams.set("gpus", state.selected.join(","));
    else url.searchParams.delete("gpus");
    history.replaceState(null, "", url);
  }

  /* ------------------------------------------------------------- selection */
  function toggle(id) {
    const i = state.selected.indexOf(id);
    if (i > -1) state.selected.splice(i, 1);
    else if (state.selected.length < MAX_SLOTS) state.selected.push(id);
    else return toast("You can compare up to " + MAX_SLOTS + " cards at a time.");
    render();
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ----------------------------------------------------------------- slots */
  function renderSlots() {
    const host = $("#slots");
    host.replaceChildren();
    for (let i = 0; i < MAX_SLOTS; i++) {
      const id = state.selected[i];
      if (!id) {
        host.append(el("div", "slot", "Empty slot " + (i + 1)));
        continue;
      }
      const g = byId[id];
      const slot = el("div", "slot filled");
      slot.style.setProperty("--slot-color", SERIES_COLORS[i]);

      const info = el("div", "slot-info");
      info.title = g.name;
      info.append(
        el("div", "slot-name", g.name),
        el("div", "slot-meta",
          g.vram + " GB " + g.vramType + " · " + g.tdp + " W · " + fmt.price(priceOf(g)))
      );

      const rm = el("button", "slot-remove", "×");
      rm.type = "button";
      rm.title = "Remove " + g.name;
      rm.addEventListener("click", () => toggle(id));

      slot.append(info, rm);
      host.append(slot);
    }
    $("#slotCount").textContent = state.selected.length + " / " + MAX_SLOTS;
  }

  /* --------------------------------------------------------------- library */
  function filtered() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    let list = GPUS.filter((g) => {
      if (f.brand && g.brand !== f.brand) return false;
      if (f.gen && g.generation !== f.gen) return false;
      if (f.vram && g.vram < f.vram) return false;
      if (f.price && priceOf(g) > f.price) return false;
      if (!q) return true;
      return (g.name + " " + g.generation + " " + g.architecture + " " + g.gpuChip + " " + g.brand)
        .toLowerCase()
        .includes(q);
    });

    const sorters = {
      perf: (a, b) => b.perf.raster1440 - a.perf.raster1440,
      price: (a, b) => priceOf(a) - priceOf(b),
      value: (a, b) => valueOf(b) - valueOf(a),
      efficiency: (a, b) => b.perfPerWatt - a.perfPerWatt,
      vram: (a, b) => b.vram - a.vram || b.perf.raster1440 - a.perf.raster1440,
      newest: (a, b) => b.released.localeCompare(a.released),
      name: (a, b) => a.name.localeCompare(b.name)
    };
    return list.sort(sorters[state.sortBy] || sorters.perf);
  }

  function renderLibrary() {
    const host = $("#library");
    const list = filtered();
    host.replaceChildren();
    $("#libraryEmpty").hidden = list.length > 0;

    list.forEach((g) => {
      const selected = state.selected.includes(g.id);
      const card = el("button", "gpu-card" + (selected ? " selected" : ""));
      card.type = "button";
      card.disabled = !selected && state.selected.length >= MAX_SLOTS;

      const top = el("div", "gpu-card-top");
      top.append(el("span", "dot " + g.brand), el("span", "gpu-card-name", g.name));

      card.append(
        top,
        el("div", "gpu-card-specs",
          g.vram + " GB " + g.vramType + " · " + fmt.num(g.shaders) + " shaders · " + g.tdp + " W"),
        (() => {
          const foot = el("div", "gpu-card-foot");
          foot.append(
            el("span", null, fmt.price(priceOf(g))),
            el("span", null, "Index " + g.perf.raster1440)
          );
          return foot;
        })()
      );
      card.addEventListener("click", () => toggle(g.id));
      host.append(card);
    });
  }

  /* --------------------------------------------------------------- summary */
  function renderSummary() {
    const host = $("#summaryGrid");
    host.replaceChildren();
    const cards = state.selected.map((id) => byId[id]);

    cards.forEach((g, i) => {
      const c = el("div", "summary-card");
      c.style.setProperty("--card-color", SERIES_COLORS[i]);

      const price = el("div", "summary-price", fmt.price(priceOf(g)));
      price.append(el("small", null, " " + money().priceLabel));

      const stats = el("div", "summary-stats");
      [
        ["VRAM", g.vram + " GB " + g.vramType],
        ["Board power", g.tdp + " W"],
        ["FP32", g.tflops + " TFLOPS"],
        ["Bandwidth", g.bandwidth + " GB/s"],
        ["1440p index", String(g.perf.raster1440)],
        ["RT index", String(g.perf.rt1440)]
      ].forEach(([label, value]) => {
        const d = el("div");
        d.append(el("span", null, label), document.createTextNode(value));
        stats.append(d);
      });

      c.append(el("h3", null, g.name), el("div", "gen", g.generation), price);
      if (state.currency === "inr") {
        const avail = el("div", "availability " + g.indiaAvailability.split(" ")[0].toLowerCase(),
          g.indiaAvailability + " in India");
        c.append(avail);
      }
      c.append(stats);
      host.append(c);
    });

    renderVerdicts(cards);
  }

  function renderVerdicts(cards) {
    const host = $("#verdicts");
    host.replaceChildren();
    if (cards.length < 2) return;

    const best = (fn, better) =>
      cards.reduce((a, b) => (better === "low"
        ? (fn(b) < fn(a) ? b : a)
        : (fn(b) > fn(a) ? b : a)));

    [
      ["Fastest at 1440p", best((g) => g.perf.raster1440, "high")],
      ["Best ray tracing", best((g) => g.perf.rt1440, "high")],
      ["Best value", best((g) => valueOf(g), "high")],
      ["Most efficient", best((g) => g.perfPerWatt, "high")],
      ["Most VRAM", best((g) => g.vram, "high")],
      ["Lowest power", best((g) => g.tdp, "low")]
    ].forEach(([label, g]) => {
      const v = el("div", "verdict");
      v.append(document.createTextNode(label + ": "), el("b", null, g.name));
      host.append(v);
    });
  }

  /* ---------------------------------------------------------------- charts */
  function renderBars(host, cards, valueFn, formatFn) {
    host.replaceChildren();
    const values = cards.map(valueFn);
    const max = Math.max(...values, 1);
    const leader = Math.max(...values);

    cards.forEach((g, i) => {
      const value = values[i];
      const row = el("div", "bar-row");

      const label = el("div", "bar-label");
      label.title = g.name;
      label.append(el("span", "dot " + g.brand), el("span", null, g.name));

      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill");
      fill.style.setProperty("--bar-color", SERIES_COLORS[i]);

      const val = el("div", "bar-value", formatFn(value));
      if (value !== leader && leader > 0) {
        val.append(el("span", "bar-delta",
          "(" + Math.round((value / leader - 1) * 100) + "%)"));
      }

      track.append(fill);
      row.append(label, track, val);
      host.append(row);

      // Animate on the next frame so the transition actually runs.
      requestAnimationFrame(() => { fill.style.width = (value / max * 100) + "%"; });
    });
  }

  function renderCharts() {
    const cards = state.selected.map((id) => byId[id]);
    renderBars($("#perfChart"), cards, (g) => g.perf[state.metric], (v) => String(v));
    renderBars($("#valueChart"), cards, (g) => valueOf(g), (v) => v.toFixed(2));
    renderBars($("#effChart"), cards, (g) => g.perfPerWatt, (v) => v.toFixed(1));
    $("#valueHeading").textContent = money().valueHeading;
  }

  /* ------------------------------------------------------------ spec table */
  function renderSpecTable() {
    const table = $("#specTable");
    const cards = state.selected.map((id) => byId[id]);
    table.replaceChildren();

    const thead = el("thead");
    const hr = el("tr");
    hr.append(el("th", "spec-name", "Specification"));
    cards.forEach((g, i) => {
      const th = el("th");
      const head = el("div", "col-head");
      const name = el("b", null, g.name);
      name.style.color = SERIES_COLORS[i];
      head.append(name, el("em", null, g.architecture + " · " + g.gpuChip));
      th.append(head);
      hr.append(th);
    });
    thead.append(hr);
    table.append(thead);

    const tbody = el("tbody");
    SPEC_GROUPS.forEach((group) => {
      const rows = group.rows.filter((row) => {
        if (row.onlyWhen && row.onlyWhen !== state.currency) return false;
        if (!state.diffOnly) return true;
        const vals = cards.map((g) => String(rowValue(g, row)));
        return new Set(vals).size > 1;
      });
      if (!rows.length) return;

      const gr = el("tr", "group-row");
      const gtd = el("td", null, group.group);
      gtd.colSpan = cards.length + 1;
      gr.append(gtd);
      tbody.append(gr);

      rows.forEach((row) => {
        const tr = el("tr");
        tr.append(el("th", "spec-name", rowLabel(row)));

        const nums = cards.map((g) => rowValue(g, row));
        const numeric = row.better && nums.every((v) => typeof v === "number");
        const target = numeric
          ? (row.better === "low" ? Math.min(...nums) : Math.max(...nums))
          : null;
        const unanimous = numeric && new Set(nums).size === 1;

        cards.forEach((g, i) => {
          const td = el("td", null, cellText(g, row));
          if (numeric && !unanimous && nums[i] === target && cards.length > 1) {
            td.classList.add("best");
          }
          tr.append(td);
        });
        tbody.append(tr);
      });
    });
    table.append(tbody);
  }

  /* -------------------------------------------------------------- db table */
  function renderDbTable() {
    const tbody = $("#dbTable tbody");
    const { key, asc } = state.dbSort;
    const get = (g) => {
      if (key === "perf") return g.perf.raster1440;
      if (key === "price") return priceOf(g);
      return g[key];
    };

    const list = GPUS.slice().sort((a, b) => {
      const x = get(a), y = get(b);
      const cmp = typeof x === "string" ? x.localeCompare(y) : x - y;
      return asc ? cmp : -cmp;
    });

    tbody.replaceChildren();
    list.forEach((g) => {
      const tr = el("tr");
      if (state.selected.includes(g.id)) tr.classList.add("picked");

      const nameTd = el("td");
      const nameDiv = el("div", "db-name");
      nameDiv.append(el("span", "dot " + g.brand), el("span", null, g.name));
      nameTd.append(nameDiv);

      const cells = [
        g.generation,
        fmt.num(g.shaders),
        g.boostClock.toFixed(2) + " GHz",
        g.tflops.toFixed(1),
        g.vram + " GB",
        g.bandwidth + " GB/s",
        g.tdp + " W",
        fmt.price(priceOf(g)),
        String(g.perf.raster1440)
      ];
      tr.append(nameTd);
      cells.forEach((text, i) => tr.append(el("td", i === 0 ? null : "num", text)));

      tr.addEventListener("click", () => toggle(g.id));
      tbody.append(tr);
    });

    document.querySelectorAll("#dbTable thead th").forEach((th) => {
      th.classList.toggle("sorted", th.dataset.sort === key);
      th.classList.toggle("asc", th.dataset.sort === key && asc);
    });
  }

  /*
   * Chrome that changes wording or options with the currency: the price filter,
   * the database column header and the footnote under the spec table.
   */
  function renderCurrencyChrome() {
    const m = money();

    $("#priceFilterLabel").textContent = m.filterLabel;
    $("#priceCol").textContent = m.columnLabel;
    $("#specNote").textContent = m.note;

    const sel = $("#priceFilter");
    sel.replaceChildren(new Option("Any", "0"));
    m.filterSteps.forEach(([value, label]) => sel.append(new Option(label, String(value))));
    // The previous ceiling is meaningless in the other currency, so reset it.
    state.filters.price = 0;
    sel.value = "0";

    $("#currencyToggle").querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.currency === state.currency);
    });
  }

  /* ---------------------------------------------------------------- render */
  function render() {
    renderCurrencyChrome();
    renderSlots();
    renderLibrary();
    renderDbTable();

    const ready = state.selected.length > 0;
    $("#results").hidden = !ready;
    $("#placeholder").hidden = ready;

    if (ready) {
      renderSummary();
      renderCharts();
      renderSpecTable();
    }
    writeUrl();
  }

  /* ----------------------------------------------------------------- setup */
  function populateFilters() {
    const brands = BRAND_ORDER.filter((b) => GPUS.some((g) => g.brand === b));
    brands.forEach((b) => $("#brandFilter").append(new Option(b, b)));

    const gens = [];
    GPUS.forEach((g) => { if (!gens.includes(g.generation)) gens.push(g.generation); });
    gens.forEach((gen) => $("#genFilter").append(new Option(gen, gen)));
  }

  const PRESETS = [
    ["This gen flagships", ["rtx-5090", "rtx-5080", "rx-9070-xt"]],
    ["$500–800 sweet spot", ["rtx-5070", "rx-9070-xt", "rtx-4070-super"]],
    ["Budget builds", ["rtx-5060", "rx-9060-xt-16", "arc-b580"]],
    ["Blackwell vs Ada", ["rtx-5070-ti", "rtx-4070-ti-super"]],
    ["NVIDIA vs AMD vs Intel", ["rtx-5060-ti-16", "rx-9060-xt-16", "arc-b580"]],
    ["Is it time to upgrade?", ["rtx-3070", "rtx-4070", "rtx-5070"]]
  ];

  function buildPresets() {
    const host = $("#presets");
    PRESETS.forEach(([label, ids]) => {
      const b = el("button", "preset", label);
      b.type = "button";
      b.addEventListener("click", () => {
        state.selected = ids.filter((id) => byId[id]).slice(0, MAX_SLOTS);
        render();
        $("#summaryPanel").scrollIntoView({ block: "start" });
      });
      host.append(b);
    });
  }

  function bindEvents() {
    $("#search").addEventListener("input", (e) => {
      state.filters.q = e.target.value;
      renderLibrary();
    });
    const filterMap = {
      brandFilter: "brand", genFilter: "gen", vramFilter: "vram", priceFilter: "price"
    };
    Object.entries(filterMap).forEach(([elId, key]) => {
      $("#" + elId).addEventListener("change", (e) => {
        const v = e.target.value;
        state.filters[key] = key === "vram" || key === "price" ? +v : v;
        renderLibrary();
      });
    });
    $("#sortBy").addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      renderLibrary();
    });

    $("#clearBtn").addEventListener("click", () => {
      state.selected = [];
      render();
    });

    $("#perfToggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-metric]");
      if (!btn) return;
      state.metric = btn.dataset.metric;
      $("#perfToggle").querySelectorAll("button")
        .forEach((b) => b.classList.toggle("active", b === btn));
      renderCharts();
    });

    $("#diffOnly").addEventListener("change", (e) => {
      state.diffOnly = e.target.checked;
      renderSpecTable();
    });

    document.querySelectorAll("#dbTable thead th").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        // Lower-is-better columns read better ascending on first click.
        const ascFirst = ["name", "generation", "price", "tdp"];
        if (state.dbSort.key === key) state.dbSort.asc = !state.dbSort.asc;
        else state.dbSort = { key, asc: ascFirst.includes(key) };
        renderDbTable();
      });
    });

    $("#shareBtn").addEventListener("click", async () => {
      if (!state.selected.length) return toast("Select some cards first.");
      try {
        await navigator.clipboard.writeText(location.href);
        toast("Comparison link copied to clipboard.");
      } catch {
        toast("Copy failed — the link is in your address bar.");
      }
    });

    $("#currencyToggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-currency]");
      if (!btn || btn.dataset.currency === state.currency) return;
      state.currency = btn.dataset.currency;
      try { localStorage.setItem("gpucompare-currency", state.currency); } catch { /* private mode */ }
      render();
    });

    $("#themeBtn").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("gpucompare-theme", next); } catch { /* private mode */ }
    });
  }

  /* Default to rupees for visitors in India, dollars elsewhere. */
  function initCurrency() {
    let saved = null;
    try { saved = localStorage.getItem("gpucompare-currency"); } catch { /* private mode */ }
    if (saved && MONEY[saved]) {
      state.currency = saved;
      return;
    }
    const langs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ""];
    const inIndia = langs.some((l) => /-IN\b/i.test(l)) ||
      /(Kolkata|Calcutta)/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    state.currency = inIndia ? "inr" : "usd";
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("gpucompare-theme"); } catch { /* private mode */ }
    document.documentElement.dataset.theme =
      saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }

  initTheme();
  initCurrency();
  populateFilters();
  buildPresets();
  bindEvents();
  readUrl();
  render();
})();
