import { getCurrentRestaurantContext } from "../../../../../features/tenants";
import { RestaurantThemeEditor } from "./restaurant-theme-editor";

export default async function DashboardSettingsThemePage() {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  return (
    <section className="space-y-4">
      <RestaurantThemeEditor restaurant={context.restaurant} />
    </section>
  );
}
