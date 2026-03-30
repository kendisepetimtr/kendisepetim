import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  showVisualTitle?: boolean;
};

export function PageShell({
  title,
  description,
  children,
  className,
  showVisualTitle = true,
}: PageShellProps) {
  return (
    <main className={cn("mx-auto max-w-5xl px-6 py-10", className)}>
      <h1 className={showVisualTitle ? "text-3xl font-semibold tracking-tight" : "sr-only"}>{title}</h1>
      {description && showVisualTitle ? (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      ) : null}
      {children ? <section className="mt-8">{children}</section> : null}
    </main>
  );
}
