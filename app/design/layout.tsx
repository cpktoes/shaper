/**
 * Nested layout for every /design/* screen. Shared chrome now lives one level up, in the root
 * layout, so this file's only remaining job is the height-passthrough wrapper div below: it
 * carries the full-height flex sizing set up by the root layout's body down to the outline/rails/
 * fins/volume editors' own flex-1 panels. Dropping this div collapses those panels to content
 * height.
 */
export default function DesignLayout(props: LayoutProps<"/design">) {
  return <div className="flex min-h-0 flex-1 flex-col">{props.children}</div>;
}
