import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A phone (or any other device) on the home Wi-Fi reaches `npm run dev` at the Mac's network
  // address, not at localhost. The dev server refuses to hand its own scripts to any origin it was
  // not started on unless that origin is listed here, so the page arrives but nothing behind the
  // buttons ever loads ("Blocked cross-origin request to Next.js dev resource ..."). The founder
  // asked for every origin to be allowed (2026-09-26); Next.js refuses a bare "*" by design, so
  // this is the widest pattern it accepts — any dotted host name or address. Development only;
  // it has no effect on a production build.
  allowedDevOrigins: ["**.*"],
  experimental: {
    // Production server chunks otherwise carry a `.js.map` alongside each chunk that embeds the
    // original source text verbatim — including strings that only ever reach the client inside a
    // `process.env.NODE_ENV === "development"`-gated block (e.g. the dev-only preset-capture
    // affordance in components/outline/outline-editor.tsx). The compiled `.js` itself already
    // drops that block via dead-code elimination; this flag keeps the accompanying source map from
    // re-leaking the same source text into the production build output.
    turbopackSourceMaps: false,
  },
};

export default nextConfig;
