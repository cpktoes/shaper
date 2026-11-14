"use client";

/**
 * Open a board file… (quick 261103-k8o, 2026-11-03, R1a): under the preset cards on the home page, in
 * both layouts, signed in or not. A friend's board — or one of the shaper's own, saved from the Board
 * Rack's ⋯ menu — opens as a new, unsaved board, and Save then puts it on the account like any new board.
 *
 * The app's own outlined Button (32 dots drawn, 44 under a finger by the Button's own pointer rule)
 * clicks a hidden file input; one muted line under it says what the button is for, and one quiet line
 * under that says why a file couldn't open — never a pop-up, and nothing changes (PC7, PC11).
 *
 * The file is read here, BEFORE anything is asked (PC10): a file that can't open just says so under the
 * button, and only a board that will open goes on to the setup screen, which asks "Open this board
 * file?" first when a board is already in progress. A Phase 11 blank in the file is carried over with
 * the shaper's own Tip Style, read live from the gear menu (PC9). The input is emptied after every pick
 * so the same file can be picked again. Nothing is sent anywhere: the file stays in this browser until
 * the shaper presses Save.
 *
 * A `.brd` (AkuShaper or Shape3D, quick 261113-d9b, the founder, 2026-11-13) is also accepted, and goes a different way
 * first (R1, R2, R3): it is read for its outline, rocker and thickness only, the closest board the app's own controls
 * can make is worked out, and both are shown together in a preview. Close changes nothing: no board is opened, saved or sent.
 * Quick 261113-et0 (E1) adds Open as a Board to that preview: our closest fit goes to `onOpen` as a new, unsaved board named
 * after the file, exactly as a JSON board file does, so the setup screen asks "Open this board file?" first when a board is
 * in progress, and nothing is saved until Save. The fields are worked out, and checked by the same reader a JSON board
 * passes, when the preview is made, so the board that opens is exactly the fit the preview drew. One that can't be looked
 * at says so in the same quiet line under the button. Import my designs keeps taking JSON only.
 *
 * Quick 261113-kvo (Task 3): reading and fitting a `.brd` takes a second or more on a long board, so the page says "Reading the
 * file…" under the button the moment a file is picked and the work runs in a background worker (`brd-look.worker.ts`), which keeps
 * the page live meanwhile: nothing is shown half-read (the preview opens only with the whole look), a newer pick or leaving the
 * page drops the older answer, and the file is only ever handed to the app's own code in this browser. Where a worker cannot be
 * made the very same work runs on the page itself, after the line has painted.
 */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { BOARD_FILE_COPY } from "@/components/setup/board-file-copy";
import { BrdFitDialog } from "@/components/setup/brd-fit-dialog";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/components/units-provider";
import { BRD_FILE_ACCEPT, BRD_READ_MAX_BYTES, isBrdFileName } from "@/lib/export/brd-read";
import { brdLengthWords, type BrdFitLook } from "@/lib/export/brd-fit-preview";
import { brdLookFromBytes, type BrdLookResult } from "@/lib/export/brd-look";
import { BOARD_FILE_ACCEPT, BOARD_FILE_MAX_BYTES, readOneBoardFile, type OneBoardFileResult } from "@/lib/models/board-file";
import type { DesignSnapshotFields } from "@/lib/models/design-snapshot";

interface OpenBoardFileProps {
  /** A readable board from the picked file: its design, under the file's name. */
  onOpen: (fields: DesignSnapshotFields) => void;
}

/** The quiet line for a file that can't open. */
function problemLine(result: Exclude<OneBoardFileResult, { ok: true }>): string {
  switch (result.problem) {
    case "too-big":
      return BOARD_FILE_COPY.tooBig;
    case "not-ours":
      return BOARD_FILE_COPY.notOurs;
    case "no-boards":
      return BOARD_FILE_COPY.noBoards;
    case "many-boards":
      return BOARD_FILE_COPY.manyBoards(result.count);
    case "unreadable":
      return BOARD_FILE_COPY.unreadable;
  }
}

/** Resolves after the browser has painted what was just set (two frames), or after a quarter second where frames do not run. */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, 250);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        window.clearTimeout(timer);
        resolve();
      }),
    );
  });
}

export function OpenBoardFile({ onOpen }: OpenBoardFileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The .brd being looked at, under the picked file's name, with the board its closest fit opens as (null if the board reader
  // would refuse it, which the fit's clamping means it never does); null while no preview is open. Held here and nowhere else.
  const [looking, setLooking] = useState<{ fileName: string; look: BrdFitLook; fields: DesignSnapshotFields | null } | null>(null);
  // A picked .brd is being read and fitted in the background (quick 261113-kvo): which pick is current, and its worker.
  const [reading, setReading] = useState(false);
  const pickRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const tipStyle = useFitDefaults().defaults.tipStyle;
  const { system } = useUnits();

  /** Drops whatever is being read: a newer pick, a JSON pick, or leaving the page. Its answer, if it still comes, is ignored. */
  const dropReading = () => {
    pickRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
  };
  useEffect(() => dropReading, []);

  /** The answer for pick `id`: the preview with the whole look, or the one quiet line why not. A stale answer is dropped. */
  const finish = (id: number, fileName: string, result: BrdLookResult) => {
    if (id !== pickRef.current) return;
    setReading(false);
    if (result.ok) {
      setLooking({ fileName, look: result.look, fields: result.fields });
      return;
    }
    setProblem(
      result.problem === "too-big"
        ? BOARD_FILE_COPY.brdTooBig
        : result.problem === "out-of-range" && result.length !== undefined
          ? BOARD_FILE_COPY.brdOutOfRange(...brdLengthWords(result.length, system))
          : BOARD_FILE_COPY.brdUnreadable,
    );
  };

  /** The same work on the page itself, once the "Reading the file…" line has painted: where no worker can be made, or one fails. */
  const lookOnPage = async (id: number, fileName: string, bytes: Uint8Array) => {
    await afterPaint();
    if (id !== pickRef.current) return;
    finish(id, fileName, brdLookFromBytes(bytes, fileName));
  };

  /** Starts the background worker for pick `id`; false when one cannot be made (the caller then works on the page). */
  const lookInWorker = (id: number, fileName: string, bytes: Uint8Array): boolean => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./brd-look.worker.ts", import.meta.url), { type: "module" });
    } catch {
      return false;
    }
    workerRef.current = worker;
    const release = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    worker.onmessage = (event: MessageEvent<{ id: number; result: BrdLookResult }>) => {
      if (event.data.id !== id) return;
      release();
      finish(id, fileName, event.data.result);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      release();
      void lookOnPage(id, fileName, bytes);
    };
    try {
      // Copied, not handed over, so the page still holds the bytes if the worker fails and the work falls back to the page.
      worker.postMessage({ id, bytes, fileName });
    } catch {
      release();
      return false;
    }
    return true;
  };

  /** A `.brd`: read it, fit it, and show both. Nothing is opened, saved or sent until Open as a Board (R1, E1). */
  const lookAtBrd = async (file: File) => {
    dropReading();
    const id = pickRef.current;
    if (file.size > BRD_READ_MAX_BYTES) {
      setProblem(BOARD_FILE_COPY.brdTooBig);
      return;
    }
    // Said at once: the file is read and fitted in the background, and the preview opens only with the whole look.
    setReading(true);
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      if (id === pickRef.current) {
        setReading(false);
        setProblem(BOARD_FILE_COPY.readFailed);
      }
      return;
    }
    if (id !== pickRef.current) return;
    if (!lookInWorker(id, file.name, bytes)) await lookOnPage(id, file.name, bytes);
  };

  const handlePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Emptied at once, so picking the very same file again still counts as a pick.
    input.value = "";
    setProblem(null);
    if (!file) return;
    // A board file that was still being read gives way to this pick (a .brd then starts its own read).
    dropReading();
    setReading(false);
    if (isBrdFileName(file.name)) {
      await lookAtBrd(file);
      return;
    }
    if (file.size > BOARD_FILE_MAX_BYTES) {
      setProblem(BOARD_FILE_COPY.tooBig);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setProblem(BOARD_FILE_COPY.readFailed);
      return;
    }
    const result = readOneBoardFile(text, { tipStyle });
    if (result.ok) onOpen(result.fields);
    else setProblem(problemLine(result));
  };

  return (
    <div data-open-board-file className="mt-8 flex flex-col items-start gap-1 max-shell:mt-6">
      <Button ref={buttonRef} type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        {BOARD_FILE_COPY.button}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={`${BOARD_FILE_ACCEPT},${BRD_FILE_ACCEPT}`}
        hidden
        data-board-file-input
        onChange={(event) => void handlePick(event)}
      />
      <p className="text-xs text-surf-ink-muted">{BOARD_FILE_COPY.hint}</p>
      <p data-brd-hint className="text-xs text-surf-ink-muted">
        {BOARD_FILE_COPY.brdHint}
      </p>
      <p
        role="status"
        aria-live="polite"
        {...(reading ? { "data-brd-reading": "" } : {})}
        className="text-xs text-surf-ink-muted"
      >
        {reading ? BOARD_FILE_COPY.reading : null}
      </p>
      <p data-board-file-status role="status" aria-live="polite" className="text-xs text-surf-warning-ink">
        {problem}
      </p>
      <BrdFitDialog
        look={looking?.look ?? null}
        fileName={looking?.fileName ?? ""}
        onOpenBoard={
          looking?.fields
            ? () => {
                const fields = looking.fields;
                // The preview closes, then the board opens the way a JSON file's does (the setup screen may ask first).
                setLooking(null);
                if (fields) onOpen(fields);
              }
            : null
        }
        onOpenChange={(open) => {
          if (!open) setLooking(null);
        }}
        finalFocus={buttonRef}
      />
    </div>
  );
}
