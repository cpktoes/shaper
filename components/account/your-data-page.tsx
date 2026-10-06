"use client";

/**
 * The Your data page inside Clerk's account panel (quick 261006-g4u, 2026-10-06, D-01): the place
 * the Privacy Policy points a shaper to export their designs. Clerk draws this page's body inside
 * its own panel, reached from the avatar menu's Your data row or from Manage account.
 *
 * D-05: Clerk's panel is white in every app theme (the app hands it no theme), while the app's
 * `--surf-*` colours flip dark in Slate and Phosphor and would draw light text on that white. So
 * this page takes its colours only from the Daylight ramp, which `app/globals.css` defines on
 * `:root` whatever theme is picked. Buttons are plain elements for the same reason — the shared
 * Button takes its colours from the theme. Every button grows to a 44-dot row under a touch pointer
 * (`coarse:min-h-11`), the pointer rule from CLAUDE.md's Layout section.
 */

import { useRef, useState } from "react";
import { exportMyDesigns } from "@/app/actions/account";
import { designsExportFileName } from "@/lib/account/account-data";
import { YOUR_DATA_COPY as COPY } from "@/components/account/your-data-copy";

const SECTION_CLASS = "flex flex-col gap-2 border-t border-(--ramp-daylight-line) pt-4";
const TITLE_CLASS = "text-sm font-semibold text-(--ramp-daylight-ink)";
const BODY_CLASS = "text-sm text-(--ramp-daylight-ink-muted)";
const BUTTON_BASE_CLASS =
  "inline-flex min-h-9 items-center justify-center self-start rounded-md px-4 text-sm font-medium " +
  "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--ramp-daylight-accent-ink) " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 coarse:min-h-11";

type ExportStatus = { text: string } | null;

export function YourDataPage() {
  // The page's own root: the export's temporary download link is placed inside it, never on the
  // page body, because Clerk's panel treats everything outside itself as out of reach while open.
  const rootRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportStatus(null);
    try {
      const result = await exportMyDesigns();
      if (!result.exported) {
        setExportStatus({ text: COPY.export.signedOut });
        return;
      }
      const fileName = designsExportFileName(new Date());
      const blob = new Blob([JSON.stringify(result.file, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.hidden = true;
      (rootRef.current ?? document.body).appendChild(link);
      link.click();
      link.remove();
      // Safari needs the address alive while the download starts, so it is let go a minute later.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      const boardCount = result.file.boards.length;
      setExportStatus({
        text: boardCount === 0 ? COPY.export.doneNone(fileName) : COPY.export.done(fileName, boardCount),
      });
    } catch {
      setExportStatus({ text: COPY.export.failed });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-4 text-(--ramp-daylight-ink)">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold text-(--ramp-daylight-ink)">{COPY.heading}</h1>
        <p className={BODY_CLASS}>{COPY.intro}</p>
      </div>

      <section className={SECTION_CLASS} aria-labelledby="your-data-export-title">
        <h2 id="your-data-export-title" className={TITLE_CLASS}>
          {COPY.export.title}
        </h2>
        <p className={BODY_CLASS}>{COPY.export.body}</p>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className={`${BUTTON_BASE_CLASS} bg-(--ramp-daylight-accent) text-(--ramp-daylight-on-accent) hover:brightness-95`}
        >
          {exporting ? COPY.export.busy : COPY.export.button}
        </button>
        <p className={BODY_CLASS} role="status" aria-live="polite">
          {exportStatus?.text ?? ""}
        </p>
      </section>
    </div>
  );
}
