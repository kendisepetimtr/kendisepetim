"use client";

import { useEffect } from "react";

export function AutoPrintOnMount() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.print();
    }, 150);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
