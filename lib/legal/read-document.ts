import { readFile } from "node:fs/promises";
import path from "node:path";
import { LEGAL_DOCUMENTS, type LegalSlug } from "./documents";

/**
 * Reads one of the founder's legal documents from disk, as UTF-8 text (quick 261006-fom, D-01).
 * Server-only by use: only `components/legal/legal-page.tsx`, a Server Component, imports it.
 *
 * The path comes ONLY from the fixed two-entry `LEGAL_DOCUMENTS` map, keyed by a typed slug that
 * the two page files hard-code — never from the address a visitor typed, a query or any other
 * value a visitor controls (T-261006-02), so nothing outside `content/legal/` can ever be read.
 *
 * On Vercel the files only exist beside the server code because `next.config.ts` names them under
 * `outputFileTracingIncludes` (T-261006-05).
 */
export async function readLegalDocument(slug: LegalSlug): Promise<string> {
  return readFile(path.join(process.cwd(), LEGAL_DOCUMENTS[slug].file), "utf8");
}
