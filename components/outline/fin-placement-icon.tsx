/**
 * The "fin placement" toolbar button's icon: a basic surfboard fin seen from the side — a straight
 * base, a raked leading edge sweeping up to a rounded tip, and a concave trailing edge curving back
 * down to the base.
 *
 * Hand-drawn because lucide has no surfboard fin. Decorative glyph geometry in an arbitrary 24x24
 * icon space, not board geometry — same posture as components/fins/fin-setup-icon.tsx's header
 * note, so this deliberately stays in the component layer rather than under lib/geometry. Drawn
 * in lucide's own style (stroke currentColor, width 2, round caps and joins, no fill) so it sits
 * in the toolbar beside LocateFixed and Ghost as one family.
 *
 * It is the ONE glyph for both states: the button's pressed fill says whether fin placement is on
 * (the BlankTopViewIcon / BoardInBlankIcon convention). Added for the founder's request of
 * 2026-10-18 (quick 261018-e6w): "Show fin placement can also become an icon rather than setting;
 * create a new icon with a basic surfboard fin as the icon."
 */
export function FinPlacementIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 20C5 13 10.5 6.5 19.5 4c1-.3 1.7.7 1.1 1.5C17.5 9.8 16 14.5 17 20Z" />
    </svg>
  );
}
