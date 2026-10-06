/**
 * The Contact form's delivery switch (quick 260929-u1t, Task 1; the sender reworked for Resend in
 * quick 260929-w2k, Task 1): the production-guarded stand-in (P-3), the Resend HTTP call, and
 * `submitContact` — the one function the Server Action calls, which decides between honeypot,
 * validation, availability, the per-visitor limit (quick 261006-g5q, `./rate-limit.ts`) and
 * delivery in that order. The limit is asked only for an attempt that would really reach delivery.
 *
 * Pure except for the injectable `fetch` — server-side only by convention, never by React or
 * Next import: nothing under `components/` may import this file (the boundary test in
 * delivery.test.ts enforces it), because the moment this module is reachable from a client
 * bundle, the Resend key it eventually touches (via `lib/contact-server.ts`) is one bundler
 * mistake from shipping to the browser.
 */

import {
  CONTACT_LIMITS,
  buildResendRequest,
  isHoneypotFilled,
  validateContactFields,
  type ContactFields,
  type ContactFormState,
  type ResendSendBody,
} from "./message";

export const RESEND_SEND_URL = "https://api.resend.com/emails";
export const CONTACT_USER_AGENT = "shaper-assistant/1.0";
export const CONTACT_STAND_IN_ENV = "SHAPER_CONTACT_STAND_IN";
export const CONTACT_STAND_IN_COOKIE = "shaper-contact-stand-in";

export type ContactDelivery =
  | { kind: "resend"; apiKey: string }
  | { kind: "stand-in"; outcome: "sent" | "failed" }
  | { kind: "none" };

/**
 * P-3's switch, pinned: the stand-in is honoured only when BOTH are true — `nodeEnv` is not the
 * literal `"production"` string (the value Next inlines at build time), and the flag is exactly
 * `"1"` (not `"true"`, not anything else). While it is on, the real key is never read: the
 * cookie's `standInChoice` picks `sent` or `failed`, and anything else — including no cookie at
 * all — resolves to `none`, so a browser test that forgets to set the cookie sees the
 * address-only page rather than an accidental real send. Otherwise the trimmed
 * `RESEND_API_KEY` decides: present and non-blank is `resend`, blank is `none`.
 */
export function resolveContactDelivery(input: {
  nodeEnv: string | undefined;
  standInFlag: string | undefined;
  standInChoice: string | undefined;
  apiKey: string | undefined;
}): ContactDelivery {
  const standInOn = input.nodeEnv !== "production" && input.standInFlag === "1";
  if (standInOn) {
    if (input.standInChoice === "sent" || input.standInChoice === "failed") {
      return { kind: "stand-in", outcome: input.standInChoice };
    }
    return { kind: "none" };
  }

  const trimmedKey = (input.apiKey ?? "").trim();
  return trimmedKey === "" ? { kind: "none" } : { kind: "resend", apiKey: trimmedKey };
}

export function isContactFormAvailable(delivery: ContactDelivery): boolean {
  return delivery.kind !== "none";
}

/**
 * The one real network call, guarded by the OK rule pinned in the plan's `<context>` (W-4): a
 * send counts as OK only on a 2xx response whose parsed JSON is a non-null, non-array object
 * carrying a non-empty string `id`. Anything else — a non-2xx (even one carrying an id), a
 * network error, a timeout, bad JSON, or a missing/empty/non-string `id` — is a failure, logged
 * with the HTTP status and Resend's own error `name` only. The key, the body, the headers, the
 * delivery object and Resend's `message` field are never logged: a failure a shaper never sees
 * still must not leak the key or a shaper's typed text into a server log a shaper never sees
 * either.
 */
export async function sendWithResend(
  body: ResendSendBody,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean }> {
  let status: number | null = null;
  let errorName: string | null = null;
  let ok = false;

  try {
    const response = await fetchImpl(RESEND_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": CONTACT_USER_AGENT,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    status = response.status;

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const isPlainObject =
      payload !== null && typeof payload === "object" && !Array.isArray(payload);
    const id = isPlainObject ? (payload as { id?: unknown }).id : undefined;

    ok = response.ok && isPlainObject && typeof id === "string" && id.length > 0;

    if (!ok) {
      errorName =
        isPlainObject && typeof (payload as { name?: unknown }).name === "string"
          ? (payload as { name: string }).name
          : null;
    }
  } catch {
    ok = false;
    status = null;
    errorName = null;
  }

  if (!ok) {
    console.error("Shaper: contact message did not send", { status, errorName });
  }

  return { ok };
}

/** Dispatches on the delivery kind. The stand-in never touches the network — a browser test can
 * never trigger a real send even if a real key happens to be present (P-3). */
export async function deliverContactMessage(
  body: ResendSendBody,
  delivery: ContactDelivery,
  fetchImpl?: typeof fetch,
): Promise<{ ok: boolean }> {
  switch (delivery.kind) {
    case "stand-in":
      return { ok: delivery.outcome === "sent" };
    case "none":
      return { ok: false };
    case "resend":
      return sendWithResend(body, delivery.apiKey, fetchImpl);
  }
}

/** The raw, untrusted, typed fields — capped for the echo, never re-validated: a shaper's typed
 * text is kept exactly as typed (P-4), just bounded so a hostile payload can't blow up the
 * response size. */
function echoValues(fields: ContactFields) {
  return {
    message: fields.message.slice(0, 10_000),
    email: fields.email.slice(0, 500),
    name: fields.name.slice(0, 200),
  };
}

/** A missing, non-integer or negative `previous.attempt` counts as 0 — it arrives from the
 * browser and is untrusted. */
function safePreviousAttempt(previous: ContactFormState | undefined): number {
  const attempt = previous?.attempt;
  return typeof attempt === "number" && Number.isInteger(attempt) && attempt >= 0 ? attempt : 0;
}

/**
 * The one function `app/actions/contact.ts` calls. Order: attempt, then honeypot, then
 * validation, then availability, then the per-visitor limit, then deliver — the last two inside
 * try/catch. A filled honeypot short-circuits everything after it (still answering "sent", so a
 * bot learns nothing), an invalid field never reaches delivery, and a missing delivery path never
 * calls the injected `deliver`. The injected `allowSend` (quick 261006-g5q) is asked only for an
 * attempt that would really reach delivery, so spam, mistakes and a server with no way to send
 * never use up a send; when it answers false the shaper gets "limited" with what they typed kept,
 * and when it throws they get "failed" the same way. Omitted, every send is allowed.
 */
export async function submitContact(input: {
  fields: ContactFields;
  delivery: ContactDelivery;
  previous: ContactFormState | undefined;
  deliver?: (body: ResendSendBody, delivery: ContactDelivery) => Promise<{ ok: boolean }>;
  allowSend?: () => boolean | Promise<boolean>;
}): Promise<ContactFormState> {
  const attempt = safePreviousAttempt(input.previous) + 1;

  if (isHoneypotFilled(input.fields)) {
    const replyTo = input.fields.email.trim().slice(0, CONTACT_LIMITS.emailMax);
    return {
      status: "sent",
      errors: {},
      values: { message: "", email: "", name: "" },
      replyTo,
      attempt,
    };
  }

  const validated = validateContactFields(input.fields);
  if (!validated.ok) {
    return {
      status: "invalid",
      errors: validated.errors,
      values: echoValues(input.fields),
      replyTo: "",
      attempt,
    };
  }

  if (!isContactFormAvailable(input.delivery)) {
    return {
      status: "failed",
      errors: {},
      values: echoValues(input.fields),
      replyTo: "",
      attempt,
    };
  }

  const deliver = input.deliver ?? deliverContactMessage;
  try {
    const body = buildResendRequest(validated.value);
    if (input.allowSend && !(await input.allowSend())) {
      return {
        status: "limited",
        errors: {},
        values: echoValues(input.fields),
        replyTo: "",
        attempt,
      };
    }
    const result = await deliver(body, input.delivery);
    if (result.ok) {
      return {
        status: "sent",
        errors: {},
        values: { message: "", email: "", name: "" },
        replyTo: validated.value.email,
        attempt,
      };
    }
    return {
      status: "failed",
      errors: {},
      values: echoValues(input.fields),
      replyTo: "",
      attempt,
    };
  } catch {
    return {
      status: "failed",
      errors: {},
      values: echoValues(input.fields),
      replyTo: "",
      attempt,
    };
  }
}
