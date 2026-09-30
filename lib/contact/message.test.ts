import { describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL_PATTERN,
  CONTACT_ERRORS,
  CONTACT_LIMITS,
  CONTACT_RECIPIENT,
  CONTACT_SENDER,
  buildContactSubject,
  buildContactTextBody,
  buildSmtp2goRequest,
  contactPrefillFrom,
  initialContactFormState,
  isHoneypotFilled,
  oneLine,
  readContactFields,
  validateContactFields,
} from "./message";

/**
 * TDD RED for quick 260929-u1t, Task 1: the Contact form's pure checks — reading the raw
 * FormData, checking each field, flattening text for the subject line, and building the exact
 * SMTP2GO request body. No React, Next, Clerk or network import anywhere in message.ts, so this
 * suite runs in plain node with vitest's node environment.
 */

function formDataWith(entries: Record<string, FormDataEntryValue>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("readContactFields", () => {
  it("reads message, email, name and website from a real FormData", () => {
    const fd = formDataWith({
      message: "Hello there",
      email: "jane@example.com",
      name: "Jane",
      website: "",
    });
    expect(readContactFields(fd)).toEqual({
      message: "Hello there",
      email: "jane@example.com",
      name: "Jane",
      honeypot: "",
    });
  });

  it("treats missing entries as empty strings", () => {
    const fd = new FormData();
    expect(readContactFields(fd)).toEqual({ message: "", email: "", name: "", honeypot: "" });
  });

  it("treats a File/Blob entry as an empty string", () => {
    const fd = new FormData();
    fd.set("message", new Blob(["not text"], { type: "text/plain" }), "note.txt");
    expect(readContactFields(fd).message).toBe("");
  });
});

describe("isHoneypotFilled", () => {
  it("is false for an empty honeypot", () => {
    expect(isHoneypotFilled({ message: "", email: "", name: "", honeypot: "" })).toBe(false);
  });

  it("is false for a whitespace-only honeypot", () => {
    expect(isHoneypotFilled({ message: "", email: "", name: "", honeypot: "   " })).toBe(false);
  });

  it("is true when the honeypot was filled by a bot", () => {
    expect(
      isHoneypotFilled({ message: "", email: "", name: "", honeypot: "https://spam.example" }),
    ).toBe(true);
  });
});

describe("validateContactFields — message", () => {
  it("empty message is missing", () => {
    const result = validateContactFields({ message: "", email: "jane@example.com", name: "", honeypot: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.message).toBe(CONTACT_ERRORS.messageMissing);
  });

  it("whitespace-only message is missing", () => {
    const result = validateContactFields({
      message: "  \n  ",
      email: "jane@example.com",
      name: "",
      honeypot: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.message).toBe(CONTACT_ERRORS.messageMissing);
  });

  it("exactly 5,000 characters is ok", () => {
    const message = "a".repeat(5000);
    const result = validateContactFields({ message, email: "jane@example.com", name: "", honeypot: "" });
    expect(result.ok).toBe(true);
  });

  it("5,001 characters is too long", () => {
    const message = "a".repeat(5001);
    const result = validateContactFields({ message, email: "jane@example.com", name: "", honeypot: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.message).toBe(CONTACT_ERRORS.messageTooLong);
  });

  it("normalises CRLF to LF before counting, so 2,500 CRLF pairs (5,000 chars normalised) pass", () => {
    // 2,500 repeats of "a\r\n" is 7,500 raw characters; normalised to "a\n" it's 5,000 — well
    // under the 5,000-character limit, proving the count runs on the normalised text, not the
    // raw CRLF text (which would already be over the limit at 7,500).
    const raw = "a\r\n".repeat(2500);
    const result = validateContactFields({ message: raw, email: "jane@example.com", name: "", honeypot: "" });
    expect(result.ok).toBe(true);
  });
});

describe("validateContactFields — email", () => {
  it("empty email is missing", () => {
    const result = validateContactFields({ message: "hi", email: "", name: "", honeypot: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBe(CONTACT_ERRORS.emailMissing);
  });

  it("trims a valid email", () => {
    const result = validateContactFields({
      message: "hi",
      email: "  jane@example.com  ",
      name: "",
      honeypot: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe("jane@example.com");
  });

  it("accepts a plus-addressed email", () => {
    const result = validateContactFields({
      message: "hi",
      email: "j.o+surf@mail.co.uk",
      name: "",
      honeypot: "",
    });
    expect(result.ok).toBe(true);
  });

  const invalidEmails = [
    "jane",
    "jane@",
    "@example.com",
    "jane@example",
    "jane doe@example.com",
    "jane@example.com\r\nBcc: x@evil.test",
    "jane@example.com, other@example.com",
    "Jane <jane@example.com>",
    "jane@-example.com",
    `${"a".repeat(246)}@example.com`, // 255 chars total, otherwise matches
  ];

  it.each(invalidEmails)("rejects %s as invalid", (email) => {
    const result = validateContactFields({ message: "hi", email, name: "", honeypot: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBe(CONTACT_ERRORS.emailInvalid);
  });

  it("a 254-character matching address is ok", () => {
    const local = "a".repeat(242); // 242 + "@example.com" (12) = 254
    const email = `${local}@example.com`;
    expect(email.length).toBe(254);
    const result = validateContactFields({ message: "hi", email, name: "", honeypot: "" });
    expect(result.ok).toBe(true);
  });
});

describe("validateContactFields — name", () => {
  it("empty name is ok (optional)", () => {
    const result = validateContactFields({ message: "hi", email: "jane@example.com", name: "", honeypot: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("");
  });

  it("collapses inner whitespace and trims", () => {
    const result = validateContactFields({
      message: "hi",
      email: "jane@example.com",
      name: "  Jane   Smith ",
      honeypot: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Jane Smith");
  });

  it("flattens an embedded CRLF to one line", () => {
    const result = validateContactFields({
      message: "hi",
      email: "jane@example.com",
      name: "Jane\r\nBcc: x@evil.test",
      honeypot: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Jane Bcc: x@evil.test");
  });

  it("100 characters after collapsing is ok", () => {
    const name = "a".repeat(100);
    const result = validateContactFields({ message: "hi", email: "jane@example.com", name, honeypot: "" });
    expect(result.ok).toBe(true);
  });

  it("101 characters is too long", () => {
    const name = "a".repeat(101);
    const result = validateContactFields({ message: "hi", email: "jane@example.com", name, honeypot: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBe(CONTACT_ERRORS.nameTooLong);
  });
});

describe("validateContactFields — several problems at once", () => {
  it("returns every error together", () => {
    const result = validateContactFields({
      message: "",
      email: "not-an-email",
      name: "a".repeat(101),
      honeypot: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.message).toBe(CONTACT_ERRORS.messageMissing);
      expect(result.errors.email).toBe(CONTACT_ERRORS.emailInvalid);
      expect(result.errors.name).toBe(CONTACT_ERRORS.nameTooLong);
    }
  });
});

describe("oneLine", () => {
  it("collapses every C0 control character, U+2028, U+2029 and whitespace runs to one space, then trims", () => {
    expect(oneLine("  a\tb" + String.fromCharCode(0x2028) + "c" + String.fromCharCode(0x2029) + "d  ")).toBe("a b c d");
  });

  it("maps C1 control characters (0x7f-0x9f) to a space too", () => {
    expect(oneLine(`a${String.fromCharCode(0x9f)}b`)).toBe("a b");
  });

  it("collapses multiple inner spaces to one", () => {
    expect(oneLine("Jane   Smith")).toBe("Jane Smith");
  });
});

describe("buildContactSubject", () => {
  const shortMessage = { message: "Quick question about rocker", email: "jane@example.com", name: "Jane Smith" };

  it("starts with 'Contact form: '", () => {
    expect(buildContactSubject(shortMessage)).toMatch(/^Contact form: /);
  });

  it("uses the name when given", () => {
    expect(buildContactSubject(shortMessage)).toContain("Jane Smith");
  });

  it("uses the email when no name is given", () => {
    const subject = buildContactSubject({ message: "hi", email: "jane@example.com", name: "" });
    expect(subject).toContain("jane@example.com");
  });

  it("cuts the excerpt at 60 characters with an ellipsis", () => {
    const longMessage = "x".repeat(120);
    const subject = buildContactSubject({ message: longMessage, email: "jane@example.com", name: "" });
    expect(subject).toContain(`${"x".repeat(60)}…`);
  });

  it("never exceeds 200 characters", () => {
    const subject = buildContactSubject({
      message: "x".repeat(200),
      email: "jane@example.com",
      name: "a".repeat(100),
    });
    expect(subject.length).toBeLessThanOrEqual(CONTACT_LIMITS.subjectMax);
  });

  it("never contains a carriage return, line feed, U+2028 or U+2029, even from a hostile message and a max-length name", () => {
    const subject = buildContactSubject({
      message: "line one\r\nBcc: evil@example.com",
      email: "jane@example.com",
      name: "a".repeat(100),
    });
    expect(subject).not.toMatch(new RegExp("[\\r\\n" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]"));
  });
});

describe("buildContactTextBody", () => {
  it("is exactly the pinned shape", () => {
    const body = buildContactTextBody({ message: "Hello there", email: "jane@example.com", name: "Jane Smith" });
    expect(body).toBe(
      [
        "Hello there",
        "",
        "--",
        "Name: Jane Smith",
        "Reply to: jane@example.com",
        "Sent from the Contact page on shaperassistant.com",
      ].join("\n"),
    );
  });

  it("says '(not given)' when there's no name", () => {
    const body = buildContactTextBody({ message: "Hello there", email: "jane@example.com", name: "" });
    expect(body).toContain("Name: (not given)");
  });
});

describe("buildSmtp2goRequest", () => {
  const message = { message: "Hello there", email: "jane@example.com", name: "Jane Smith" };

  it("has exactly the pinned keys, sorted: custom_headers, sender, subject, text_body, to", () => {
    const request = buildSmtp2goRequest(message);
    expect(Object.keys(request).sort()).toEqual(["custom_headers", "sender", "subject", "text_body", "to"]);
  });

  it("sender is CONTACT_SENDER and to is [CONTACT_RECIPIENT]", () => {
    const request = buildSmtp2goRequest(message);
    expect(request.sender).toBe(CONTACT_SENDER);
    expect(request.to).toEqual([CONTACT_RECIPIENT]);
  });

  it("custom_headers is exactly one Reply-To header with the checked email", () => {
    const request = buildSmtp2goRequest(message);
    expect(request.custom_headers).toEqual([{ header: "Reply-To", value: "jane@example.com" }]);
  });

  it("JSON.stringify of it contains no carriage return", () => {
    const request = buildSmtp2goRequest(message);
    expect(JSON.stringify(request)).not.toContain("\r");
  });
});

describe("contactPrefillFrom", () => {
  it("returns empty strings for a signed-out shaper", () => {
    expect(contactPrefillFrom(null)).toEqual({ name: "", email: "" });
  });

  it("trims and collapses a real Clerk user", () => {
    expect(contactPrefillFrom({ fullName: "  Kelly  Slater ", primaryEmail: " k@example.com " })).toEqual({
      name: "Kelly Slater",
      email: "k@example.com",
    });
  });

  it("cuts a 150-character name to 100", () => {
    const prefill = contactPrefillFrom({ fullName: "a".repeat(150), primaryEmail: "k@example.com" });
    expect(prefill.name).toBe("a".repeat(100));
  });

  it("drops a primary email that fails the pattern", () => {
    const prefill = contactPrefillFrom({ fullName: "Kelly Slater", primaryEmail: "not-an-email" });
    expect(prefill.email).toBe("");
  });

  it("drops a primary email over 254 characters", () => {
    const longEmail = `${"a".repeat(243)}@example.com`; // 255 chars, matches pattern otherwise
    expect(longEmail.length).toBe(255);
    const prefill = contactPrefillFrom({ fullName: "Kelly Slater", primaryEmail: longEmail });
    expect(prefill.email).toBe("");
  });
});

describe("initialContactFormState", () => {
  it("starts idle, empty errors, attempt 0, replyTo empty, and the prefill in values", () => {
    const state = initialContactFormState({ name: "Kelly Slater", email: "k@example.com" });
    expect(state).toEqual({
      status: "idle",
      errors: {},
      values: { message: "", email: "k@example.com", name: "Kelly Slater" },
      replyTo: "",
      attempt: 0,
    });
  });
});

describe("CONTACT_EMAIL_PATTERN", () => {
  it("is exported and usable directly", () => {
    expect(CONTACT_EMAIL_PATTERN.test("jane@example.com")).toBe(true);
  });
});
