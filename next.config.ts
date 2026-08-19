import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
