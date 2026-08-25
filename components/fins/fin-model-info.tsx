/**
 * MODEL INFO tab: static reference text on where each placement model's guidance comes from.
 * Copy lifted verbatim from reference/project/Fins.dc.html lines 480-528 — this is reference
 * text a shaper reads, not paraphrased or shortened.
 */

function InfoBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mb-4.5">
      <div className="mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">{heading}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function FinModelInfo() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surf-canvas pt-10 text-surf-ink">
      <div className="mb-6 text-xl font-display text-surf-ink uppercase tracking-architectural font-extrabold">Model Info</div>
      <div className="mb-5 border-b-2 border-surf-line-faint pb-4 text-sm text-surf-ink-muted">
        Reference note on where each model&apos;s placement guidance comes from.
      </div>

      <InfoBlock heading="Convention">
        All positions use the trailing-edge convention: off-tail and off-rail are measured to the
        trailing edge of the fin base, toe-in is the leading edge&apos;s inward offset from that
        trailing edge (regardless of fin base length), rears are often defined by a trailing edge
        spread rather than off-tail measurement, and every value is rounded to the nearest 1/16&quot;
        (0.1 cm).
      </InfoBlock>

      <InfoBlock heading="Single Model">
        Single fin box placement comes from an established fixed range rather than a length
        equation — the default value is in a common working range (4 1/2&quot; to 6&quot;) and can fine
        tuned by the forward/aft slider in the advanced menu, rather than solved for.
      </InfoBlock>

      <InfoBlock heading="Twin Models">
        <div className="mb-2">
          <strong>Modern/Upright</strong> — Good for shorter base (generally ≤ 5 1/2&quot;), more
          upright twin fins.
        </div>
        <div className="mb-2">
          <strong>Keel</strong> — Use for wide base (generally &gt; 5 1/2&quot;), retro-style twin fins.
        </div>
        <div className="mb-2">
          <strong>Upright + Trailer</strong> — Typically used with shorter-base, thruster-like,
          twins with a small trailer fin for added hold and drive.
        </div>
        <div>
          All twin placements come from established fixed ranges rather than a length equation —
          they&apos;re centered in a working range (Modern = 7&quot; to 8&quot;, Keel = 6&quot; to 6 1/2&quot;, and
          Upright+Trailer = at ~10&quot;) and can be adjusted by the forward/aft slider in the advanced
          menu, rather than solved for.
        </div>
      </InfoBlock>

      <InfoBlock heading="2+1 Model">
        The center fin box placement follows the Single Model above. Side bite placements come
        from an established fixed range, scaled off a length anchor of 9&apos; rather than a length
        equation — the default value is centered in a working range (15&quot; to 16 1/2&quot;) and can be
        adjusted by the forward/aft slider in the advanced menu, rather than solved for.
      </InfoBlock>

      <InfoBlock heading="Thruster & Quad Front Models">
        <div className="mb-2">
          <strong>Proportional</strong> — A straightforward linear length-scaled placement based
          on a smaller range of short board. It&apos;s the simplest of the four and the least tuned
          for longer boards.
        </div>
        <div className="mb-2">
          <strong>Basic (Half Rate)</strong> — Also scales linearly with length, but more slowly.
          It follows a &quot;half rate convention&quot; based on the idea that stance width scales slower
          than board length.
        </div>
        <div>
          <strong>McKee Shortboard / Gun</strong> — Fitted to Greg McKee&apos;s published
          fin-placement guidance for shortboards and guns respectively. Also follows a &quot;half
          rate&quot; style convention.
        </div>
      </InfoBlock>

      <div>
        <div className="mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">Quad Rear Models</div>
        <div className="text-sm leading-relaxed">
          <div className="mb-2">
            <strong>Basic: Spread</strong> — Uses the front Basic Model as input. Rears are placed
            at 1/2 the front distance from tail as default. Rears use common spread values which
            tend to put the fins closer to the stringer than the Off-Rail Model, resulting in a
            looser board.
          </div>
          <div className="mb-2">
            <strong>Basic: Off-Rail</strong> — Uses the front Basic Model as input. Rears are
            placed at 1/2 the front distance +1/4&quot; from tail as default. Rears use common Off-Rail
            values which tend to put the fins closer to the rail (wider spread) than the Spread
            Model, resulting in a board with extra drive. The slightly farther forward rear fins
            help to avoid feeling tracky.
          </div>
          <div className="mb-2">
            <strong>McKee SB/Gun</strong> — McKee&apos;s shortboard/gun rear-pair guidance, paired
            with the matching front model.
          </div>
          <div>
            <strong>McKee Longboard</strong> — McKee&apos;s dedicated longboard front-and-rear
            guidance, best suited to boards 8&apos; and up.
          </div>
        </div>
      </div>
    </div>
  );
}
