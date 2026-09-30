"use server";

/**
 * Server Action for the Contact page's form (quick 260929-u1t). Follows `app/actions/units.ts`'s
 * file shape, but deliberately does NOT follow its ownership rule: `lib/db/ownership.test.ts`
 * enforces `await auth()` before any database call for the actions it names, and this one is not
 * among them on purpose — it never reads or writes anything in `user_preferences`, `models`, or
 * any other row a shaper owns. It reads only the untrusted `formData` a public visitor posts and
 * the server-only delivery switch, so there is no ownership boundary here to enforce.
 *
 * The one function below returns only `ContactFormState` — never the `ContactDelivery` object,
 * never the Resend key — so the client component this feeds can hold nothing more sensitive
 * than what the shaper themself just typed.
 */

import { resolveContactDeliveryForRequest } from "@/lib/contact-server";
import { readContactFields, type ContactFormState } from "@/lib/contact/message";
import { submitContact } from "@/lib/contact/delivery";

export async function sendContactMessage(
  previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  return submitContact({
    fields: readContactFields(formData),
    delivery: await resolveContactDeliveryForRequest(),
    previous,
  });
}
