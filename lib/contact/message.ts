/**
 * The Contact page's pure parts (quick 260929-u1t, Task 1): every string a shaper reads on the
 * page and in the form, the field checks, the honeypot rule, the subject and text-body builders,
 * the exact SMTP2GO request shape (P-8), and the Clerk-account prefill.
 *
 * No React, Next, browser API or network import anywhere in this file — CLAUDE.md's Rule 1 for
 * `lib/geometry/` applies here too: this is the calculator for what a shaper's message becomes,
 * and it has to be verifiable in isolation, safe to import from either a Server Component or the
 * client form.
 */

export const CONTACT_ADDRESS = "support@shaperassistant.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_ADDRESS}`;
export const CONTACT_ROUTE = "/contact";
export const CONTACT_SENDER = "Shaper Assistant <support@shaperassistant.com>";
export const CONTACT_RECIPIENT = "Shaper Assistant <support@shaperassistant.com>";

export const CONTACT_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  messageMax: 5000,
  excerptMax: 60,
  subjectMax: 200,
} as const;

export const CONTACT_FIELD_NAMES = {
  message: "message",
  email: "email",
  name: "name",
  honeypot: "website",
} as const;

export const CONTACT_EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const CONTACT_COPY = {
  pageTitle: "Shaper Assistant — Contact",
  pageDescription: "Send a question or a note to the people behind Shaper Assistant.",
  heading: "Contact",
  intro:
    "Questions, a number that doesn't look right, or a blank you'd like in the catalogue? Send us a note. We read every message.",
  messageLabel: "Message",
  emailLabel: "Email to reply to",
  nameLabel: "Name (optional)",
  honeypotLabel: "Website",
  send: "Send message",
  sending: "Sending…",
  privacy:
    "What you send here — your message, the email to reply to and your name, if you add one — comes to us as an email. We use your email address only to reply to you. It's never added to a mailing list, and nothing you send here is saved in the app.",
  emailInsteadLead: "Prefer email? Write to us at",
  addressOnlyLead: "Email us at",
  sentHeading: "Sent — thanks for writing.",
  sentReplyLead: "We'll reply to",
  failedLead:
    "That didn't send, sorry. Your message is still in the box below. Copy it and email us at",
  menuLabel: "Contact",
} as const;

export const CONTACT_ERRORS = {
  messageMissing: "Write a message before sending.",
  messageTooLong: "Keep your message to 5,000 characters or fewer.",
  emailMissing: "Add an email address so we can reply.",
  emailInvalid: "That doesn't look like an email address. Check it and try again.",
  nameTooLong: "Keep your name to 100 characters or fewer.",
} as const;

export type ContactFields = { message: string; email: string; name: string; honeypot: string };
export type ContactMessage = { message: string; email: string; name: string };
export type ContactFieldErrors = Partial<Record<"message" | "email" | "name", string>>;
export type ContactValues = { message: string; email: string; name: string };
export type ContactFormState = {
  status: "idle" | "invalid" | "failed" | "sent";
  errors: ContactFieldErrors;
  values: ContactValues;
  replyTo: string;
  attempt: number;
};
export type Smtp2goSendBody = {
  sender: string;
  to: string[];
  subject: string;
  text_body: string;
  custom_headers: { header: string; value: string }[];
};

/** A single form field's raw text, or "" for anything missing or a File/Blob entry (a shaper's
 * form never uploads a file, so any File value here is either a bug or an attack — either way
 * it's read as empty rather than crashing). */
function fieldString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function readContactFields(formData: FormData): ContactFields {
  return {
    message: fieldString(formData, CONTACT_FIELD_NAMES.message),
    email: fieldString(formData, CONTACT_FIELD_NAMES.email),
    name: fieldString(formData, CONTACT_FIELD_NAMES.name),
    honeypot: fieldString(formData, CONTACT_FIELD_NAMES.honeypot),
  };
}

export function isHoneypotFilled(fields: ContactFields): boolean {
  return fields.honeypot.trim() !== "";
}

/**
 * Turns every C0/C1 control character, U+2028, U+2029 and every run of whitespace into ONE
 * space, then trims. Written without a control-character regex (a lint preset may carry
 * no-control-regex): each code point is mapped by hand via `Array.from`, so the string is walked
 * by real character (not UTF-16 code unit), and `\s+` — which already covers U+2028/U+2029 —
 * collapses the runs afterward.
 */
export function oneLine(text: string): string {
  const mapped = Array.from(text)
    .map((ch) => {
      const codePoint = ch.codePointAt(0) ?? 0;
      if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) return " ";
      return ch;
    })
    .join("");
  return mapped.replace(/\s+/g, " ").trim();
}

/** The message normalised for both the length check and the email body: every CRLF and lone CR
 * becomes a LF, then the whole thing is trimmed. Line breaks inside the message are kept — only
 * `oneLine` (used for the subject excerpt) flattens them — a shaper's paragraphs stay paragraphs
 * in the email the founder reads. */
function normalizeMessage(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function validateContactFields(
  fields: ContactFields,
): { ok: true; value: ContactMessage } | { ok: false; errors: ContactFieldErrors } {
  const errors: ContactFieldErrors = {};

  const normalizedMessage = normalizeMessage(fields.message);
  if (normalizedMessage === "") {
    errors.message = CONTACT_ERRORS.messageMissing;
  } else if (normalizedMessage.length > CONTACT_LIMITS.messageMax) {
    errors.message = CONTACT_ERRORS.messageTooLong;
  }

  const trimmedEmail = fields.email.trim();
  if (trimmedEmail === "") {
    errors.email = CONTACT_ERRORS.emailMissing;
  } else if (
    trimmedEmail.length > CONTACT_LIMITS.emailMax ||
    !CONTACT_EMAIL_PATTERN.test(trimmedEmail)
  ) {
    errors.email = CONTACT_ERRORS.emailInvalid;
  }

  const collapsedName = oneLine(fields.name);
  if (collapsedName.length > CONTACT_LIMITS.nameMax) {
    errors.name = CONTACT_ERRORS.nameTooLong;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { message: normalizedMessage, email: trimmedEmail, name: collapsedName } };
}

/** The subject's excerpt half: the message flattened to one line (P-9), cut at
 * `CONTACT_LIMITS.excerptMax` characters with an ellipsis when it was longer. */
function excerptOf(message: string): string {
  const flat = oneLine(message);
  if (flat.length <= CONTACT_LIMITS.excerptMax) return flat;
  return `${flat.slice(0, CONTACT_LIMITS.excerptMax)}…`;
}

/**
 * P-9: `Contact form: {who} — {excerpt}`. `who` is the name when given, else the email. The
 * whole subject is passed through `oneLine` a second time — belt and braces alongside the
 * excerpt's own flattening — so a hostile name or email can never smuggle a header-injecting
 * line break through the "who" half, then capped at `CONTACT_LIMITS.subjectMax`.
 */
export function buildContactSubject(message: ContactMessage): string {
  const who = message.name.trim() !== "" ? message.name : message.email;
  const excerpt = excerptOf(message.message);
  const subject = oneLine(`Contact form: ${who} — ${excerpt}`);
  return subject.length > CONTACT_LIMITS.subjectMax ? subject.slice(0, CONTACT_LIMITS.subjectMax) : subject;
}

/** The exact plain-text body: the message, a blank line, `--`, the name line (or "(not given)"),
 * the reply address, and the app's own sign-off — joined by "\n", nothing else. */
export function buildContactTextBody(message: ContactMessage): string {
  const nameLine = `Name: ${message.name.trim() !== "" ? message.name : "(not given)"}`;
  return [
    message.message,
    "",
    "--",
    nameLine,
    `Reply to: ${message.email}`,
    "Sent from the Contact page on shaperassistant.com",
  ].join("\n");
}

/** The exact body pinned in the plan's `<context>`: text only (no `html_body`), the constant
 * sender and recipient (P-8), and the shaper's checked email as the one `custom_headers` entry
 * so the founder's Gmail Reply goes straight to them. */
export function buildSmtp2goRequest(message: ContactMessage): Smtp2goSendBody {
  return {
    sender: CONTACT_SENDER,
    to: [CONTACT_RECIPIENT],
    subject: buildContactSubject(message),
    text_body: buildContactTextBody(message),
    custom_headers: [{ header: "Reply-To", value: message.email }],
  };
}

/** A signed-in shaper's Clerk name and primary email, cleaned the same way a typed name and
 * email would be, so a bad account value degrades to blank rather than a form the founder can't
 * reply to. */
export function contactPrefillFrom(
  user: { fullName: string | null; primaryEmail: string | null } | null,
): { name: string; email: string } {
  if (!user) return { name: "", email: "" };

  const collapsedName = oneLine(user.fullName ?? "");
  const name =
    collapsedName.length > CONTACT_LIMITS.nameMax
      ? collapsedName.slice(0, CONTACT_LIMITS.nameMax)
      : collapsedName;

  const trimmedEmail = (user.primaryEmail ?? "").trim();
  const email =
    trimmedEmail.length > 0 &&
    trimmedEmail.length <= CONTACT_LIMITS.emailMax &&
    CONTACT_EMAIL_PATTERN.test(trimmedEmail)
      ? trimmedEmail
      : "";

  return { name, email };
}

export function initialContactFormState(prefill: { name: string; email: string }): ContactFormState {
  return {
    status: "idle",
    errors: {},
    values: { message: "", email: prefill.email, name: prefill.name },
    replyTo: "",
    attempt: 0,
  };
}
