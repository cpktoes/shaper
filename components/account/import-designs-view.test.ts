import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BOARD_FILE_ACCEPT } from "@/lib/models/board-file";
import { YOUR_DATA_COPY } from "./your-data-copy";
import { ImportDesignsView, type ImportDesignsViewProps, type ImportPreview } from "./import-designs-view";

/**
 * Import my designs' section on the Your data page (quick 261103-k8o, plan 02, R3, PC22), rendered on
 * the server. Clerk never settles under the browser suite's fake keys, so the page can't be opened in
 * a browser test (`e2e/phone-account.spec.ts`'s header); this render and the source contract below are
 * the proof, and the founder tries the real page signed in on his own review server.
 */

const IMPORT = YOUR_DATA_COPY.import;
const NOOP = () => {};
const THREE = ["Grom Stick 5'2\"", "Daily Driver", "Log 9'4\""];

function render(props: Partial<ImportDesignsViewProps>): string {
  return renderToStaticMarkup(
    createElement(ImportDesignsView, {
      step: { kind: "idle" },
      status: null,
      onChoose: NOOP,
      onFileChosen: NOOP,
      onToggleCopies: NOOP,
      onImport: NOOP,
      onCancel: NOOP,
      ...props,
    }),
  );
}

/** Markup's text with its tags taken out and its entities read. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** Every `<tag …>` opening tag in the markup. */
function tags(markup: string, tag: string): string[] {
  return [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((m) => m[0]);
}

const PREVIEW: ImportPreview = {
  fileName: "shaper-assistant-designs-2026-11-03.json",
  addNames: THREE,
  alreadyThere: 9,
  unreadable: [],
  includeCopies: false,
};

describe("ImportDesignsView — idle", () => {
  const markup = render({});

  it("shows the title, the body and Choose a file…", () => {
    expect(text(markup)).toContain(IMPORT.title);
    expect(text(markup)).toContain(IMPORT.body);
    expect(text(markup)).toContain(IMPORT.button);
  });

  it("holds a hidden file input that takes a board file or a download file", () => {
    const [input] = tags(markup, "input");
    expect(input).toMatch(/type="file"/);
    expect(input).toContain(`accept="${BOARD_FILE_ACCEPT}"`);
    expect(input).toMatch(/\shidden(=""|\s|>)/);
  });

  it("is a section labelled by its own title", () => {
    const [section] = tags(markup, "section");
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(section)![1];
    expect(markup).toContain(`<h2 id="${labelledBy}"`);
  });
});

describe("ImportDesignsView — the preview, before anything is written", () => {
  it("says what will be added by name, what is already there, and offers the copies box unticked", () => {
    const markup = render({ step: { kind: "preview", preview: PREVIEW } });
    const words = text(markup);
    expect(words).toContain(IMPORT.fromFile(PREVIEW.fileName));
    expect(words).toContain(IMPORT.willAdd(3, THREE));
    expect(words).toContain(IMPORT.alreadyThere(9));
    const [box] = tags(markup, "input").filter((tag) => tag.includes('type="checkbox"'));
    expect(box).toBeDefined();
    expect(box).not.toMatch(/checked/);
    expect(words).toContain(IMPORT.copiesBox(9));
    expect(buttonNamed(markup, IMPORT.importButton)).not.toMatch(/disabled/);
    expect(buttonNamed(markup, IMPORT.cancel)).not.toMatch(/disabled/);
    expect(text(markup)).not.toContain(IMPORT.nothingToAdd);
  });

  it("ticks the box when the shaper has", () => {
    const markup = render({ step: { kind: "preview", preview: { ...PREVIEW, includeCopies: true } } });
    const [box] = tags(markup, "input").filter((tag) => tag.includes('type="checkbox"'));
    expect(box).toMatch(/checked/);
  });

  it("with nothing to add and the box off, says so and Import can't be pressed", () => {
    const markup = render({ step: { kind: "preview", preview: { ...PREVIEW, addNames: [], alreadyThere: 12 } } });
    expect(text(markup)).toContain(IMPORT.nothingToAdd);
    expect(buttonNamed(markup, IMPORT.importButton)).toMatch(/disabled/);
  });

  it("with nothing to add but the box ticked, Import can be pressed", () => {
    const markup = render({
      step: { kind: "preview", preview: { ...PREVIEW, addNames: [], alreadyThere: 12, includeCopies: true } },
    });
    expect(buttonNamed(markup, IMPORT.importButton)).not.toMatch(/disabled/);
  });

  it("draws no copies box when nothing in the file is already on the account, and names what couldn't be read", () => {
    const markup = render({
      step: { kind: "preview", preview: { ...PREVIEW, alreadyThere: 0, unreadable: ["board 4"] } },
    });
    expect(tags(markup, "input").filter((tag) => tag.includes('type="checkbox"'))).toEqual([]);
    expect(text(markup)).toContain(IMPORT.unreadable(1, ["board 4"]));
  });
});

describe("ImportDesignsView — importing and the status line", () => {
  it("shows the progress, and neither button can be pressed", () => {
    const markup = render({ step: { kind: "importing", preview: PREVIEW, done: 25, total: 40 } });
    expect(text(markup)).toContain(IMPORT.importing(25, 40));
    expect(buttonNamed(markup, IMPORT.importing(25, 40))).toMatch(/disabled/);
    expect(buttonNamed(markup, IMPORT.cancel)).toMatch(/disabled/);
  });

  it("draws a warning in the Daylight warning ink, and a plain line muted", () => {
    const warning = render({ status: { text: IMPORT.notOurs, tone: "warning" } });
    const [line] = tags(warning, "p").filter((tag) => tag.includes('role="status"'));
    expect(line).toContain("text-(--ramp-daylight-warning-ink)");
    expect(line).toContain('aria-live="polite"');
    expect(text(warning)).toContain(IMPORT.notOurs);
    const plain = render({ status: { text: "Added 3 boards", tone: "plain" } });
    const [plainLine] = tags(plain, "p").filter((tag) => tag.includes('role="status"'));
    expect(plainLine).toContain("text-(--ramp-daylight-ink-muted)");
  });

  it("every button and the tick box's row are finger-sized under a touch pointer", () => {
    for (const markup of [
      render({}),
      render({ step: { kind: "preview", preview: PREVIEW } }),
      render({ step: { kind: "importing", preview: PREVIEW, done: 1, total: 2 } }),
    ]) {
      for (const button of tags(markup, "button")) expect(button).toContain("coarse:min-h-11");
      for (const label of tags(markup, "label")) expect(label).toContain("coarse:min-h-11");
    }
  });
});

/** The opening tag of the button whose text includes `name`. */
function buttonNamed(markup: string, name: string): string {
  const found = [...markup.matchAll(/(<button\b[^>]*>)([\s\S]*?)<\/button>/g)].find((m) => text(m[2]).includes(name));
  expect(found, `no button reading ${name}`).toBeDefined();
  return found![1];
}

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Strips `//` line comments and block comments — the helper `nav-auth-control.test.ts` uses. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

describe("the section's source contract", () => {
  const view = readStripped("components/account/import-designs-view.tsx");
  const section = readStripped("components/account/import-designs-section.tsx");

  it("names no colour but the Daylight ramp's — Clerk's panel is white in every theme", () => {
    for (const source of [view, section]) {
      const colours = [...source.matchAll(/--[a-z][a-z0-9-]*/g)].map((m) => m[0]);
      expect(colours.filter((colour) => !colour.startsWith("--ramp-daylight-"))).toEqual([]);
      expect(source).not.toMatch(/surf-/);
    }
  });

  it("never opens a pop-up: no dialog, no confirm, no alert", () => {
    for (const source of [view, section]) {
      expect(source).not.toMatch(/dialog/i);
      expect(source).not.toMatch(/\b(window\.)?(confirm|alert)\s*\(/);
    }
  });

  it("the view reads no action and nothing of Clerk's, so it can be drawn anywhere", () => {
    expect(view).not.toMatch(/@\/app\/actions/);
    expect(view).not.toMatch(/@clerk/);
  });

  it("the file input lives inside the section's own markup, never on the page body", () => {
    expect(view).toMatch(/<input[\s\S]*?type="file"/);
    expect(section).not.toMatch(/<input/);
    expect(section).not.toMatch(/document\.(body|createElement)/);
    expect(section).toMatch(/listMyBoardIds\(/);
    expect(section).toMatch(/importMyDesigns\(/);
    expect(section).toMatch(/planImport\(/);
  });
});
