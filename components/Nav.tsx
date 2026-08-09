"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSite } from "./Providers";

const LINKS = [
  { href: "/compare/", label: "Compare" },
  { href: "/gpus/", label: "GPU database" },
  { href: "/laptops/", label: "Laptop finder" },
];

export default function Nav() {
  const pathname = usePathname();
  const { currency, setCurrency, toggleTheme } = useSite();

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <Link className="logo" href="/">
          <span className="logo-mark" aria-hidden="true" />
          <span>
            GPU<strong>Compare</strong>
          </span>
        </Link>

        <nav className="nav">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname.startsWith(link.href) ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="topbar-actions">
          <div className="segmented segmented-sm" role="group" aria-label="Currency">
            <button
              type="button"
              className={currency === "usd" ? "active" : ""}
              onClick={() => setCurrency("usd")}
              title="US launch price"
            >
              USD
            </button>
            <button
              type="button"
              className={currency === "inr" ? "active" : ""}
              onClick={() => setCurrency("inr")}
              title="Typical India street price"
            >
              INR
            </button>
          </div>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle colour theme"
          >
            <span className="theme-icon" aria-hidden="true">
              ◐
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
