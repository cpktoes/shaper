import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { DesignProvider as Provider } from "@/components/design/design-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shaper — Surfboard Design",
  description: "Design custom surfboards with calculated rail bands, fin placement, and volume.",
};

/**
 * Root layout — mounts the single shared board-state provider and top nav instance that both `/`
 * and every `/design/*` screen share, so a preset applied on `/` (or an edit made in the outline
 * editor) is visible everywhere without a remount. The wrapper div below is layout-critical, not
 * decoration — it passes full-height flex sizing from this file's `body` down to the design
 * screens' own flex-1 panels; dropping it collapses them to content height.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Provider>
          <div className="flex min-h-0 flex-1 flex-col">
            <SiteNav />
            {children}
          </div>
        </Provider>
      </body>
    </html>
  );
}
