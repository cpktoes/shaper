import type { Metadata } from "next";
import { LegalPage, legalPageMetadata } from "@/components/legal/legal-page";

/**
 * The `/privacy` page (quick 260930-03d, Phase 13 item 11; rebuilt in quick 261006-fom, D-01).
 * Every word now lives in `content/legal/privacy.md`, the founder's own Privacy Policy, read at
 * each visit — nothing is typed here, and the old hand-typed page's words are retired. Open to a
 * signed-out visitor (D-01 of Phase 2, "no route gating"): `lib/auth/open-access.test.ts` has a
 * case for this page.
 */
export async function generateMetadata(): Promise<Metadata> {
  return legalPageMetadata("privacy");
}

export default function PrivacyPage() {
  return <LegalPage slug="privacy" />;
}
