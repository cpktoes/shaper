"use client";

/**
 * The Contact page's client form (quick 260929-u1t): a plain form on `useActionState`, an
 * `<a href="mailto:">` link shared by every state the page can be in, and the sent/failed/invalid
 * answers described in C-4.
 *
 * `key={state.attempt}` (P-4) remounts every field on each new answer, so the field's own
 * `defaultValue` (React's uncontrolled-field default) becomes the echoed text rather than the
 * blank string a normal post-submit reset would leave behind — a shaper's typed message never
 * disappears because of a mistyped email beside it. The `action` prop posts through the Server
 * Action even before hydration finishes (P-4), so a message can never end up sitting in a URL.
 */

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { sendContactMessage } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONTACT_ADDRESS,
  CONTACT_COPY,
  CONTACT_FIELD_NAMES,
  CONTACT_LIMITS,
  CONTACT_MAILTO,
  initialContactFormState,
  type ContactFormState,
} from "@/lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "@/lib/privacy/copy";

/** Shared by the address-only page, the sent panel and the "prefer email" line under the form —
 * one definition so the address and its styling can never drift between the three places it
 * appears. */
export function ContactAddressLink({ prominent }: { prominent?: boolean } = {}) {
  return (
    <a
      href={CONTACT_MAILTO}
      className={
        "font-bold text-surf-accent-ink underline-offset-4 hover:underline focus-ring-accent" +
        (prominent ? " inline-flex items-center coarse:min-h-11" : "")
      }
    >
      {CONTACT_ADDRESS}
    </a>
  );
}

const fieldErrorClassName = "mt-1.5 text-xs text-surf-warning-ink";
const fieldLabelClassName = "mb-1.5 block text-sm font-medium text-surf-ink";
const textInputClassName =
  "min-h-36 w-full resize-y rounded-lg border border-input bg-surf-ground px-2.5 py-2 text-base text-surf-ink outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm coarse:text-base";

export function ContactForm({ prefill }: { prefill: { name: string; email: string } }) {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(
    sendContactMessage,
    initialContactFormState(prefill),
  );

  const sentHeadingRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "sent") {
      sentHeadingRef.current?.focus();
    }
  }, [state.status]);

  if (state.status === "sent") {
    return (
      <div className="mt-8 flex flex-col gap-5 rounded-lg border border-surf-line-faint bg-surf-panel p-6 max-shell:mt-6 max-shell:p-4">
        <p
          ref={sentHeadingRef}
          tabIndex={-1}
          className="text-base font-bold text-surf-ink outline-none"
        >
          {CONTACT_COPY.sentHeading}
        </p>
        <p className="text-sm text-surf-ink">
          {CONTACT_COPY.sentReplyLead} <span className="font-bold">{state.replyTo}</span>.
        </p>
      </div>
    );
  }

  // The first field with an error takes autoFocus, in field order (message, email, name) — a
  // shaper's eye and keyboard land on the one thing to fix first, rather than the last thing
  // this component happened to check.
  const firstErrorField = state.errors.message ? "message" : state.errors.email ? "email" : state.errors.name ? "name" : null;

  return (
    <form
      key={state.attempt}
      action={formAction}
      noValidate
      aria-label="Contact form"
      className="mt-8 flex flex-col gap-5 rounded-lg border border-surf-line-faint bg-surf-panel p-6 max-shell:mt-6 max-shell:p-4"
    >
      <div>
        <label htmlFor="contact-message" className={fieldLabelClassName}>
          {CONTACT_COPY.messageLabel}
        </label>
        <textarea
          id="contact-message"
          name={CONTACT_FIELD_NAMES.message}
          required
          maxLength={CONTACT_LIMITS.messageMax}
          rows={6}
          defaultValue={state.values.message}
          autoFocus={firstErrorField === "message"}
          aria-invalid={state.errors.message ? true : undefined}
          aria-describedby={state.errors.message ? "contact-message-error" : undefined}
          className={textInputClassName}
        />
        {state.errors.message && (
          <p id="contact-message-error" className={fieldErrorClassName}>
            {state.errors.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-email" className={fieldLabelClassName}>
          {CONTACT_COPY.emailLabel}
        </label>
        <Input
          id="contact-email"
          name={CONTACT_FIELD_NAMES.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={CONTACT_LIMITS.emailMax}
          defaultValue={state.values.email}
          autoFocus={firstErrorField === "email"}
          aria-invalid={state.errors.email ? true : undefined}
          aria-describedby={state.errors.email ? "contact-email-error" : undefined}
          className="bg-surf-ground"
        />
        {state.errors.email && (
          <p id="contact-email-error" className={fieldErrorClassName}>
            {state.errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-name" className={fieldLabelClassName}>
          {CONTACT_COPY.nameLabel}
        </label>
        <Input
          id="contact-name"
          name={CONTACT_FIELD_NAMES.name}
          autoComplete="name"
          maxLength={CONTACT_LIMITS.nameMax}
          defaultValue={state.values.name}
          autoFocus={firstErrorField === "name"}
          aria-invalid={state.errors.name ? true : undefined}
          aria-describedby={state.errors.name ? "contact-name-error" : undefined}
        />
        {state.errors.name && (
          <p id="contact-name-error" className={fieldErrorClassName}>
            {state.errors.name}
          </p>
        )}
      </div>

      {/* The honeypot (P-7): a real shaper never sees or fills this, because it sits in an
          aria-hidden, visually-hidden wrapper and is unreachable by Tab. `website` is not a
          Chrome/Safari autofill type, so a real browser's autofill can't fill it and lose a
          shaper's message to a false honeypot trip. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="contact-website">{CONTACT_COPY.honeypotLabel}</label>
        <input
          id="contact-website"
          name={CONTACT_FIELD_NAMES.honeypot}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {state.status === "failed" && (
        <p role="alert" className="text-sm text-surf-ink">
          {CONTACT_COPY.failedLead} <ContactAddressLink />.
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? CONTACT_COPY.sending : CONTACT_COPY.send}
      </Button>

      {/* The founder approved this note's words exactly (quick 260929-u1t), so quick 260930-03d
          appends the Privacy link rather than weaving it into the approved sentence. */}
      <p data-contact-privacy className="text-xs leading-relaxed text-surf-ink-muted">
        {CONTACT_COPY.privacy}{" "}
        <Link
          href={PRIVACY_ROUTE}
          className="font-bold text-surf-accent-ink underline-offset-4 hover:underline focus-ring-accent"
        >
          {PRIVACY_COPY.contactLineLinkLabel}
        </Link>
      </p>

      <p className="text-sm text-surf-ink">
        {CONTACT_COPY.emailInsteadLead} <ContactAddressLink />.
      </p>
    </form>
  );
}
