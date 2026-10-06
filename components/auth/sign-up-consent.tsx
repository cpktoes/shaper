import { TERMS_ROUTE, SIGN_UP_CONSENT } from "@/lib/legal/documents";
import { PRIVACY_ROUTE } from "@/lib/privacy/copy";

/**
 * The sign-up consent line (quick 261006-fom, D-04 with P-3): "By creating an account you agree to
 * our Terms of Service and Privacy Policy." — drawn by the app's own sign-in dialog directly under
 * Clerk's card, never inside Clerk's form. Clerk 7.8.2's appearance options only add small "Terms"
 * and "Privacy" links to the card's own footer (wired in `app/layout.tsx`); no appearance option
 * draws a sentence, so the founder's sentence is the app's own frame around the card, like the
 * dialog's title.
 *
 * Both phrases are plain links that open in a new tab, as Clerk's own footer links do, so a
 * half-finished sign-up in this dialog is never lost; `rel="noopener noreferrer"` keeps the new tab
 * from reaching back into this one (T-261006-03). Centred and as wide as Clerk's 400-dot card, in
 * small muted type. No "use client": it holds no state.
 */

const CONSENT_LINK = "font-bold text-surf-accent-ink underline-offset-4 hover:underline focus-ring-accent";

export function SignUpConsent() {
  return (
    <p data-sign-up-consent className="mx-auto max-w-[400px] text-center text-xs leading-relaxed text-surf-ink-muted">
      {SIGN_UP_CONSENT.lead}{" "}
      <a href={TERMS_ROUTE} target="_blank" rel="noopener noreferrer" className={CONSENT_LINK}>
        {SIGN_UP_CONSENT.terms}
      </a>{" "}
      {SIGN_UP_CONSENT.joiner}{" "}
      <a href={PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer" className={CONSENT_LINK}>
        {SIGN_UP_CONSENT.privacy}
      </a>
      {SIGN_UP_CONSENT.end}
    </p>
  );
}
