import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { signUpConsentText } from "@/lib/legal/documents";
import { SignUpConsent } from "./sign-up-consent";

/**
 * The consent line under the sign-in / sign-up card (quick 261006-fom, D-04, T-261006-03), rendered
 * on the server. Clerk never loads under the browser suite's fake keys, so the dialog itself can't
 * be opened there; this render plus the source contract in `lib/legal/wiring.test.ts` are the
 * proof, and the founder sees the real dialog at the review.
 */
describe("SignUpConsent", () => {
  const markup = renderToStaticMarkup(createElement(SignUpConsent));

  it("reads the founder's sentence exactly, once its tags are stripped", () => {
    expect(markup.replace(/<[^>]+>/g, "")).toBe(signUpConsentText());
  });

  it("links Terms of Service to /terms and Privacy Policy to /privacy, each in a new tab", () => {
    expect(markup).toMatch(/<a href="\/terms" target="_blank" rel="noopener noreferrer"[^>]*>Terms of Service<\/a>/);
    expect(markup).toMatch(/<a href="\/privacy" target="_blank" rel="noopener noreferrer"[^>]*>Privacy Policy<\/a>/);
  });

  it("is marked as the consent line", () => {
    expect(markup).toMatch(/^<p [^>]*data-sign-up-consent=/);
  });
});
