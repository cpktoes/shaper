"use client";

/**
 * The phone preview's scale, measured — the backstop for `app/design/summary/order-form.css`'s own
 * `--order-form-preview-scale`.
 *
 * The stylesheet states the rule once, as a plain CSS division: the page wrapper's content width over
 * the design width the form is drawn at, capped at 1. That division is CSS typed arithmetic, which
 * Safari has had since 18.2 and Chrome since 140 — but not every engine a shaper might carry has it
 * yet (Firefox, older Chromium forks), and on one of those the declaration is invalid at
 * computed-value time and the property falls back to 1: the sheet drawn at its full 880px design width
 * on a 390px phone, spilling off the right-hand edge.
 *
 * So this hook watches the page wrapper's content box with a ResizeObserver and writes the SAME rule
 * (`previewScale` below — `min(1, width / design width)`) onto the scaler as an inline custom
 * property, which outranks the stylesheet's declaration. Where the stylesheet already computes the
 * number, the two agree to six decimals and nothing visibly changes; where it cannot, the inline
 * number takes over the moment React hydrates, and follows every resize and rotation after that.
 *
 * Written straight onto the DOM node rather than through React state, the same way
 * `useOrderFormPrintFit` works: a measured number that only CSS consumes has no business causing a
 * re-render of two sheets of drawings. The design width is READ from the stylesheet's own
 * `--order-form-design-width` rather than carried here as a second 880, so the two can never drift —
 * `order-form-preview.test.ts` fails if this file ever grows an 880 of its own.
 *
 * Why not measure the scaler itself: its width is `design width × scale` — the very number being
 * worked out — so observing it would be circular. The page wrapper's content box is what the
 * stylesheet's `100cqw` reads too (it is the `container-type: inline-size` element), so the
 * measured rule and the declared rule are the same division of the same two lengths.
 */

import { useLayoutEffect, useRef } from "react";

/**
 * The preview's scale: the width the screen offers over the width the form is drawn at, never more
 * than 1 — a wide screen draws the sheet at its design size, never larger. Must stay the same rule
 * `order-form.css` writes as `min(1, calc(100cqw / var(--order-form-design-width)))`.
 */
export function previewScale(innerWidth: number, designWidth: number): number {
  return Math.min(1, innerWidth / designWidth);
}

export function useOrderFormPreviewScale() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const scalerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const scaler = scalerRef.current;
    if (!page || !scaler || typeof ResizeObserver !== "function") return undefined;

    const designWidth = parseFloat(getComputedStyle(scaler).getPropertyValue("--order-form-design-width"));
    if (!(designWidth > 0)) return undefined;

    const apply = (innerWidth: number) => {
      if (!(innerWidth > 0)) return; // hidden or not yet laid out — leave the stylesheet's own value be
      scaler.style.setProperty("--order-form-preview-scale", String(previewScale(innerWidth, designWidth)));
    };

    // Once now, synchronously, so the first client paint is already right on an engine that could
    // not divide the lengths itself; then on every change of the wrapper's content box.
    const style = getComputedStyle(page);
    apply(page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentBoxSize?.[0];
      apply(box ? box.inlineSize : (entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(page);

    return () => {
      observer.disconnect();
      scaler.style.removeProperty("--order-form-preview-scale");
    };
  }, []);

  return { pageRef, scalerRef };
}
