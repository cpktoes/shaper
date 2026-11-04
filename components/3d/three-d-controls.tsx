"use client";

import type { ReactNode } from "react";
import { THREE_D_COPY } from "./three-d-copy";

/**
 * The 3D screen's side panel (Phase 16, UI-SPEC §1): the title block, then the panel's sections each `gap-5`
 * apart — the same outer column every design screen's sidebar uses (`fin-controls.tsx`, `rocker-editor.tsx`).
 * The shell adds Back and Next and the site footer after it.
 *
 * Today it holds the title alone. Later plans add their blocks as `children`, in the contract's order, without
 * reshaping this column: the tail's two Hard Edge sliders bound to RAILS' own values (D-30, 16-07), then SHOW,
 * VIEW and EXPORT — each a `flex flex-col gap-2` block opening with its ruled heading.
 */
export function ThreeDControls({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5" data-three-d-controls>
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">
          {THREE_D_COPY.title}
        </div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">{THREE_D_COPY.subtitle}</div>
      </div>
      {children}
    </div>
  );
}
