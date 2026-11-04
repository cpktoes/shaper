"use client";

/**
 * Import my designs on the Your data page (quick 261103-k8o, plan 02, R1b, R3): the steps behind the
 * section `import-designs-view.tsx` draws.
 *
 * 1. Choose a file… opens the file picker. The file is read here in the browser, by the same rule the
 *    server reads it again by (`readDesignsFileText`), and nothing is sent yet.
 * 2. The shaper's own board ids are asked for (`listMyBoardIds`, read only), and the preview says what
 *    will happen, worked out by `planImport` — the very decision the server makes when it writes. The
 *    copies box starts off for every file.
 * 3. Import sends the boards a few at a time (`importBatches`, PC16), each call adding only what isn't
 *    on the account; Cancel sends nothing. The page ends with one plain line of what happened.
 */

import { useRef, useState } from "react";
import { importMyDesigns, listMyBoardIds } from "@/app/actions/account";
import {
  NO_IMPORT_TOTALS,
  addImportTotals,
  importBatches,
  planImport,
  readDesignsFileText,
  type ImportBoard,
  type ImportTotals,
} from "@/lib/account/import-designs";
import { BOARD_FILE_MAX_BYTES } from "@/lib/models/board-file";
import {
  ImportDesignsView,
  type ImportPreview,
  type ImportStatus,
  type ImportStep,
} from "@/components/account/import-designs-view";
import { YOUR_DATA_COPY } from "@/components/account/your-data-copy";

const COPY = YOUR_DATA_COPY.import;

/** A file read and checked against the account, waiting for Import or Cancel. */
interface LoadedFile {
  fileName: string;
  boards: ImportBoard[];
  unreadable: string[];
  accountIds: ReadonlySet<string>;
}

type Phase = "idle" | "reading" | "preview" | "importing";

const PROBLEM_LINES = {
  "too-big": COPY.tooBig,
  "not-ours": COPY.notOurs,
  "no-boards": COPY.noBoards,
  "too-many-boards": COPY.tooMany,
} as const;

/** Lets "Reading your file…" paint before the reading starts. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

export function ImportDesignsSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [includeCopies, setIncludeCopies] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ImportStatus>(null);

  const stopWith = (text: string, tone: "plain" | "warning") => {
    setPhase("idle");
    setLoaded(null);
    setStatus({ text, tone });
  };

  const handleFile = async (file: File | null) => {
    // Emptied at once, so choosing the same file again still counts as a choice.
    if (inputRef.current) inputRef.current.value = "";
    if (file === null) return;
    setStatus(null);
    if (file.size > BOARD_FILE_MAX_BYTES) {
      stopWith(COPY.tooBig, "warning");
      return;
    }
    setPhase("reading");
    await nextPaint();

    let text: string;
    try {
      text = await file.text();
    } catch {
      stopWith(COPY.readFailed, "warning");
      return;
    }
    const read = readDesignsFileText(text, {});
    if (!read.ok) {
      stopWith(PROBLEM_LINES[read.problem], "warning");
      return;
    }

    let answer: Awaited<ReturnType<typeof listMyBoardIds>>;
    try {
      answer = await listMyBoardIds();
    } catch {
      stopWith(COPY.checkFailed, "warning");
      return;
    }
    if (!answer.signedIn) {
      stopWith(COPY.signedOut, "plain");
      return;
    }

    setLoaded({ fileName: file.name, boards: read.boards, unreadable: read.unreadable, accountIds: new Set(answer.ids) });
    setIncludeCopies(false);
    setPhase("preview");
  };

  const handleImport = async () => {
    if (loaded === null) return;
    setPhase("importing");
    setProgress(0);
    let totals: ImportTotals = { ...NO_IMPORT_TOTALS, failed: [...loaded.unreadable] };
    let sent = 0;
    for (const batch of importBatches(loaded.boards)) {
      let answer: Awaited<ReturnType<typeof importMyDesigns>>;
      try {
        answer = await importMyDesigns(batch, includeCopies);
      } catch {
        answer = { imported: false, reason: "invalid" };
      }
      if (!answer.imported) {
        if (answer.reason === "signed-out") {
          stopWith(COPY.signedOut, "plain");
          return;
        }
        const addedSoFar = totals.added + totals.copies;
        stopWith(addedSoFar > 0 ? COPY.partial(addedSoFar) : COPY.failed, "warning");
        return;
      }
      totals = addImportTotals(totals, answer);
      sent += batch.length;
      setProgress(sent);
    }
    stopWith(COPY.done(totals), totals.failed.length > 0 ? "warning" : "plain");
  };

  const handleCancel = () => {
    setPhase("idle");
    setLoaded(null);
    setStatus(null);
  };

  let step: ImportStep = { kind: phase === "reading" ? "reading" : "idle" };
  if (loaded !== null && (phase === "preview" || phase === "importing")) {
    const plan = planImport(loaded.boards, loaded.accountIds, includeCopies);
    const preview: ImportPreview = {
      fileName: loaded.fileName,
      addNames: plan.add.map((board) => board.name),
      alreadyThere: plan.alreadyThere.length,
      unreadable: loaded.unreadable,
      includeCopies,
    };
    step =
      phase === "importing"
        ? { kind: "importing", preview, done: progress, total: loaded.boards.length }
        : { kind: "preview", preview };
  }

  return (
    <ImportDesignsView
      step={step}
      status={status}
      inputRef={inputRef}
      onChoose={() => inputRef.current?.click()}
      onFileChosen={(file) => void handleFile(file)}
      onToggleCopies={setIncludeCopies}
      onImport={() => void handleImport()}
      onCancel={handleCancel}
    />
  );
}
