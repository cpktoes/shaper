import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRIVACY_ROUTE } from "@/lib/privacy/copy";
import { LEGAL_DOCUMENTS, TERMS_ROUTE, legalOutline } from "./documents";

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

  it("ignores a ### sub-heading and trims trailing spaces", () => {
    const outline = legalOutline("# Title  \n\n## One \n### Not a section\n## Two\n");
    expect(outline).toEqual({ title: "Title", sections: ["One", "Two"] });
  });

  it("gives an empty title when the text has none", () => {
    expect(legalOutline("Just words.")).toEqual({ title: "", sections: [] });
  });
});
