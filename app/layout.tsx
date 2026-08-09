import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GPU Compare — graphics cards and gaming laptops in detail",
    template: "%s — GPU Compare",
  },
  description:
    "Compare graphics cards side by side and shortlist gaming laptops by the GPU they ship, " +
    "with full specifications, performance, efficiency and value in USD or INR.",
  icons: {
    icon:
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<text y='.9em' font-size='90'>🎮</text></svg>",
  },
};

// Applied before paint so a dark-mode visitor never sees a light flash.
const THEME_BOOTSTRAP = `
try {
  var saved = localStorage.getItem('gpucompare-theme');
  var dark = saved ? saved === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <Providers>
          <Nav />
          <main className="wrap">{children}</main>
          <footer className="footer wrap">
            <p>
              Specifications compiled from manufacturer datasheets. Performance indices and
              Indian prices are approximate and hand-maintained — orientation only, not a
              buying guarantee. Not affiliated with NVIDIA, AMD or Intel.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
