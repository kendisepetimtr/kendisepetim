import { notFound } from "next/navigation";
import { MenuPreviewVariants } from "./menu-preview-variants";

export default function MenuUIPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6">
      <MenuPreviewVariants />
    </main>
  );
}
