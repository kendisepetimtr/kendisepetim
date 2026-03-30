import { notFound } from "next/navigation";
import { DashboardPreviewVariants } from "./preview-variants";

export default function DashboardUIPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DashboardPreviewVariants />;
}
