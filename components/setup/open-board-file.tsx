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
 */

import { useRef, useState, type ChangeEvent } from "react";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { BOARD_FILE_COPY } from "@/components/setup/board-file-copy";
import { BrdFitDialog } from "@/components/setup/brd-fit-dialog";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/components/units-provider";
import { BRD_FILE_ACCEPT, BRD_READ_MAX_BYTES, isBrdFileName, readAnyBrd } from "@/lib/export/brd-read";
import { brdFitLook, brdLengthWords, type BrdFitLook } from "@/lib/export/brd-fit-preview";
import { brdBoardFields } from "@/lib/models/brd-board";
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

export function OpenBoardFile({ onOpen }: OpenBoardFileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The .brd being looked at, under the picked file's name, with the board its closest fit opens as (null if the board reader
  // would refuse it, which the fit's clamping means it never does); null while no preview is open. Held here and nowhere else.
  const [looking, setLooking] = useState<{ fileName: string; look: BrdFitLook; fields: DesignSnapshotFields | null } | null>(null);
  const tipStyle = useFitDefaults().defaults.tipStyle;
  const { system } = useUnits();

  /** A `.brd`: read it, fit it, and show both. Nothing is opened, saved or sent until Open as a Board (R1, E1). */
  const lookAtBrd = async (file: File) => {
    if (file.size > BRD_READ_MAX_BYTES) {
      setProblem(BOARD_FILE_COPY.brdTooBig);
      return;
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      setProblem(BOARD_FILE_COPY.readFailed);
      return;
    }
    const read = readAnyBrd(bytes);
    if (!read.ok) {
      setProblem(
        read.problem === "out-of-range"
          ? BOARD_FILE_COPY.brdOutOfRange(...brdLengthWords(read.length, system))
          : BOARD_FILE_COPY.brdUnreadable,
      );
      return;
    }
    try {
      const look = brdFitLook(read.board);
      setLooking({ fileName: file.name, look, fields: brdBoardFields(look.fit, file.name, look.bottom?.bottom ?? null) });
    } catch {
      setProblem(BOARD_FILE_COPY.brdUnreadable);
    }
  };

  const handlePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Emptied at once, so picking the very same file again still counts as a pick.
    input.value = "";
    setProblem(null);
    if (!file) return;
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
