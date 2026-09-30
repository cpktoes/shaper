import type { Metadata } from "next";
import { PhoneTabBar } from "@/components/design/phone-tab-bar";
import { ContactAddressLink, ContactForm } from "@/components/contact/contact-form";
import { contactFormAvailableForRequest, resolveContactPrefill } from "@/lib/contact-server";
import { CONTACT_COPY } from "@/lib/contact/message";

export const metadata: Metadata = {
  title: CONTACT_COPY.pageTitle,
  description: CONTACT_COPY.pageDescription,
};

/**
 * The `/contact` page (quick 260929-u1t, item 10 of 13-SPEC.md). Open to a signed-out shaper —
 * D-01, "no route gating": `proxy.ts` protects nothing, and `lib/auth/open-access.test.ts` has a
 * case for this page.
 *
 * The form only appears once a send path exists (C-5): until the founder puts `SMTP2GO_API_KEY`
 * into Vercel, `contactFormAvailableForRequest()` resolves false and the address-only panel below
 * renders instead. That boolean is the ONLY thing this Server Component reads about delivery — it
 * never imports `resolveContactDeliveryForRequest` (that would put the delivery object, and with
 * it a path to the key, one accidental prop away from this page's own render). The Clerk prefill
 * is only fetched when the form will actually render, so the address-only page never asks Clerk
 * anything.
 *
 * `PhoneTabBar` is mounted here as the page's own last child (P-2), the same shape `app/page.tsx`
 * uses — this page needs its own copy because `/contact` is not one of the two routes
 * (`app/page.tsx`, `app/design/layout.tsx`) that already mount it.
 */
export default async function ContactPage() {
  const available = await contactFormAvailableForRequest();
  const prefill = available ? await resolveContactPrefill() : { name: "", email: "" };

  return (
    <>
      <main data-contact-page className="min-h-0 flex-1 overflow-y-auto bg-surf-ground">
        <div className="mx-auto max-w-xl px-8 pt-16 pb-16 max-shell:px-4 max-shell:pt-6 max-shell:pb-8">
          <h1 className="text-3xl max-shell:text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
            {CONTACT_COPY.heading}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-surf-ink">{CONTACT_COPY.intro}</p>
          {available ? (
            <ContactForm prefill={prefill} />
          ) : (
            <div className="mt-8 flex flex-col gap-5 rounded-lg border border-surf-line-faint bg-surf-panel p-6 max-shell:mt-6 max-shell:p-4">
              <p className="text-sm text-surf-ink">
                {CONTACT_COPY.addressOnlyLead} <ContactAddressLink prominent />.
              </p>
            </div>
          )}
        </div>
      </main>
      <PhoneTabBar />
    </>
  );
}
