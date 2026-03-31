"use client";

import { useState, useTransition } from "react";
import { markOrderPreparing } from "../../../../features/orders";

type PrepareAndPrintButtonProps = {
  orderId: string;
  className?: string;
};

export function PrepareAndPrintButton({ orderId, className }: PrepareAndPrintButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await markOrderPreparing(orderId);
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.src = `/dashboard/orders/${orderId}/fis`;
        document.body.appendChild(iframe);
        window.setTimeout(() => {
          iframe.remove();
        }, 60000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Yazdırma başlatılamadı.");
      }
    });
  };

  return (
    <>
      <button type="button" onClick={handleClick} disabled={pending} className={className}>
        {pending ? "Hazırlanıyor..." : "Hazırla & Yazdır"}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </>
  );
}
