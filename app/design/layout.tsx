import { SiteNav } from "@/components/site-nav";

/**
 * Nested layout for both /design/outline and /design/rails, so neither page has to know the
 * nav exists. Both editors size themselves with `flex-1` against a full-height parent (see
 * app/layout.tsx's `min-h-full flex flex-col` body), so this column has to pass that height
 * through rather than collapsing it.
 */
export default function DesignLayout(props: LayoutProps<"/design">) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteNav />
      {props.children}
    </div>
  );
}
