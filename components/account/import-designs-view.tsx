"use client";

/**
 * Import my designs' section on the Your data page, drawn (quick 261103-k8o, plan 02, R1b, R3, PC22).
 * The steps live in `import-designs-section.tsx`; this file is the markup alone, with no action and
 * nothing of Clerk's, so a unit test and a stand-in page can draw it in every step.
 *
 * Everything happens in place on the page, never in a pop-up: Clerk's account panel keeps focus inside
 * itself. The file input is hidden inside this section, inside the page's root, for the same reason.
 * Daylight colours only and plain elements, like the page's other two sections (D-05).
 */

import type { Ref } from "react";
import { BOARD_FILE_ACCEPT } from "@/lib/models/board-file";
import { YOUR_DATA_CLASSES as CLASSES } from "@/components/account/your-data-classes";
import { YOUR_DATA_COPY } from "@/components/account/your-data-copy";

const COPY = YOUR_DATA_COPY.import;

/** What the preview says: the file's name, the names to add, how many are already there, the boards
 * that couldn't be read, and whether the copies box is ticked. */
export interface ImportPreview {
  fileName: string;
  addNames: string[];
  alreadyThere: number;
  unreadable: string[];
  includeCopies: boolean;
}

export type ImportStep =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "preview"; preview: ImportPreview }
  | { kind: "importing"; preview: ImportPreview; done: number; total: number };

export type ImportStatus = { text: string; tone: "plain" | "warning" } | null;

export interface ImportDesignsViewProps {
  step: ImportStep;
  status: ImportStatus;
  inputRef?: Ref<HTMLInputElement>;
  onChoose: () => void;
  onFileChosen: (file: File | null) => void;
  onToggleCopies: (checked: boolean) => void;
  onImport: () => void;
  onCancel: () => void;
}

/** True when Import would write nothing: no new board, and no copies asked for. */
export function importWritesNothing(preview: ImportPreview): boolean {
  return preview.addNames.length === 0 && !(preview.includeCopies && preview.alreadyThere > 0);
}

export function ImportDesignsView({
  step,
  status,
  inputRef,
  onChoose,
  onFileChosen,
  onToggleCopies,
  onImport,
  onCancel,
}: ImportDesignsViewProps) {
  const preview = step.kind === "preview" || step.kind === "importing" ? step.preview : null;
  const importing = step.kind === "importing";
  const writesNothing = preview !== null && importWritesNothing(preview);
  // Every board is already there and the box is off: one line says so and points at the box.
  const nothingToAdd = writesNothing && preview !== null && preview.alreadyThere > 0;

  return (
    <section className={CLASSES.section} aria-labelledby="your-data-import-title">
      <h2 id="your-data-import-title" className={CLASSES.title}>
        {COPY.title}
      </h2>
      <p className={CLASSES.body}>{COPY.body}</p>
      <input
        ref={inputRef}
        type="file"
        accept={BOARD_FILE_ACCEPT}
        hidden
        tabIndex={-1}
        onChange={(event) => onFileChosen(event.target.files?.[0] ?? null)}
      />

      {preview === null ? (
        <button
          type="button"
          onClick={onChoose}
          disabled={step.kind === "reading"}
          className={`${CLASSES.buttonBase} ${CLASSES.outlinedButton}`}
        >
          {step.kind === "reading" ? COPY.busy : COPY.button}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 text-sm text-(--ramp-daylight-ink)">
            {/* A long file name wraps where it can (a hyphen), and mid-word only when it has to. */}
            <p className="font-medium break-words">{COPY.fromFile(preview.fileName)}</p>
            {/* With nothing to add, the line under the box says so in full instead. */}
            {nothingToAdd ? null : <p>{COPY.willAdd(preview.addNames.length, preview.addNames)}</p>}
            {preview.alreadyThere > 0 ? <p>{COPY.alreadyThere(preview.alreadyThere)}</p> : null}
            {preview.unreadable.length > 0 ? (
              <p className="text-(--ramp-daylight-warning-ink)">
                {COPY.unreadable(preview.unreadable.length, preview.unreadable)}
              </p>
            ) : null}
          </div>
          {preview.alreadyThere > 0 ? (
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-(--ramp-daylight-ink) coarse:min-h-11">
              <input
                type="checkbox"
                checked={preview.includeCopies}
                disabled={importing}
                onChange={(event) => onToggleCopies(event.target.checked)}
                className="size-4 shrink-0 accent-(--ramp-daylight-accent)"
              />
              <span>{COPY.copiesBox(preview.alreadyThere)}</span>
            </label>
          ) : null}
          {nothingToAdd ? <p className={CLASSES.body}>{COPY.nothingToAdd}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onImport}
              disabled={importing || writesNothing}
              className={`${CLASSES.buttonBase} ${CLASSES.accentButton}`}
            >
              {step.kind === "importing" ? COPY.importing(step.done, step.total) : COPY.importButton}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={importing}
              className={`${CLASSES.buttonBase} ${CLASSES.outlinedButton}`}
            >
              {COPY.cancel}
            </button>
          </div>
        </div>
      )}

      <p
        className={`text-sm ${
          status?.tone === "warning" ? "text-(--ramp-daylight-warning-ink)" : "text-(--ramp-daylight-ink-muted)"
        }`}
        role="status"
        aria-live="polite"
      >
        {status?.text ?? ""}
      </p>
    </section>
  );
}
