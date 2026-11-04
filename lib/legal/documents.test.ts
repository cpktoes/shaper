import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRIVACY_ROUTE } from "@/lib/privacy/copy";
import { LEGAL_DOCUMENTS, SIGN_UP_CONSENT, TERMS_ROUTE, legalOutline, signUpConsentText } from "./documents";

/**
 * The legal pages' addresses and the outline reader (quick 261006-fom, D-01). The expected
 * headings are read from the founder's own files on disk, never typed into the code: only the
 * first and last section of each, and the counts, are pinned here, so a reworded section in the
 * middle never fails a test while a lost or added section does.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function readDocument(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8");
}

describe("the legal pages' addresses", () => {
  it("Terms lives at /terms", () => {
    expect(TERMS_ROUTE).toBe("/terms");
    expect(LEGAL_DOCUMENTS.terms).toEqual({ route: "/terms", file: "content/legal/terms.md" });
  });

  it("Privacy keeps the existing /privacy address", () => {
    expect(LEGAL_DOCUMENTS.privacy).toEqual({ route: PRIVACY_ROUTE, file: "content/legal/privacy.md" });
    expect(LEGAL_DOCUMENTS.privacy.route).toBe("/privacy");
  });
});

describe("legalOutline", () => {
  it("reads the Terms of Service: its title and 15 sections", () => {
    const outline = legalOutline(readDocument(LEGAL_DOCUMENTS.terms.file));
    expect(outline.title).toBe("Terms of Service");
    expect(outline.sections).toHaveLength(15);
    expect(outline.sections[0]).toBe("1. What the Service is");
    expect(outline.sections.at(-1)).toBe("15. Contact");
  });

  it("reads the Privacy Policy: its title and 11 sections", () => {
    const outline = legalOutline(readDocument(LEGAL_DOCUMENTS.privacy.file));
    expect(outline.title).toBe("Privacy Policy");
    expect(outline.sections).toHaveLength(11);
    expect(outline.sections[0]).toBe("1. Who we are");
    expect(outline.sections.at(-1)).toBe("11. Contact");
  });

  it("says in section 6, Your choices, that a downloaded file can come back (quick 261103-k8o, the founder's ruling)", () => {
    const policy = readDocument(LEGAL_DOCUMENTS.privacy.file);
    const sentence = "You can put a downloaded file back onto your account with Import my designs.";
    const section6 = policy.slice(policy.indexOf("## 6."), policy.indexOf("## 7."));
    expect(section6.split(sentence)).toHaveLength(2);
    expect(policy.split(sentence)).toHaveLength(2);
    const exportLine = section6.split("\n").find((line) => line.startsWith("- **Export your designs:**"));
    expect(exportLine?.endsWith(` ${sentence}`)).toBe(true);
  });

  it("ignores a ### sub-heading and trims trailing spaces", () => {
    const outline = legalOutline("# Title  \n\n## One \n### Not a section\n## Two\n");
    expect(outline).toEqual({ title: "Title", sections: ["One", "Two"] });
  });

  it("gives an empty title when the text has none", () => {
    expect(legalOutline("Just words.")).toEqual({ title: "", sections: [] });
  });
});

describe("the sign-up consent line (D-04)", () => {
  it("reads the founder's sentence, with its full stop", () => {
    expect(signUpConsentText()).toBe("By creating an account you agree to our Terms of Service and Privacy Policy.");
  });

  it("names the two documents exactly as their pages are titled in the sentence", () => {
    expect(SIGN_UP_CONSENT.terms).toBe("Terms of Service");
    expect(SIGN_UP_CONSENT.privacy).toBe("Privacy Policy");
  });
});
