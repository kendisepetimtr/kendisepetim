import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import { getCurrentRestaurantContext } from "../../../../features/tenants";
import { OnboardingRestaurantClient } from "./onboarding-restaurant-client";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kendisepetim.com";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingRestaurantPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Devam etmek icin giris yapin."));
  }

  const restaurantContext = await getCurrentRestaurantContext();
  if (restaurantContext) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-[80vh] flex-col items-center px-6 py-12">
      <OnboardingRestaurantClient initialError={params.error} rootDomain={ROOT_DOMAIN} />
    </main>
  );
}
