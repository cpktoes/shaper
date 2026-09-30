/**
 * The Contact form's delivery switch (quick 260929-u1t, Task 1): the production-guarded stand-in
 * (P-3), the SMTP2GO HTTP call, and `submitContact` — the one function the Server Action calls,
 * which decides between honeypot, validation, availability and delivery in that order.
 *
 * Pure except for the injectable `fetch` — server-side only by convention, never by React or
 * Next import: nothing under `components/` may import this file (the boundary test in
 * delivery.test.ts enforces it), because the moment this module is reachable from a client
 * bundle, the SMTP2GO key it eventually touches (via `lib/contact-server.ts`) is one bundler
 * mistake from shipping to the browser.
 */

import {
  CONTACT_LIMITS,
  buildSmtp2goRequest,
  isHoneypotFilled,
  validateContactFields,
  type ContactFields,
  type ContactFormState,
  type Smtp2goSendBody,
} from "./message";

export const SMTP2GO_SEND_URL = "https://api.smtp2go.com/v3/email/send";
export const CONTACT_STAND_IN_ENV = "SHAPER_CONTACT_STAND_IN";
export const CONTACT_STAND_IN_COOKIE = "shaper-contact-stand-in";

export type ContactDelivery =
  | { kind: "smtp2go"; apiKey: string }
  | { kind: "stand-in"; outcome: "sent" | "failed" }
  | { kind: "none" };

/**
 * P-3's switch, pinned: the stand-in is honoured only when BOTH are true — `nodeEnv` is not the
 * literal `"production"` string (the value Next inlines at build time), and the flag is exactly
 * `"1"` (not `"true"`, not anything else). While it is on, the real key is never read: the
 * cookie's `standInChoice` picks `sent` or `failed`, and anything else — including no cookie at
 * all — resolves to `none`, so a browser test that forgets to set the cookie sees the
 * address-only page rather than an accidental real send. Otherwise the trimmed
 * `SMTP2GO_API_KEY` decides: present and non-blank is `smtp2go`, blank is `none`.
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
  return trimmedKey === "" ? { kind: "none" } : { kind: "smtp2go", apiKey: trimmedKey };
}

export function isContactFormAvailable(delivery: ContactDelivery): boolean {
  return delivery.kind !== "none";
}

/**
 * The one real network call, guarded by the OK rule pinned in the plan's `<context>`: a send
 * counts as OK only on a 2xx response, parseable JSON, `data.failed === 0` and
 * `data.succeeded >= 1`. Anything else — a non-2xx, a network error, a timeout, bad JSON, missing
 * fields, or `failed > 0` — is a failure, logged with the status and SMTP2GO's own error code
 * only. The key, the body, the headers and the delivery object are never logged: a failure a
 * shaper never sees still must not leak the key into a server log a shaper never sees either.
 */
export async function sendWithSmtp2go(
  body: Smtp2goSendBody,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean }> {
  let status: number | null = null;
  let errorCode: string | null = null;
  let ok = false;

  try {
    const response = await fetchImpl(SMTP2GO_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Smtp2go-Api-Key": apiKey,
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

    const data =
      payload !== null && typeof payload === "object" && "data" in payload
        ? (payload as { data?: unknown }).data
        : undefined;
    const failed =
      data !== undefined && typeof data === "object" && data !== null && "failed" in data
        ? (data as { failed?: unknown }).failed
        : undefined;
    const succeeded =
      data !== undefined && typeof data === "object" && data !== null && "succeeded" in data
        ? (data as { succeeded?: unknown }).succeeded
        : undefined;

    ok = response.ok && failed === 0 && typeof succeeded === "number" && succeeded >= 1;

    if (!ok) {
      errorCode =
        data !== undefined &&
        typeof data === "object" &&
        data !== null &&
        typeof (data as { error_code?: unknown }).error_code === "string"
          ? (data as { error_code: string }).error_code
          : null;
    }
  } catch {
    ok = false;
    status = null;
    errorCode = null;
  }

  if (!ok) {
    console.error("Shaper: contact message did not send", { status, errorCode });
  }

  return { ok };
}

/** Dispatches on the delivery kind. The stand-in never touches the network — a browser test can
 * never trigger a real send even if a real key happens to be present (P-3). */
export async function deliverContactMessage(
  body: Smtp2goSendBody,
  delivery: ContactDelivery,
  fetchImpl?: typeof fetch,
): Promise<{ ok: boolean }> {
  switch (delivery.kind) {
    case "stand-in":
      return { ok: delivery.outcome === "sent" };
    case "none":
      return { ok: false };
    case "smtp2go":
      return sendWithSmtp2go(body, delivery.apiKey, fetchImpl);
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
 * validation, then availability, then deliver inside try/catch — a filled honeypot short-circuits
 * everything after it (still answering "sent", so a bot learns nothing), an invalid field never
 * reaches delivery, and a missing delivery path never calls the injected `deliver`.
 */
export async function submitContact(input: {
  fields: ContactFields;
  delivery: ContactDelivery;
  previous: ContactFormState | undefined;
  deliver?: (body: Smtp2goSendBody, delivery: ContactDelivery) => Promise<{ ok: boolean }>;
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
    const body = buildSmtp2goRequest(validated.value);
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
