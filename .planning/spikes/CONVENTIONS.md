# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the question requires otherwise.

## Stack
- Geometry questions run the app's OWN code: a scratch `.mts` script (ES module, so top-level `await import()` works),
  importing `lib/...` by absolute path, run from the repo root with
  `npx --no-install tsx --tsconfig ./tsconfig.json <script>`.
- Pictures: a small HTML page drawn from the script's JSON, captured with headless Playwright from the repo's own
  install (`require('/Users/kontoes/Code/shaper/node_modules/playwright')`). The Browser pane can't screenshot a
  local file.

## Structure
- `.planning/spikes/NNN-name/README.md` plus evidence files (text, PNG).
- Scratch `.ts`, `.mts` and `.cjs` files never sit loose under `.planning`: TypeScript and lint read them. They go into
  the spike's `spike-source.tar.gz`.

## Patterns
- Untrusted documents (catalogue PDFs, downloaded sheets) are copied into their own empty scratch folder. Scripts live
  in a different folder, and Python runs with `-I`.
- PDF reading recipe:
  - pypdf text first;
  - PDFKit (`swiftc`) to render pages;
  - Mac Vision text recognition (`swiftc`) for image-only pages and web table images;
  - by-eye checks of the tables that matter.
- Quote the makers in short phrases only. Copy factual listings verbatim into evidence files, with their source URL.

## Tools & Libraries
- pypdf from the user site-packages (`sys.path.append('/Users/kontoes/Library/Python/3.9/lib/python/site-packages')`).
- `tsx` and `playwright` from the main checkout's `node_modules`.
