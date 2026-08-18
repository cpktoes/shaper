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
}

function formatCell(value: RailDataValue): string {
  if (value === "hard-edge") return "Hard Edge";
  if (value === null) return "—";
  return formatInchesFraction(value, 16);
}

export function RailDataTable({ sections }: RailDataTableProps) {
  const merged = mergeRailDataTable(sections.map((s) => ({ key: s.key, dataGroups: s.dataGroups })));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="rounded-xl border border-[#e4ddc9] bg-white p-5">
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="mb-3 flex gap-2 border-b-2 border-[#e4ddc9] pb-2">
              <div className="min-w-0 flex-[1.4]" />
              {sections.map((s) => (
                <div key={s.key} className="min-w-0 flex-1 text-right text-sm font-extrabold text-outline-ink">
                  {s.title}
                </div>
              ))}
            </div>
            {merged.map((group) => (
              <div key={group.heading} className="mb-4">
                <div className="mb-1.5 text-[11px] font-bold tracking-wide text-outline-accent uppercase">
                  {group.heading}
                </div>
                {group.rows.map((row) => (
                  <div key={row.label} className="flex gap-2 border-b border-[#f3efe3] py-1.5 text-sm">
                    <div className="min-w-0 flex-[1.4] text-[#8a8272]">{row.label}</div>
                    {row.cells.map((cell, i) => (
                      <div key={i} className="min-w-0 flex-1 text-right font-bold whitespace-nowrap text-outline-ink">
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
      <div className="rounded-xl border border-[#e4ddc9] bg-white p-4 text-xs leading-relaxed text-[#8a8272] italic">
        This rail band calculator is intended to provide a quantitative aspect to shaping
        consistent surfboard rails. It&apos;s recommended to understand how rail shapes affects
        surfboard performance, and how these marks can result in producing your desired outcome.
      </div>
    </div>
  );
}
