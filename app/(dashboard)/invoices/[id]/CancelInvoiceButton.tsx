"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelInvoiceAction } from "../actions";

export default function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    if (
      !confirm(
        "متأكد إنك عاوز تلغي الفاتورة دي؟ هيترجع أي مخزون اتخصم بسببها، والإجراء ده مينفعش يترجع."
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelInvoiceAction(invoiceId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="print:hidden">
      {error && <p className="text-red-600 text-xs mb-1">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="text-red-500 hover:underline text-sm disabled:opacity-50"
      >
        {isPending ? "جاري الإلغاء..." : "✕ إلغاء الفاتورة"}
      </button>
    </div>
  );
}
