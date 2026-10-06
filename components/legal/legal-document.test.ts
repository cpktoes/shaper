import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS, legalOutline } from "@/lib/legal/documents";
import { LegalDocument } from "./legal-document";

/**
 * The founder's legal documents, drawn as the page draws them (quick 261006-fom, D-01, P-1, P-2,
 * T-261006-01). A server render of the real component from the real files on disk, counted with
 * simple patterns: every heading, list item, bold phrase and the privacy table comes out as the
 * matching element, in the app's own classes, and nothing unsafe a file might hold is ever drawn.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const COMPONENT_PATH = join(REPO_ROOT, "components", "legal", "legal-document.tsx");

function readDocument(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8");
}

function render(markdown: string): string {
  return renderToStaticMarkup(createElement(LegalDocument, { markdown }));
}

function count(markup: string, pattern: RegExp): number {
  return (markup.match(pattern) ?? []).length;
}

/** The text inside every `<tag ...>…</tag>` in the markup, tags inside it stripped. */
function texts(markup: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  return [...markup.matchAll(pattern)].map((match) => decode(match[1].replace(/<[^>]+>/g, "")));
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const privacyMarkdown = readDocument(LEGAL_DOCUMENTS.privacy.file);
const termsMarkdown = readDocument(LEGAL_DOCUMENTS.terms.file);
const privacy = render(privacyMarkdown);
const terms = render(termsMarkdown);

describe("the Privacy Policy, drawn", () => {
  const outline = legalOutline(privacyMarkdown);

  it("has exactly one h1, in the app's heading classes", () => {
    expect(count(privacy, /<h1\b/g)).toBe(1);
    expect(privacy).toMatch(/<h1 class="[^"]*font-display[^"]*tracking-architectural[^"]*font-extrabold/);
    expect(texts(privacy, "h1")).toEqual([outline.title]);
  });

  it("has its 11 section headings as h2s, in order", () => {
    expect(texts(privacy, "h2")).toEqual(outline.sections);
    expect(outline.sections).toHaveLength(11);
  });

  it("draws the services table inside a box that scrolls sideways on its own", () => {
    expect(count(privacy, /<table\b/g)).toBe(1);
    expect(privacy).toMatch(/<div class="mt-4 overflow-x-auto"><table\b/);
    expect(texts(privacy, "th")).toEqual(["Service", "What it does", "What it sees"]);
    expect(count(privacy, /<th scope="col"/g)).toBe(3);
    const body = privacy.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
    expect(count(body, /<tr\b/g)).toBe(5);
  });

  it("draws every bold phrase as strong", () => {
    const boldInFile = [...privacyMarkdown.matchAll(/\*\*(.+?)\*\*/g)].map((match) => match[1]);
    expect(boldInFile.length).toBeGreaterThan(0);
    expect(texts(privacy, "strong")).toEqual(boldInFile);
  });

  it("keeps the line break before Effective date in the paragraph under the title", () => {
    const paragraphs = privacy.match(/<p class="([^"]*)">([\s\S]*?)<\/p>/);
    expect(paragraphs).not.toBeNull();
    const [, classes, inner] = paragraphs!;
    expect(classes).toContain("whitespace-pre-line");
    expect(inner).toMatch(/\)\nEffective date/);
  });

  it("turns every plain email address into a mailto link", () => {
    const addresses = [...new Set(privacyMarkdown.match(/[\w.+-]+@[\w-]+\.[\w.-]*\w/g) ?? [])];
    expect(addresses.length).toBeGreaterThan(0);
    for (const address of addresses) {
      expect(privacy).toContain(`href="mailto:${address}"`);
    }
  });
});

describe("the Terms of Service, drawn", () => {
  const outline = legalOutline(termsMarkdown);

  it("has one h1 and its 15 section headings as h2s, in order", () => {
    expect(count(terms, /<h1\b/g)).toBe(1);
    expect(texts(terms, "h2")).toEqual(outline.sections);
    expect(outline.sections).toHaveLength(15);
  });

  it("draws its bullet lists: 13 items across them, in bulleted lists", () => {
    expect(count(terms, /<li\b/g)).toBe(13);
    expect(count(terms, /<ul class="[^"]*list-disc/g)).toBe(count(terms, /<ul\b/g));
  });
});

describe("safety (T-261006-01)", () => {
  const hostile = render(
    [
      "# Title",
      "",
      "<script>alert(1)</script>",
      "",
      '<iframe src="https://example.com"></iframe>',
      "",
      "A <b>raw</b> tag and [a bad link](javascript:alert(1)) and [a good one](https://example.com).",
    ].join("\n"),
  );

  it("never draws a script element", () => {
    expect(hostile).not.toMatch(/<script\b/i);
  });

  it("never draws raw HTML typed into the file", () => {
    expect(hostile).not.toMatch(/<iframe\b/i);
    expect(hostile).not.toMatch(/<b>/i);
  });

  it("never draws a javascript: address", () => {
    expect(hostile).not.toMatch(/javascript:/i);
  });

  it("opens a web address in a new tab, without handing the new tab this page", () => {
    expect(hostile).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
  });

  it("keeps a mailto link in this tab", () => {
    const mail = render("Write to a@b.com today.");
    expect(mail).toMatch(/<a href="mailto:a@b\.com" class="[^"]*">a@b\.com<\/a>/);
  });
});

describe("the app's own colours", () => {
  it("no element in either document carries an inline style", () => {
    expect(privacy).not.toMatch(/\sstyle=/);
    expect(terms).not.toMatch(/\sstyle=/);
  });

  it("the component holds no hex colour", () => {
    expect(readFileSync(COMPONENT_PATH, "utf8")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
