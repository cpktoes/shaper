import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copyrightNotice } from "@/lib/site/footer";
import { SiteFooter } from "./site-footer";

/**
 * The site footer, rendered on the server the way every page draws it (quick 261006-fom, D-02):
 * the founder's notice, a link to each legal page, and never on paper.
 */
describe("SiteFooter", () => {
  const markup = renderToStaticMarkup(createElement(SiteFooter, {}));

  it("holds this year's notice", () => {
    expect(markup).toContain(copyrightNotice());
  });

  it("links Terms to /terms and Privacy to /privacy", () => {
    expect(markup).toMatch(/<a [^>]*href="\/terms"[^>]*>Terms<\/a>/);
    expect(markup).toMatch(/<a [^>]*href="\/privacy"[^>]*>Privacy<\/a>/);
  });

  it("is marked as the footer and is never printed", () => {
    expect(markup).toMatch(/^<footer [^>]*data-site-footer=/);
    expect(markup).toMatch(/^<footer [^>]*data-print-hide=/);
    expect(markup).toMatch(/^<footer [^>]*class="[^"]*\bprint:hidden\b/);
  });

  it("keeps the faint rule above it whatever a placement adds", () => {
    const placed = renderToStaticMarkup(createElement(SiteFooter, { className: "max-w-80 pb-8" }));
    expect(placed).toMatch(/class="[^"]*border-t border-surf-line-faint[^"]*max-w-80 pb-8/);
  });
});
