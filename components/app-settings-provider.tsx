"use client";

/**
 * The one App Default Settings pop-up (quick 261003-uwi) and the hook that opens it.
 *
 * The pop-up is rendered once, here, rather than inside the menu that opens it: a menu's popup
 * unmounts the moment it closes, and a dialog drawn inside it would vanish with it. Two places open
 * it — the "App Default Settings" row in the gear menu (computer) and the ☰ sheet (phone), which
 * opens it plain, and ROCKER's two "Change Fit Rules" buttons, which open it at the fit part.
 *
 * It sits directly inside ThemeProvider in app/layout.tsx. ThemeProvider and BlankMakersProvider are
 * nested inside FitDefaultsProvider (which used to hold the Fit & Tip Defaults dialog), so a dialog
 * held there could read neither the theme nor the makers. Here, inside all four, the pop-up can read
 * every app-wide setting it shows: units, the fit and tip defaults, the blank makers and the theme.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AppSettingsDialog } from "@/components/app-settings-dialog";

/** Where the pop-up opens: at its top (nothing given), or scrolled to the fit part. */
export type AppSettingsPlace = "fit";

interface AppSettingsContextValue {
  /** Opens App Default Settings — at its top, or at WHICH BLANKS FIT when given "fit". */
  openAppSettings: (at?: AppSettingsPlace) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // What the pop-up was opened for. A plain open passes nothing, so a later plain open never
  // inherits an earlier "fit" and jumps past UNITS and THEME.
  const [at, setAt] = useState<AppSettingsPlace | null>(null);

  const openAppSettings = useCallback((place?: AppSettingsPlace) => {
    setAt(place ?? null);
    setOpen(true);
  }, []);

  const value = useMemo<AppSettingsContextValue>(() => ({ openAppSettings }), [openAppSettings]);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
      <AppSettingsDialog open={open} onOpenChange={setOpen} at={at} />
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return ctx;
}
