"use client";

import { getMenuLocale, subscribeMenuLocale, t, type MenuLocale } from "@/lib/menu-i18n";
import { useEffect, useState } from "react";

export function useMenuLocale(): MenuLocale {
  const [locale, setLocale] = useState<MenuLocale>("tr");
  useEffect(() => {
    const read = () => setLocale(getMenuLocale());
    read();
    return subscribeMenuLocale(read);
  }, []);
  return locale;
}

export function useMenuT() {
  const locale = useMenuLocale();
  return { locale, t: (key: Parameters<typeof t>[0]) => t(key, locale) };
}
