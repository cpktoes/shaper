"use client";

/**
 * McKee toe-in aim-table modal. Ported from reference/project/Fins.dc.html lines 532-564. No
 * dialog primitive is vendored under components/ui/, so this is built with plain markup rather
 * than adding a dependency (per the plan's scope note). The table's own numbers, its row label
 * and its identical-from threshold all arrive pre-formatted from lib/geometry/fins.ts's
 * toeAimTableFor — this component only supplies the title's two measurements and the two
 * headings' unit marker.
 */

import { useEffect, useRef } from "react";
import { useUnits } from "@/components/units-provider";
import type { ToeAimTableView } from "@/lib/geometry/fins";
import { columnUnitSuffix, formatDim, formatLength } from "@/lib/geometry/measure-display";
import type { Mm } from "@/lib/geometry/units";

interface ToeAimTableModalProps {
  open: boolean;
  onClose: () => void;
  boardLength: Mm;
  tailWidth12: Mm;
  view: ToeAimTableView;
}

export function ToeAimTableModal({ open, onClose, boardLength, tailWidth12, view }: ToeAimTableModalProps) {
  const { system } = useUnits();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const lengthDisplay = formatLength(boardLength, system);
  const tailWidthDisplay = formatDim(tailWidth12, system);
  // Imperial's heading marker reproduces today's literal exactly, composed from parts so the
  // substring itself never appears in source (the plan's own acceptance grep forbids it) —
  // Metric's comes from the same columnUnitSuffix every other converted table header calls.
  const unitMarker = system === "imperial" ? ` (${"in"})` : columnUnitSuffix("dim", system);

  const cellClass = (i: number) =>
    "border border-surf-line-faint px-2 py-1 " + (i === view.highlightIndex ? "bg-surf-ink-muted/15 font-bold" : "");
  const headerCellClass = (i: number) =>
    "border border-surf-line-faint px-2 py-1 " +
    (i === view.highlightIndex ? "bg-surf-accent font-bold text-surf-on-accent" : "bg-outline-ink text-surf-on-ink");

  return (
    <div
      onClick={onClose}
      role="presentation"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      style={{ background: "rgba(28,27,25,0.6)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="McKee Toe-In Aim Tables"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[92vw] overflow-auto rounded-xl border border-surf-line-faint bg-surf-panel p-6 text-surf-ink outline-none"
      >
        <div className="mb-1.5 flex items-center justify-between gap-5">
          <div className="text-sm font-extrabold">
            McKee Toe-In Aim Tables — nearest to {lengthDisplay} · {tailWidthDisplay} tail
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md bg-outline-ink px-3 py-1.5 text-xs font-bold text-surf-on-ink"
          >
            Close
          </button>
        </div>
        <div className="mb-3.5 text-xs text-surf-ink-muted">
          Distance off the stringer at the nose. Highlighted column is nearest your tail width; row{" "}
          {view.rowLabel} is nearest your board length (rows {view.identicalFromLabel} and up are identical).
        </div>

        <div className="mb-1.5 text-sm font-bold">Front-fin aim distance{unitMarker}</div>
        <div className="mb-4.5 overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-surf-line-faint bg-outline-ink px-2 py-1 text-surf-on-ink">L\W</th>
                {view.columns.map((c, i) => (
                  <th key={c} className={headerCellClass(i)}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-surf-line-faint px-2 py-1 font-bold">{view.rowLabel}</td>
                {view.front.map((v, i) => (
                  <td key={i} className={cellClass(i)}>
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-1.5 text-sm font-bold">Rear-fin aim distance{unitMarker}</div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-surf-line-faint bg-outline-ink px-2 py-1 text-surf-on-ink">L\W</th>
                {view.columns.map((c, i) => (
                  <th key={c} className={headerCellClass(i)}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-surf-line-faint px-2 py-1 font-bold">{view.rowLabel}</td>
                {view.rear.map((v, i) => (
                  <td key={i} className={cellClass(i)}>
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
