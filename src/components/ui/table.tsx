import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

// ─── Table ────────────────────────────────────────────────────────────────────

export function Table({
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={["w-full", className].filter(Boolean).join(" ")}
        style={{ borderCollapse: "collapse", ...style }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

// ─── TableHeader ──────────────────────────────────────────────────────────────

export function TableHeader({
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={className}
      style={{ borderBottom: "1px solid var(--border)", ...style }}
      {...props}
    >
      {children}
    </thead>
  );
}

// ─── TableBody ────────────────────────────────────────────────────────────────

export function TableBody({
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} style={style} {...props}>
      {children}
    </tbody>
  );
}

// ─── TableFooter ─────────────────────────────────────────────────────────────

export function TableFooter({
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot className={className} style={style} {...props}>
      {children}
    </tfoot>
  );
}

// ─── TableRow ─────────────────────────────────────────────────────────────────

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  highlight?: boolean;
}

export function TableRow({
  highlight,
  className,
  style,
  children,
  ...props
}: TableRowProps) {
  return (
    <tr
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = highlight
          ? "var(--color-primary-10)"
          : "transparent";
      }}
      className={[
        "transition-colors",
        props.onClick && "cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: highlight ? "var(--color-primary-10)" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

// ─── TableHead ────────────────────────────────────────────────────────────────

export function TableHead({
  className,
  style,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={className}
      style={{
        padding: "10px 16px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...props}
    >
      {children}
    </th>
  );
}

// ─── TableCell ────────────────────────────────────────────────────────────────

interface TableCellProps
  extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> {
  muted?: boolean;
  align?: "left" | "center" | "right";
}

export function TableCell({
  muted,
  align = "left",
  className,
  style,
  children,
  ...props
}: TableCellProps) {
  return (
    <td
      className={className}
      style={{
        padding: "12px 16px",
        fontSize: 14,
        color: muted ? "var(--text-secondary)" : "var(--text-primary)",
        verticalAlign: "middle",
        textAlign: align,
        ...style,
      }}
      {...props}
    >
      {children}
    </td>
  );
}
