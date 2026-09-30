import { describe, expect, it } from "vitest";
import { CONTACT_ADDRESS, CONTACT_COPY } from "@/lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE, privacyPageText } from "./copy";

/** Every string a shaper can read anywhere in PRIVACY_COPY, walked recursively so a new nested
 * field is checked automatically rather than needing its own line added here. */
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe("PRIVACY_ROUTE and top-level copy", () => {
  it("is exactly /privacy", () => {
    expect(PRIVACY_ROUTE).toBe("/privacy");
  });

  it("lastUpdated contains 30 September 2026", () => {
    expect(PRIVACY_COPY.lastUpdated).toContain("30 September 2026");
  });
});

describe("section headings, in order", () => {
  it("are the five expected headings", () => {
    expect([
      PRIVACY_COPY.keep.heading,
      PRIVACY_COPY.browser.heading,
      PRIVACY_COPY.handlers.heading,
      PRIVACY_COPY.deleting.heading,
      PRIVACY_COPY.questions.heading,
    ]).toEqual([
      "What we keep, and why",
      "Cookies and your browser",
      "Who handles it for us",
      "Deleting your data",
      "Questions",
    ]);
  });
});

describe("the keep section", () => {
  it("has exactly five items with the expected leads, in order", () => {
    expect(PRIVACY_COPY.keep.items.map((item) => item.lead)).toEqual([
      "Your account.",
      "Your boards.",
      "Your settings.",
      "Page visits.",
      "Messages you send us.",
    ]);
  });
});

describe("the handlers section", () => {
  it("lists exactly Clerk, Neon, Vercel, Resend and Zoho Mail, in that order", () => {
    expect(PRIVACY_COPY.handlers.services.map((service) => service.name)).toEqual([
      "Clerk",
      "Neon",
      "Vercel",
      "Resend",
      "Zoho Mail",
    ]);
  });
});

describe("privacyPageText()", () => {
  const text = privacyPageText();

  it("contains every string in PRIVACY_COPY that a shaper reads, in reading order", () => {
    // Reading order, spot-checked: heading comes before the keep section, which comes before
    // browser, which comes before handlers, which comes before deleting, which comes before
    // questions.
    const headingIndex = text.indexOf(PRIVACY_COPY.heading);
    const keepIndex = text.indexOf(PRIVACY_COPY.keep.heading);
    const browserIndex = text.indexOf(PRIVACY_COPY.browser.heading);
    const handlersIndex = text.indexOf(PRIVACY_COPY.handlers.heading);
    const deletingIndex = text.indexOf(PRIVACY_COPY.deleting.heading);
    const questionsIndex = text.indexOf(PRIVACY_COPY.questions.heading);

    expect(headingIndex).toBeGreaterThanOrEqual(0);
    expect(keepIndex).toBeGreaterThan(headingIndex);
    expect(browserIndex).toBeGreaterThan(keepIndex);
    expect(handlersIndex).toBeGreaterThan(browserIndex);
    expect(deletingIndex).toBeGreaterThan(handlersIndex);
    expect(questionsIndex).toBeGreaterThan(deletingIndex);

    for (const item of PRIVACY_COPY.keep.items) {
      expect(text).toContain(item.lead);
      expect(text).toContain(item.text);
    }
    for (const paragraph of PRIVACY_COPY.browser.paragraphs) {
      expect(text).toContain(paragraph);
    }
    for (const service of PRIVACY_COPY.handlers.services) {
      expect(text).toContain(service.name);
      expect(text).toContain(service.role);
    }
    expect(text).toContain(PRIVACY_COPY.deleting.boards);
    expect(text).toContain(PRIVACY_COPY.deleting.accountSelf);
  });

  it("contains CONTACT_ADDRESS exactly twice (deleting and questions)", () => {
    const matches = text.split(CONTACT_ADDRESS).length - 1;
    expect(matches).toBe(2);
  });

  it("contains the key privacy phrases", () => {
    expect(text).toContain("no cookies");
    expect(text).toContain("There are no advertising or tracking cookies.");
    expect(text).toContain("We don't sell your information");
  });

  // "Delete account" is deliberately NOT on this list: the orchestrator's P-8 revision (after item
  // 11a shipped self-service account deletion) has the page name that exact Clerk button label as
  // a navigation instruction — Manage account, then Security, then Delete account — so a shaper
  // can follow it. The plan's original forbidden list predates that revision, when deletion was
  // email-only and "Delete account" would have named a feature the app didn't yet have.
  const forbidden = [
    "localStorage",
    "sessionStorage",
    "shaper-",
    "Drizzle",
    "Postgres",
    "Server Action",
    "clerk_user_id",
    "data controller",
    "GDPR",
  ];
  it.each(forbidden)("never mentions %s", (term) => {
    expect(text).not.toContain(term);
  });

  const caseInsensitiveForbidden = ["herein", "hereby", "pursuant", "thereof"];
  it.each(caseInsensitiveForbidden)("never mentions %s (case-insensitive)", (term) => {
    expect(text.toLowerCase()).not.toContain(term.toLowerCase());
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

describe("the shared menu / link label", () => {
  it("is Privacy in both places", () => {
    expect(PRIVACY_COPY.menuLabel).toBe("Privacy");
    expect(PRIVACY_COPY.contactLineLinkLabel).toBe("Privacy");
  });
});
