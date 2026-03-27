export type RestaurantMemberRole = "owner" | "manager" | "staff";

export type RestaurantMember = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: RestaurantMemberRole;
  is_active: boolean;
  created_at: string;
};

export type UserRestaurantMembership = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: RestaurantMemberRole;
  is_active: boolean;
  created_at: string;
  restaurants: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    brand_color: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
};
