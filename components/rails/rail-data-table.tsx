/**
 * DATA page: the merged three-column rail data table, ported from the prototype's
 * `railDataGroups` merge (reference/project/Rails.dc.html lines 1314-1336) plus its italic
 * footnote card (line 444).
 */

import { mergeRailDataTable, type RailDataGroup, type RailDataValue, type RailSectionKey } from "@/lib/geometry/rail-bands";
import { formatInchesFraction } from "@/lib/geometry/units";

interface RailDataTableSection {
  key: RailSectionKey;
  title: string;
  dataGroups: RailDataGroup[];
}

interface RailDataTableProps {
  sections: RailDataTableSection[];
  /** Embedding-only display used by the Summary dashboard's Rail Data card (Rails.dc.html lines
   * 448-470): no outer card, no footnote, no min-width floor, and the shared `--summary-font-*`
   * scale in place of the fixed Tailwind text sizes. Defaults to `false`, the DATA page's own
   * unchanged full-card treatment. */
  compact?: boolean;
}

function formatCell(value: RailDataValue): string {
  if (value === "hard-edge") return "Hard Edge";
  if (value === null) return "—";
  return formatInchesFraction(value, 16);
}

export function RailDataTable({ sections, compact = false }: RailDataTableProps) {
  const merged = mergeRailDataTable(sections.map((s) => ({ key: s.key, dataGroups: s.dataGroups })));

  if (compact) {
    return (
      // `overflow-hidden`, not `auto`. The order form is a sheet of paper and none of its panels
      // scroll — but the choice also decides whether a future regression is visible: a scrolling
      // panel silently absorbs content that no longer fits, and this one did exactly that for
      // several rounds of layout work. Clipped overflow is what the sheet's audit checks for.
      // data-print-unfold still releases the height for print.
      <div data-print-unfold className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className="mb-1 flex gap-2 border-b-2 border-surf-line-faint pb-1"
          style={{ fontSize: "var(--summary-font-label, 12px)" }}
        >
          <div className="min-w-0 flex-[1.4]" />
          {sections.map((s) => (
            <div key={s.key} className="min-w-0 flex-1 text-right font-extrabold text-surf-ink">
              {s.title}
            </div>
          ))}
        </div>
        {merged.map((group) => (
          <div key={group.heading} className="mb-1.5">
            <div
              className="mb-0.5 font-display text-surf-ink uppercase tracking-architectural font-extrabold"
              style={{ fontSize: "var(--summary-font-group, 9px)" }}
            >
              {group.heading}
            </div>
            {group.rows.map((row) => (
              <div
                key={row.label}
                className="flex gap-2 border-b border-surf-line-faint py-0.5 leading-tight"
                style={{ fontSize: "var(--summary-font-row, 11px)" }}
              >
                <div className="min-w-0 flex-[1.4] text-surf-ink-muted">{row.label}</div>
                {row.cells.map((cell, i) => (
                  <div key={i} className="min-w-0 flex-1 text-right font-bold whitespace-nowrap text-surf-ink">
                    {formatCell(cell)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-12 overflow-y-auto pt-10">
      <div className="bg-surf-canvas">
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="mb-3 flex gap-2 border-b-2 border-surf-line-faint pb-2">
              <div className="min-w-0 flex-[1.4]" />
              {sections.map((s) => (
                <div key={s.key} className="min-w-0 flex-1 text-right text-sm font-extrabold text-surf-ink">
                  {s.title}
                </div>
              ))}
            </div>
            {merged.map((group) => (
              <div key={group.heading} className="mb-4">
                <div className="mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
                  {group.heading}
                </div>
                {group.rows.map((row) => (
                  <div key={row.label} className="flex gap-2 border-b border-surf-line-faint py-1.5 text-sm">
                    <div className="min-w-0 flex-[1.4] text-surf-ink-muted">{row.label}</div>
                    {row.cells.map((cell, i) => (
                      <div key={i} className="min-w-0 flex-1 text-right font-bold whitespace-nowrap text-surf-ink">
                        {formatCell(cell)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-prose bg-surf-canvas text-xs leading-relaxed text-surf-ink-muted italic">
        This rail band calculator is intended to provide a quantitative aspect to shaping
        consistent surfboard rails. It&apos;s recommended to understand how rail shapes affects
        surfboard performance, and how these marks can result in producing your desired outcome.
      </div>
    </div>
  );
}
