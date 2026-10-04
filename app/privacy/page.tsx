import type { Metadata } from "next";
import Link from "next/link";
import { ContactAddressLink } from "@/components/contact/contact-form";
import { CONTACT_ROUTE } from "@/lib/contact/message";
import { PRIVACY_COPY } from "@/lib/privacy/copy";

export const metadata: Metadata = {
  title: PRIVACY_COPY.pageTitle,
  description: PRIVACY_COPY.pageDescription,
};

/**
 * The `/privacy` page (quick 260930-03d, Phase 13 item 11). Open to a signed-out shaper — D-01,
 * "no route gating": `proxy.ts` protects nothing, and `lib/auth/open-access.test.ts` has a case
 * for this page, mirroring the Contact page's.
 *
 * The page is its `<main>` alone: the old bottom tab bar this page used to mount as its own last
 * child was removed in quick 261003-q2f — on a phone the top bar's menu reaches every screen.
 *
 * Every word below comes from `PRIVACY_COPY` (lib/privacy/copy.ts) — nothing is typed here, so the
 * copy tests are the one place the page's words are pinned.
 */
export default function PrivacyPage() {
  return (
    <main data-privacy-page className="min-h-0 flex-1 overflow-y-auto bg-surf-ground">
      <div className="mx-auto max-w-xl px-8 pt-16 pb-16 max-shell:px-4 max-shell:pt-6 max-shell:pb-8">
        <h1 className="text-3xl max-shell:text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
          {PRIVACY_COPY.heading}
        </h1>
        <p className="mt-2 text-xs text-surf-ink-muted">{PRIVACY_COPY.lastUpdated}</p>
        <p className="mt-4 text-sm leading-relaxed text-surf-ink">{PRIVACY_COPY.intro}</p>

        <section>
          <h2 className="mt-10 max-shell:mt-8 text-xs font-bold tracking-architectural uppercase text-surf-ink">
            {PRIVACY_COPY.keep.heading}
          </h2>
          {PRIVACY_COPY.keep.items.map((item) => (
            <p key={item.lead} className="mt-3 text-sm leading-relaxed text-surf-ink">
              <strong className="font-bold">{item.lead}</strong> {item.text}
            </p>
          ))}
        </section>

        <section>
          <h2 className="mt-10 max-shell:mt-8 text-xs font-bold tracking-architectural uppercase text-surf-ink">
            {PRIVACY_COPY.browser.heading}
          </h2>
          {PRIVACY_COPY.browser.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-relaxed text-surf-ink">
              {paragraph}
            </p>
          ))}
        </section>

        <section>
          <h2 className="mt-10 max-shell:mt-8 text-xs font-bold tracking-architectural uppercase text-surf-ink">
            {PRIVACY_COPY.handlers.heading}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-surf-ink">{PRIVACY_COPY.handlers.intro}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm leading-relaxed text-surf-ink">
            {PRIVACY_COPY.handlers.services.map((service) => (
              <li key={service.name}>
                <strong className="font-bold">{service.name}</strong> — {service.role}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-surf-ink">{PRIVACY_COPY.handlers.closing}</p>
        </section>

        <section>
          <h2 className="mt-10 max-shell:mt-8 text-xs font-bold tracking-architectural uppercase text-surf-ink">
            {PRIVACY_COPY.deleting.heading}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-surf-ink">{PRIVACY_COPY.deleting.boards}</p>
          <p className="mt-3 text-sm leading-relaxed text-surf-ink">{PRIVACY_COPY.deleting.accountSelf}</p>
          <p className="mt-3 text-sm leading-relaxed text-surf-ink">
            {PRIVACY_COPY.deleting.accountLead} <ContactAddressLink /> {PRIVACY_COPY.deleting.accountTail}
          </p>
        </section>

        <section>
          <h2 className="mt-10 max-shell:mt-8 text-xs font-bold tracking-architectural uppercase text-surf-ink">
            {PRIVACY_COPY.questions.heading}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-surf-ink">
            {PRIVACY_COPY.questions.lead}{" "}
            <Link
              href={CONTACT_ROUTE}
              className="font-bold text-surf-accent-ink underline-offset-4 hover:underline focus-ring-accent"
            >
              {PRIVACY_COPY.questions.contactLinkLabel}
            </Link>
            {PRIVACY_COPY.questions.middle} <ContactAddressLink />.
          </p>
        </section>
      </div>
    </main>
  );
}
