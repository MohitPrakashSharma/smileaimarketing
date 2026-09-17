/**
 * The public audit report is a product surface, not a marketing page: it keeps
 * Manrope for the body utilities (see `.ui-copy` in globals.css). `contents`
 * keeps the report a direct flex child of <body> for its min-h-screen layout.
 */
export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <div className="ui-copy contents">{children}</div>;
}
