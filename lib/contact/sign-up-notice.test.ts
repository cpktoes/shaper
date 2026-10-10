import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { RESEND_SEND_URL } from "./delivery";
import { CONTACT_LIMITS, CONTACT_RECIPIENT, CONTACT_SENDER } from "./message";
import {
  SIGN_UP_NOTICE_COPY,
  SIGN_UP_NOTICE_TIME_ZONE,
  buildSignUpNotice,
  describeSignUp,
  formatSignUpTime,
  notifyFounderOfSignUp,
  signUpMethod,
  type SignUpUser,
} from "./sign-up-notice";

/**
 * Quick 261010-j2f, Task 2: every way a shaper can arrive reads right, odd accounts never break the
 * note, nothing but the four facts reaches the founder's inbox, and a skipped note never touches
 * the network. The three Pacific-time strings are the values measured at plan time on Node 24
 * (Intl.DateTimeFormat formatToParts, America/Los_Angeles) — pinned here as literals, never
 * re-derived from Intl inside the test.
 */

const USER_ID = "user_test_2abc";
const IMAGE_URL = "https://img.clerk.com/example-picture";
const IP_ADDRESS = "203.0.113.9";
const USER_AGENT = "TestBrowser/9.9";
const CREATED_SUMMER = Date.UTC(2026, 9, 10, 21, 15);
const CREATED_WINTER = Date.UTC(2026, 11, 1, 20, 0);
const CREATED_DAY_ROLL = Date.UTC(2026, 9, 10, 7, 5);

function googleUser(overrides: Record<string, unknown> = {}): SignUpUser {
  return {
    id: USER_ID,
    first_name: "Jane",
    last_name: "Shaper",
    primary_email_address_id: "idn_test_1",
    email_addresses: [
      {
        id: "idn_test_1",
        email_address: "jane@example.com",
        verification: { status: "verified", strategy: "from_oauth_google" },
        linked_to: [{ type: "oauth_google", id: "idn_test_2" }],
      },
    ],
    external_accounts: [{ provider: "oauth_google", verification: { strategy: "oauth_google" } }],
    password_enabled: false,
    image_url: IMAGE_URL,
    created_at: CREATED_SUMMER,
    // Fields the note must never read or print.
    client_ip: IP_ADDRESS,
    user_agent: USER_AGENT,
    ...overrides,
  } as unknown as SignUpUser;
}

function emailUser(strategy: string, passwordEnabled: boolean): SignUpUser {
  return {
    first_name: null,
    last_name: null,
    primary_email_address_id: "idn_a",
    email_addresses: [
      { id: "idn_a", email_address: "pat@example.com", verification: { strategy }, linked_to: [] },
    ],
    external_accounts: [],
    password_enabled: passwordEnabled,
    created_at: CREATED_SUMMER,
  };
}

describe("signUpMethod", () => {
  it("is Google via provider oauth_google", () => {
    expect(signUpMethod({ external_accounts: [{ provider: "oauth_google" }] })).toBe("Google");
  });

  it("is Google via provider 'google' alone", () => {
    expect(signUpMethod({ external_accounts: [{ provider: "google" }] })).toBe("Google");
  });

  it("is Google via the primary email's from_oauth_google alone", () => {
    expect(
      signUpMethod({
        primary_email_address_id: "e1",
        email_addresses: [{ id: "e1", email_address: "a@example.com", verification: { strategy: "from_oauth_google" } }],
      }),
    ).toBe("Google");
  });

  it("is Google via linked_to oauth_google alone", () => {
    expect(
      signUpMethod({
        primary_email_address_id: "e1",
        email_addresses: [{ id: "e1", email_address: "a@example.com", linked_to: [{ type: "oauth_google" }] }],
      }),
    ).toBe("Google");
  });

  it("names another sign-in service with the oauth_ prefix removed", () => {
    expect(signUpMethod({ external_accounts: [{ provider: "oauth_apple" }] })).toBe(
      "Another sign-in service (apple)",
    );
  });

  it("is 'Email and password' for email_code (and email_link) with a password", () => {
    expect(signUpMethod(emailUser("email_code", true))).toBe("Email and password");
    expect(signUpMethod(emailUser("email_link", true))).toBe("Email and password");
  });

  it("is 'Email code (no password)' for email_code with no password", () => {
    expect(signUpMethod(emailUser("email_code", false))).toBe("Email code (no password)");
  });

  it("reads an invitation, a dashboard-added account and an unknown strategy plainly", () => {
    expect(signUpMethod(emailUser("ticket", false))).toBe("An invitation");
    expect(signUpMethod(emailUser("admin", false))).toBe("Added by hand in Clerk's dashboard");
    expect(signUpMethod(emailUser("saml", false))).toBe("Other (saml)");
  });

  it("reads a from_oauth_ strategy for a non-Google provider as another sign-in service", () => {
    expect(signUpMethod(emailUser("from_oauth_github", false))).toBe("Another sign-in service (github)");
  });

  it("is plain 'Other' with no external accounts and no email", () => {
    expect(signUpMethod({})).toBe("Other");
    expect(signUpMethod({ email_addresses: [], external_accounts: [] })).toBe("Other");
  });

  it("cuts any echoed provider or strategy to one line of at most 40 characters", () => {
    const longProvider = `oauth_${"x".repeat(100)}\nnewline`;
    const label = signUpMethod({ external_accounts: [{ provider: longProvider }] });
    expect(label).not.toContain("\n");
    const echoed = label.slice(label.indexOf("(") + 1, label.lastIndexOf(")"));
    expect(echoed.length).toBeLessThanOrEqual(40);
    expect(echoed.length).toBeGreaterThan(0);

    const strategyLabel = signUpMethod(emailUser(`weird\tstrategy${"y".repeat(100)}`, false));
    expect(strategyLabel).not.toMatch(/[\n\t]/);
    const echoedStrategy = strategyLabel.slice(strategyLabel.indexOf("(") + 1, strategyLabel.lastIndexOf(")"));
    expect(echoedStrategy.length).toBeLessThanOrEqual(40);
  });
});

describe("describeSignUp", () => {
  it("picks the primary email when two addresses exist and the primary is the second", () => {
    const described = describeSignUp(
      {
        primary_email_address_id: "idn_two",
        email_addresses: [
          { id: "idn_one", email_address: "first@example.com" },
          { id: "idn_two", email_address: "second@example.com" },
        ],
      },
      CREATED_SUMMER,
    );
    expect(described.email).toBe("second@example.com");
  });

  it("falls back to the first address when no primary id matches, and to '' with none", () => {
    expect(
      describeSignUp({ primary_email_address_id: "idn_gone", email_addresses: [{ id: "x", email_address: "x@example.com" }] }, 0)
        .email,
    ).toBe("x@example.com");
    expect(describeSignUp({}, 0).email).toBe("");
  });

  it("gives the first name alone, and '' when there are no names", () => {
    expect(describeSignUp({ first_name: "Jane" }, 0).name).toBe("Jane");
    expect(describeSignUp({ first_name: null, last_name: "Shaper" }, 0).name).toBe("Shaper");
    expect(describeSignUp({}, 0).name).toBe("");
  });

  it("turns a name holding a line break and a tab into one line", () => {
    expect(describeSignUp({ first_name: "Jane\n", last_name: "\tShaper" }, 0).name).toBe("Jane Shaper");
  });

  it("cuts a 300-character name to 100", () => {
    expect(describeSignUp({ first_name: "a".repeat(300) }, 0).name).toHaveLength(CONTACT_LIMITS.nameMax);
  });
});

describe("formatSignUpTime", () => {
  it("reads Pacific time in summer (PDT)", () => {
    expect(formatSignUpTime(CREATED_SUMMER)).toBe("Saturday, October 10, 2026 at 2:15 PM PDT (Pacific time)");
  });

  it("reads Pacific time in winter (PST)", () => {
    expect(formatSignUpTime(CREATED_WINTER)).toBe("Tuesday, December 1, 2026 at 12:00 PM PST (Pacific time)");
  });

  it("reads just after midnight Pacific as 12:05 AM (07:05 UTC in summer)", () => {
    expect(formatSignUpTime(CREATED_DAY_ROLL)).toBe("Saturday, October 10, 2026 at 12:05 AM PDT (Pacific time)");
  });

  it("uses the given now when created_at is missing or zero", () => {
    expect(describeSignUp({ created_at: 0 }, CREATED_WINTER).when).toBe(
      "Tuesday, December 1, 2026 at 12:00 PM PST (Pacific time)",
    );
    expect(describeSignUp({}, CREATED_WINTER).when).toBe("Tuesday, December 1, 2026 at 12:00 PM PST (Pacific time)");
  });

  it("is pinned to the Pacific time zone", () => {
    expect(SIGN_UP_NOTICE_TIME_ZONE).toBe("America/Los_Angeles");
  });
});

describe("buildSignUpNotice", () => {
  it("builds the exact email for the Google fixture", () => {
    const body = buildSignUpNotice(googleUser(), 0);
    expect(body).toEqual({
      from: CONTACT_SENDER,
      to: [CONTACT_RECIPIENT],
      subject: "New Shaper Assistant sign-up: Jane Shaper",
      text: [
        "A new shaper just created an account on Shaper Assistant.",
        "",
        "Name: Jane Shaper",
        "Email: jane@example.com",
        "Signed up with: Google",
        "When: Saturday, October 10, 2026 at 2:15 PM PDT (Pacific time)",
        "",
        "--",
        "Sent automatically by shaperassistant.com when an account is created.",
      ].join("\n"),
      reply_to: "jane@example.com",
    });
    expect("html" in body).toBe(false);
  });

  it("falls back to the email in the subject when there is no name, and says so in the body", () => {
    const body = buildSignUpNotice(emailUser("email_code", true), 0);
    expect(body.subject).toBe("New Shaper Assistant sign-up: pat@example.com");
    expect(body.text).toContain("Name: (not given)");
    expect(body.text).toContain("Signed up with: Email and password");
  });

  it("falls back to a plain subject and '(none on the account)' with neither name nor email", () => {
    const body = buildSignUpNotice({ created_at: CREATED_SUMMER }, 0);
    expect(body.subject).toBe(
      `${SIGN_UP_NOTICE_COPY.subjectLead} an account with no name or email`,
    );
    expect(body.text).toContain("Email: (none on the account)");
    expect(body.reply_to).toBe(CONTACT_RECIPIENT);
  });

  it("keeps the subject on one line and at most 200 characters for a 300-character name", () => {
    const body = buildSignUpNotice(googleUser({ first_name: `Jane\r\nBcc: evil@example.com ${"z".repeat(300)}`, last_name: "" }), 0);
    expect(body.subject).not.toMatch(/[\r\n]/);
    expect(body.subject.length).toBeLessThanOrEqual(CONTACT_LIMITS.subjectMax);
  });

  it("never carries the user id, picture, IP address or browser anywhere in the email", () => {
    const body = buildSignUpNotice(googleUser(), 0);
    const everything = JSON.stringify(body);
    for (const needle of [USER_ID, IMAGE_URL, "img.clerk.com", IP_ADDRESS, USER_AGENT]) {
      expect(everything).not.toContain(needle);
    }
  });

  it("replies to support@ itself when the account's email is not a usable address", () => {
    const body = buildSignUpNotice(
      googleUser({
        email_addresses: [{ id: "idn_test_1", email_address: "not an email", verification: { strategy: "from_oauth_google" } }],
      }),
      0,
    );
    expect(body.reply_to).toBe(CONTACT_RECIPIENT);
  });
});

function fakeFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  return vi.fn().mockResolvedValue(response);
}

describe("notifyFounderOfSignUp", () => {
  const nowMs = CREATED_SUMMER;

  it("kind none is 'skipped' and fetch is never called", async () => {
    const fetchImpl = vi.fn();
    expect(await notifyFounderOfSignUp(googleUser(), { delivery: { kind: "none" }, nowMs, fetchImpl })).toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("stand-in sent is 'sent' and stand-in failed is 'failed', fetch never called", async () => {
    const fetchImpl = vi.fn();
    expect(
      await notifyFounderOfSignUp(googleUser(), { delivery: { kind: "stand-in", outcome: "sent" }, nowMs, fetchImpl }),
    ).toBe("sent");
    expect(
      await notifyFounderOfSignUp(googleUser(), { delivery: { kind: "stand-in", outcome: "failed" }, nowMs, fetchImpl }),
    ).toBe("failed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("resend with a 200 { id } is 'sent' with one fetch to the Resend address", async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200, json: async () => ({ id: "re_1" }) });
    const outcome = await notifyFounderOfSignUp(googleUser(), {
      delivery: { kind: "resend", apiKey: "re_test_key" },
      nowMs,
      fetchImpl,
    });
    expect(outcome).toBe("sent");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(RESEND_SEND_URL);
  });

  it("resend with a 500 is 'failed' and logs exactly one 'sign-up email did not send' line with status and errorName", async () => {
    const fetchImpl = fakeFetch({ ok: false, status: 500, json: async () => ({ name: "application_error", message: "jane@example.com" }) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await notifyFounderOfSignUp(googleUser(), {
      delivery: { kind: "resend", apiKey: "re_test_key" },
      nowMs,
      fetchImpl,
    });
    expect(outcome).toBe("failed");
    expect(spy).toHaveBeenCalledExactlyOnceWith("Shaper: sign-up email did not send", {
      status: 500,
      errorName: "application_error",
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("jane@example.com");
    spy.mockRestore();
  });

  it("a fetch that rejects is 'failed'", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await notifyFounderOfSignUp(googleUser(), {
      delivery: { kind: "resend", apiKey: "re_test_key" },
      nowMs,
      fetchImpl,
    });
    expect(outcome).toBe("failed");
    spy.mockRestore();
  });
});

describe("boundary: the sign-up notice keeps to what lib/contact/ allows", () => {
  it("imports nothing from react, next or @clerk/", () => {
    const source = readFileSync(new URL("./sign-up-notice.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from\s+["'](react|next|@clerk\/)/);
  });
});
