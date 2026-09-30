/**
 * The Privacy page's pure parts (quick 260930-03d, Phase 13 item 11; Task 1) — every word a
 * shaper reads on `/privacy`, in both menus' Privacy row, and at the end of the Contact form's
 * privacy note. The same reason `lib/contact/message.ts` does this for the Contact page (CLAUDE.md
 * Rule 1's spirit for `lib/geometry/` applies here too): the words are the product here, so they
 * have to be verifiable in isolation and safe to import from either a Server Component or a client
 * form.
 *
 * Every claim below is backed in this quick task's PLAN.md, in the "Fact table: every claim on the
 * page and what backs it" section — real code, the founder's own recorded service setup, or
 * Vercel's own Web Analytics documentation. No storage key name or piece of legal jargon appears
 * in any of these strings — only what each thing is FOR, in plain words.
 *
 * No React, Next, browser API or network import anywhere in this file.
 */

import { CONTACT_ADDRESS } from "@/lib/contact/message";

export const PRIVACY_ROUTE = "/privacy";

export const PRIVACY_COPY = {
  pageTitle: "Shaper Assistant — Privacy",
  pageDescription: "What Shaper Assistant keeps about you, why, and how to have it deleted.",
  heading: "Privacy",
  lastUpdated: "Last updated 30 September 2026",
  intro:
    "Here's what Shaper Assistant keeps about you, why it keeps it, and how to have it deleted.",
  keep: {
    heading: "What we keep, and why",
    items: [
      {
        lead: "Your account.",
        text: "Signing in is handled by Clerk, which keeps your email address and, if you give it, your name. If you sign in with Google, Google shares your name, email address and profile picture with Clerk. Clerk checks your password if you use one — we never see it. We use your name and email to sign you in, and to fill them in on the Contact form for you. Our own database doesn't hold them — just the ID Clerk gives your account, so we know which boards are yours.",
      },
      {
        lead: "Your boards.",
        text: "When you're signed in and save a board, its name and design are kept in our database, so it's there next time, on any device. If you're not signed in, nothing you design is saved — the board lives only in the open page.",
      },
      {
        lead: "Your settings.",
        text: "When you're signed in, your settings are kept on your account too, so they follow you to any device: Imperial or Metric, whether the Rail Band Instructions page is included when you print, your Fit & Tip Defaults, and which blank makers you've switched off.",
      },
      {
        lead: "Page visits.",
        text: "We count visits to each screen with Vercel Web Analytics, to see which parts of the app get used. It uses no cookies and can't tell us who you are. We see how many visits each page gets, the site that sent you there, roughly where in the world the visit came from, and the kind of device and browser. Only the page's address is recorded — never anything added to the end of a link.",
      },
      {
        lead: "Messages you send us.",
        text: "When you use the Contact form, your message, the email to reply to and your name, if you add one, are emailed to our support inbox through Resend. We use your email address only to reply to you, and never add it to a mailing list. Nothing you send is saved in the app.",
      },
    ],
  },
  browser: {
    heading: "Cookies and your browser",
    paragraphs: [
      "Clerk uses a few cookies to know whether you're signed in.",
      "When you change a setting — Imperial or Metric, the Rail Band Instructions page, your Fit & Tip Defaults or your blank makers — the app remembers it in a small cookie and in your browser's own storage, so every page opens with your choices already in place.",
      "Your browser also remembers which theme you picked, that you've closed the tip about hiding Safari's toolbar, and — only until you close the tab — that you've dismissed the “Sign in and your boards are saved” note.",
      "There are no advertising or tracking cookies.",
    ],
  },
  handlers: {
    heading: "Who handles it for us",
    intro: "A few companies run parts of Shaper Assistant for us:",
    services: [
      { name: "Clerk", role: "signs you in" },
      { name: "Neon", role: "keeps saved boards and settings in our database" },
      { name: "Vercel", role: "runs the site and counts visits" },
      { name: "Resend", role: "delivers Contact form messages to our inbox" },
      { name: "Zoho Mail", role: "runs our support inbox" },
    ],
    closing: "We don't sell your information, and there are no ads.",
  },
  deleting: {
    heading: "Deleting your data",
    boards:
      "You can delete any saved board yourself, from the three-dot menu on its card on the home screen.",
    accountSelf:
      "To delete your account, open your account menu (your picture in the top bar) and choose Manage account, then Security, then Delete account. Your saved boards and settings are deleted with it.",
    accountLead: "Or email us at",
    accountTail: "and we'll do it for you.",
  },
  questions: {
    heading: "Questions",
    lead: "Questions about any of this? Send us a note from the",
    contactLinkLabel: "Contact page",
    middle: ", or email",
  },
  menuLabel: "Privacy",
  contactLineLinkLabel: "Privacy",
} as const;

/**
 * Every visible string in `PRIVACY_COPY`, joined with "\n" in reading order — the one thing the
 * copy tests (and, indirectly, the founder's own read-through) check against, so a change to the
 * page's words and a change to what the tests pin can never drift apart.
 */
export function privacyPageText(): string {
  const lines: string[] = [
    PRIVACY_COPY.heading,
    PRIVACY_COPY.lastUpdated,
    PRIVACY_COPY.intro,
    PRIVACY_COPY.keep.heading,
    ...PRIVACY_COPY.keep.items.map((item) => `${item.lead} ${item.text}`),
    PRIVACY_COPY.browser.heading,
    ...PRIVACY_COPY.browser.paragraphs,
    PRIVACY_COPY.handlers.heading,
    PRIVACY_COPY.handlers.intro,
    ...PRIVACY_COPY.handlers.services.map((service) => `${service.name} — ${service.role}`),
    PRIVACY_COPY.handlers.closing,
    PRIVACY_COPY.deleting.heading,
    PRIVACY_COPY.deleting.boards,
    PRIVACY_COPY.deleting.accountSelf,
    `${PRIVACY_COPY.deleting.accountLead} ${CONTACT_ADDRESS} ${PRIVACY_COPY.deleting.accountTail}`,
    PRIVACY_COPY.questions.heading,
    `${PRIVACY_COPY.questions.lead} ${PRIVACY_COPY.questions.contactLinkLabel}${PRIVACY_COPY.questions.middle} ${CONTACT_ADDRESS}.`,
  ];
  return lines.join("\n");
}
