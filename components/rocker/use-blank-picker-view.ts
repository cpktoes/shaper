"use client";

/**
 * The PICK A BLANK popup's two remembered switches (quick 261015-ve9, D-02, D-04, D-13 — the
 * founder's decisions of 2026-10-15): Flat or Upright cards, and Show my board. Kept in this browser
 * (localStorage) so they are the same next visit, Flat and On until a shaper changes them. A
 * per-viewer convenience — never on an account, never on a board.
 *
 * A module-level external store, the same shape as the settings providers': the snapshot is the RAW
 * stored string, parsed through the allow-list in `lib/blank-picker-view-preference.ts`; a `storage`
 * event brings another tab's choice in; and a browser that refuses storage keeps the choice in page
 * memory until a reload. The server snapshot is the default — the popup only ever opens in the
 * browser, so nothing it draws is server-rendered.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  BLANK_PICKER_VIEW_STORAGE_KEY,
  blankPickerViewJson,
  DEFAULT_BLANK_PICKER_VIEW,
  parseBlankPickerViewText,
  type BlankPickerView,
} from "@/lib/blank-picker-view-preference";

const listeners = new Set<() => void>();
let blockedStorageRaw: string | null = null;
const SERVER_RAW = blankPickerViewJson(DEFAULT_BLANK_PICKER_VIEW);

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getStoredRaw(): string | null {
  try {
    return localStorage.getItem(BLANK_PICKER_VIEW_STORAGE_KEY);
  } catch {
    return blockedStorageRaw;
  }
}

function getSnapshot(): string {
  return getStoredRaw() ?? SERVER_RAW;
}

function getServerSnapshot(): string {
  return SERVER_RAW;
}

/** Writes the view when it changed; nothing is written for a tap that changes nothing. */
function write(next: BlankPickerView) {
  const current = parseBlankPickerViewText(getSnapshot());
  if (current.drawn === next.drawn && current.showBoard === next.showBoard) return;
  const raw = blankPickerViewJson(next);
  blockedStorageRaw = raw;
  try {
    localStorage.setItem(BLANK_PICKER_VIEW_STORAGE_KEY, raw);
  } catch {
    // Blocked storage: the page-memory copy above keeps the choice until a reload.
  }
  emit();
}

export function useBlankPickerView(): {
  view: BlankPickerView;
  setDrawn: (drawn: BlankPickerView["drawn"]) => void;
  setShowBoard: (showBoard: boolean) => void;
} {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const view = useMemo(() => parseBlankPickerViewText(raw), [raw]);
  const setDrawn = useCallback((drawn: BlankPickerView["drawn"]) => {
    write({ ...parseBlankPickerViewText(getSnapshot()), drawn });
  }, []);
  const setShowBoard = useCallback((showBoard: boolean) => {
    write({ ...parseBlankPickerViewText(getSnapshot()), showBoard });
  }, []);
  return { view, setDrawn, setShowBoard };
}
