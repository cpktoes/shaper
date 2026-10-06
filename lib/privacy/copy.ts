/**
 * The Privacy page's remaining pure parts (quick 260930-03d, Phase 13 item 11; trimmed in quick
 * 261006-fom). The page's own words now live in `content/legal/privacy.md`, the founder's own
 * Privacy Policy, read at each visit by `components/legal/legal-page.tsx` (D-01): the old
 * hand-typed paragraphs that used to live here, and the `privacyPageText()` helper that joined
 * them for the tests, are retired.
 *
 * What stays is the page's address and the two short labels other screens show: both menus'
 * Privacy row (`components/settings-menu.tsx`, `components/design/phone-menu.tsx`) and the link at
 * the end of the Contact form's privacy note (`components/contact/contact-form.tsx`).
 *
 * No React, Next, browser API or network import anywhere in this file.
 */

export const PRIVACY_ROUTE = "/privacy";

export const PRIVACY_COPY = {
  menuLabel: "Privacy",
  contactLineLinkLabel: "Privacy",
} as const;
