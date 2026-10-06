import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * One of the founder's legal documents, drawn from its markdown in the app's own type and colours
 * (quick 261006-fom, D-01 with P-1 and P-2). No "use client": this runs inside the legal pages'
 * Server Component, so the markdown renderer never reaches the browser.
 *
 * `react-markdown` turns the text into React elements — text is escaped by React like any other,
 * no HTML string is ever injected, and raw HTML typed into the file is shown as plain text rather
 * than rendered, because no `rehype-raw` plugin is added (T-261006-01). Its default address check
 * stays in place, so a `javascript:` link (or any other unsafe address) is dropped. `remark-gfm`
 * draws the privacy table and turns a plain email address into a mailto link.
 *
 * Every element gets the classes the hand-typed privacy page used to carry (theme tokens only,
 * never a hex colour, never an inline style), so a heading, list or link the founder adds later
 * reads like the rest of the app with no code change.
 *
 * P-2: markdown joins consecutive lines into one paragraph, which would run the founder's
 * "**Shaper Assistant** (shaperassistant.com)" and "Effective date: …" lines together, and the
 * three-line address under each "Contact" section. Paragraphs carry `whitespace-pre-line`, so a
 * single line break in the file shows as a line break on the page.
 */

const HEADING =
  "text-3xl max-shell:text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-extrabold";

const SECTION = "mt-10 max-shell:mt-8 text-xs font-bold tracking-architectural uppercase text-surf-ink";

const SUB_SECTION = "mt-6 text-xs font-bold tracking-architectural uppercase text-surf-ink";

const PARAGRAPH = "mt-3 text-sm leading-relaxed text-surf-ink whitespace-pre-line";

const LIST = "mt-3 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-surf-ink marker:text-surf-ink-muted";

const LINK = "font-bold text-surf-accent-ink underline-offset-4 hover:underline focus-ring-accent";

/** Only a web address opens in a new tab; a mailto link (the plain email addresses) stays put. */
function isWebAddress(href: string | undefined): boolean {
  return typeof href === "string" && /^https?:\/\//i.test(href);
}

const COMPONENTS: Components = {
  h1: ({ children }) => <h1 className={HEADING}>{children}</h1>,
  h2: ({ children }) => <h2 className={SECTION}>{children}</h2>,
  h3: ({ children }) => <h3 className={SUB_SECTION}>{children}</h3>,
  p: ({ children }) => <p className={PARAGRAPH}>{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className={`${LIST} list-disc`}>{children}</ul>,
  ol: ({ children, start }) => (
    <ol start={start} className={`${LIST} list-decimal`}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) =>
    isWebAddress(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
        {children}
      </a>
    ) : (
      <a href={href} className={LINK}>
        {children}
      </a>
    ),
  // The table scrolls sideways inside its own box, so the page itself never scrolls sideways on a
  // phone however long a cell's words are.
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th
      scope="col"
      className="border-b border-surf-line py-2 pr-4 text-left align-bottom text-xs font-bold tracking-architectural uppercase text-surf-ink"
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-surf-line-faint py-2 pr-4 text-left align-top leading-relaxed text-surf-ink">
      {children}
    </td>
  ),
  hr: () => <hr className="mt-8 border-surf-line-faint" />,
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-surf-line pl-4 text-surf-ink-muted">{children}</blockquote>
  ),
  code: ({ children }) => <code className="font-mono text-[0.9em]">{children}</code>,
};

export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <article data-legal-document>
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {markdown}
      </Markdown>
    </article>
  );
}
