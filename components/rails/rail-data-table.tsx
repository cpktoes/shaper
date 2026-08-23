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
      // data-print-unfold lets the Summary print stylesheet release this container's clipped
      // height so the full table prints instead of cutting off at the card's on-screen height.
      <div data-print-unfold className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">
        <div
          className="mb-1 flex gap-2 border-b-2 border-surf-muted/20 pb-1"
          style={{ fontSize: "var(--summary-font-label, 12px)" }}
        >
          <div className="min-w-0 flex-[1.4]" />
          {sections.map((s) => (
            <div key={s.key} className="min-w-0 flex-1 text-right font-extrabold text-surf-black">
              {s.title}
            </div>
          ))}
        </div>
        {merged.map((group) => (
          <div key={group.heading} className="mb-1.5">
            <div
              className="mb-0.5 font-display text-surf-black uppercase tracking-architectural font-extrabold"
              style={{ fontSize: "var(--summary-font-group, 9px)" }}
            >
              {group.heading}
            </div>
            {group.rows.map((row) => (
              <div
                key={row.label}
                className="flex gap-2 border-b border-surf-muted/10 py-0.5"
                style={{ fontSize: "var(--summary-font-row, 11px)" }}
              >
                <div className="min-w-0 flex-[1.4] text-surf-muted">{row.label}</div>
                {row.cells.map((cell, i) => (
                  <div key={i} className="min-w-0 flex-1 text-right font-bold whitespace-nowrap text-surf-black">
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
      <div className="bg-surf-base">
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="mb-3 flex gap-2 border-b-2 border-surf-muted/20 pb-2">
              <div className="min-w-0 flex-[1.4]" />
              {sections.map((s) => (
                <div key={s.key} className="min-w-0 flex-1 text-right text-sm font-extrabold text-surf-black">
                  {s.title}
                </div>
              ))}
            </div>
            {merged.map((group) => (
              <div key={group.heading} className="mb-4">
                <div className="mb-2 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">
                  {group.heading}
                </div>
                {group.rows.map((row) => (
                  <div key={row.label} className="flex gap-2 border-b border-surf-muted/10 py-1.5 text-sm">
                    <div className="min-w-0 flex-[1.4] text-surf-muted">{row.label}</div>
                    {row.cells.map((cell, i) => (
                      <div key={i} className="min-w-0 flex-1 text-right font-bold whitespace-nowrap text-surf-black">
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
      <div className="max-w-prose bg-surf-base text-xs leading-relaxed text-surf-muted italic">
        This rail band calculator is intended to provide a quantitative aspect to shaping
        consistent surfboard rails. It&apos;s recommended to understand how rail shapes affects
        surfboard performance, and how these marks can result in producing your desired outcome.
      </div>
    </div>
  );
}
