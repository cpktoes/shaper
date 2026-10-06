import { describe, expect, it } from "vitest";
import { CONTACT_COPY } from "@/lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "./copy";

/**
 * What is left of the Privacy page's copy after quick 261006-fom moved the page's words into the
 * founder's own `content/legal/privacy.md` (D-01): the address, and the two short labels the menus
 * and the Contact form show. The page itself is proven by `components/legal/legal-document.test.ts`
 * and `e2e/legal-pages.spec.ts`.
 */

/** Every string in PRIVACY_COPY, walked recursively so a new nested field is checked
 * automatically rather than needing its own line added here. */
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe("PRIVACY_ROUTE", () => {
  it("is exactly /privacy", () => {
    expect(PRIVACY_ROUTE).toBe("/privacy");
  });
});

describe("the shared menu / link label", () => {
  it("is Privacy in both places", () => {
    expect(PRIVACY_COPY.menuLabel).toBe("Privacy");
    expect(PRIVACY_COPY.contactLineLinkLabel).toBe("Privacy");
  });
});

describe("string hygiene", () => {
  const strings = collectStrings(PRIVACY_COPY);

  it("has no empty string", () => {
    for (const value of strings) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("never starts or ends with whitespace", () => {
    for (const value of strings) {
      expect(value).toBe(value.trim());
    }
  });

  it("never holds a double space", () => {
    for (const value of strings) {
      expect(value).not.toMatch(/  /);
    }
  });
});

describe("the Contact form's approved note", () => {
  it("is untouched, byte for byte", () => {
    expect(CONTACT_COPY.privacy).toBe(
      "What you send here — your message, the email to reply to and your name, if you add one — comes to us as an email. We use your email address only to reply to you. It's never added to a mailing list, and nothing you send here is saved in the app.",
    );
  });
});
