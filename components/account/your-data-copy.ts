import { CONTACT_ADDRESS } from "@/lib/contact/message";

/**
 * Every word on the Your data page in Clerk's account panel (quick 261006-g4u, 2026-10-06, D-06),
 * in sentence case like the panel around it. The support address is the Contact page's own, never
 * retyped here.
 */
export const YOUR_DATA_COPY = Object.freeze({
  pageLabel: "Your data",
  heading: "Your data",
  intro: "Everything Shaper Assistant keeps for your account: your saved boards and your App Default Settings.",
  export: Object.freeze({
    title: "Export my designs",
    body:
      "Download every saved board and your settings as one file, exactly as the app stores them " +
      "(in millimetres, whichever units you view in). Keep it as your own copy.",
    button: "Export my designs",
    busy: "Preparing your file…",
    done: (fileName: string, boardCount: number) =>
      `Downloaded ${fileName}: ${boardCount} saved ${boardCount === 1 ? "board" : "boards"}.`,
    doneNone: (fileName: string) =>
      `Downloaded ${fileName}. You have no saved boards yet, so it holds your settings only.`,
    signedOut: "You've been signed out. Sign in again to export your designs.",
    failed: `Couldn't export your designs. Try again, or email ${CONTACT_ADDRESS}.`,
  }),
});
