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
 *
 * D-04: Delete my account confirms in place, in this page, never in a pop-up. Clerk's panel is a
 * full-screen modal of its own that keeps keyboard focus inside itself, so an app dialog drawn on
 * the page body would sit behind it or fight it for focus. Clerk's own Delete account, on the same
 * panel's Security page, confirms in place with a typed word too. The browser's built-in yes/no
 * prompt is never used.
 */

import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { deleteMyAccount, exportMyDesigns } from "@/app/actions/account";
import { designsExportFileName, isDeleteConfirmed } from "@/lib/account/account-data";
import { YOUR_DATA_COPY as COPY } from "@/components/account/your-data-copy";

const SECTION_CLASS = "flex flex-col gap-2 border-t border-(--ramp-daylight-line) pt-4";
const TITLE_CLASS = "text-sm font-semibold text-(--ramp-daylight-ink)";
const BODY_CLASS = "text-sm text-(--ramp-daylight-ink-muted)";
const BUTTON_BASE_CLASS =
  "inline-flex min-h-9 items-center justify-center self-start rounded-md px-4 text-sm font-medium " +
  "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--ramp-daylight-accent-ink) " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 coarse:min-h-11";

type ExportStatus = { text: string } | null;
type DeleteStatus = { text: string; tone: "plain" | "warning" } | null;

export function YourDataPage() {
  // The page's own root: the export's temporary download link is placed inside it, never on the
  // page body, because Clerk's panel treats everything outside itself as out of reach while open.
  const rootRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>(null);

  const { signOut, closeUserProfile } = useClerk();
  const fieldRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Once the account is gone, nothing on the page can be pressed again while sign-out runs.
  const [deleted, setDeleted] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>(null);

  // D-04: the field takes focus the moment the confirmation opens, so the shaper can type at once.
  useEffect(() => {
    if (confirming) fieldRef.current?.focus();
  }, [confirming]);

  const openConfirmation = () => {
    setDeleteStatus(null);
    setConfirming(true);
  };

  const keepAccount = () => {
    setTyped("");
    setDeleteStatus(null);
    setConfirming(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteStatus(null);
    let result: Awaited<ReturnType<typeof deleteMyAccount>>;
    try {
      result = await deleteMyAccount(typed);
    } catch {
      setDeleteStatus({ text: COPY.delete.failed, tone: "warning" });
      setDeleting(false);
      return;
    }
    if (result.deleted) {
      setDeleted(true);
      setDeleteStatus({ text: COPY.delete.done, tone: "plain" });
      try {
        await signOut({ redirectUrl: "/" });
        // Clerk's account panel is its own layer; make sure it never stays open over the home page.
        closeUserProfile();
      } catch {
        // The session may already have gone with the account; a plain trip home finishes it. A
        // full page load on purpose (the plan's fallback), so the sign-in state starts fresh.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      }
      return;
    }
    setDeleting(false);
    if (result.reason === "account-not-closed") {
      // The typed word stays, so pressing again finishes the job (D-03).
      setDeleteStatus({ text: COPY.delete.accountNotClosed, tone: "warning" });
    } else if (result.reason === "signed-out") {
      setDeleteStatus({ text: COPY.delete.signedOut, tone: "plain" });
    } else {
      // not-confirmed cannot come from this page, which only arms the button on the right word.
      setDeleteStatus({ text: COPY.delete.failed, tone: "warning" });
    }
  };

  const busy = deleting || deleted;

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

      <section className={SECTION_CLASS} aria-labelledby="your-data-delete-title">
        {confirming ? (
          <>
            <h2 id="your-data-delete-title" className={TITLE_CLASS}>
              {COPY.delete.confirmHeading}
            </h2>
            <ul className={`${BODY_CLASS} flex list-disc flex-col gap-1 pl-5`}>
              {COPY.delete.consequences.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <label htmlFor="your-data-delete-word" className={`${TITLE_CLASS} mt-1`}>
              {COPY.delete.fieldLabel}
            </label>
            {/* 16px text, so an iPhone does not zoom the page when the field takes focus. */}
            <input
              id="your-data-delete-word"
              ref={fieldRef}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={busy}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-9 w-full max-w-xs rounded-md border border-(--ramp-daylight-line) bg-white px-3 text-base text-(--ramp-daylight-ink) outline-none focus-visible:ring-2 focus-visible:ring-(--ramp-daylight-accent-ink) disabled:opacity-60 coarse:min-h-11"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy || !isDeleteConfirmed(typed)}
                className={`${BUTTON_BASE_CLASS} bg-(--ramp-daylight-warning-ink) text-white hover:brightness-110`}
              >
                {busy ? COPY.delete.busy : COPY.delete.confirmButton}
              </button>
              <button
                type="button"
                onClick={keepAccount}
                disabled={busy}
                className={`${BUTTON_BASE_CLASS} border border-(--ramp-daylight-ink) text-(--ramp-daylight-ink) hover:bg-(--ramp-daylight-well)`}
              >
                {COPY.delete.cancel}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="your-data-delete-title" className={TITLE_CLASS}>
              {COPY.delete.title}
            </h2>
            <p className={BODY_CLASS}>{COPY.delete.body}</p>
            <button
              type="button"
              onClick={openConfirmation}
              className={`${BUTTON_BASE_CLASS} border border-(--ramp-daylight-warning-ink) text-(--ramp-daylight-warning-ink) hover:bg-(--ramp-daylight-well)`}
            >
              {COPY.delete.button}
            </button>
          </>
        )}
        <p
          className={`text-sm ${
            deleteStatus?.tone === "warning" ? "text-(--ramp-daylight-warning-ink)" : "text-(--ramp-daylight-ink-muted)"
          }`}
          role="status"
          aria-live="polite"
        >
          {deleteStatus?.text ?? ""}
        </p>
      </section>
    </div>
  );
}
