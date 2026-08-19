import { SiteNav } from "@/components/site-nav";
import { DesignProvider } from "@/components/design/design-store";

/**
 * Nested layout for every /design/* screen, so none of them has to know the nav or the shared
 * design store exist. Both editors size themselves with `flex-1` against a full-height parent
 * (see app/layout.tsx's `min-h-full flex flex-col` body), so this column has to pass that height
 * through rather than collapsing it. `DesignProvider` mounts here once, above every screen, so
 * the outline, rails, fins and volume editors all read and write the same in-memory board design.
 */
export default function DesignLayout(props: LayoutProps<"/design">) {
  return (
    <DesignProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <SiteNav />
        {props.children}
      </div>
    </DesignProvider>
  );
}
