import type { Metadata } from "next";
import { LegalPage, legalPageMetadata } from "@/components/legal/legal-page";

/**
 * The `/terms` page (quick 261006-fom, D-01). Every word lives in `content/legal/terms.md`, the
 * founder's own text, read at each visit — nothing is typed here. Open to a signed-out visitor
 * (D-01 of Phase 2, "no route gating"): `lib/auth/open-access.test.ts` has a case for this page.
 */
export async function generateMetadata(): Promise<Metadata> {
  return legalPageMetadata("terms");
}

export default function TermsPage() {
  return <LegalPage slug="terms" />;
}
