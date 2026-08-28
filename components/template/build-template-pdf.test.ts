import { describe, expect, it } from "vitest";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { computeTemplateLayout, computeTemplateMarks } from "@/lib/geometry/template";
import { buildTemplatePdf } from "./build-template-pdf";

describe("buildTemplatePdf", () => {
  it("produces one PDF page per layout page, with valid PDF bytes", () => {
    const preset = BOARD_PRESETS[0];
    const geometry = buildOutline(preset.outline);
    const layout = computeTemplateLayout(geometry, "letter");
    const marks = computeTemplateMarks(geometry);

    const doc = buildTemplatePdf({
      layout,
      marks,
      geometry,
      paper: "letter",
      boardName: preset.name,
      dims: {
        length: geometry.length,
        widePointWidth: geometry.halfWidePointWidth,
        centerThickness: preset.rails.center.boardThickness,
      },
    });

    expect(doc.getNumberOfPages()).toBe(layout.pages.length);

    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(0);

    const header = new Uint8Array(bytes.slice(0, 4));
    const magic = String.fromCharCode(...header);
    expect(magic).toBe("%PDF");
  });
});
