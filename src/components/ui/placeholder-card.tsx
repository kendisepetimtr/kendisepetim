import type { ReactNode } from "react";

type PlaceholderCardProps = {
  label: string;
  children?: ReactNode;
};

export function PlaceholderCard({ label, children }: PlaceholderCardProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {children ? <div className="mt-2 text-sm text-gray-600">{children}</div> : null}
    </div>
  );
}
