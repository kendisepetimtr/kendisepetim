import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageShell({
  title,
  description,
  children,
  className,
}: PageShellProps) {
  return (
    <main className={cn("mx-auto max-w-5xl px-6 py-10", className)}>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      ) : null}
      {children ? <section className="mt-8">{children}</section> : null}
    </main>
  );
}
