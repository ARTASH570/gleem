"use client";

import { useState } from "react";

export default function InvoiceActions({ invoiceNumber }: { invoiceNumber: number }) {
  const [loading, setLoading] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    setLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const element = document.getElementById("invoice-print-area");
      if (!element) return;

      // بنحدد الأبعاد الكاملة للعنصر صراحةً (scrollWidth/scrollHeight) بدل
      // ما نسيب html2canvas يعتمد على حجم الشاشة الظاهر بس — ده كان سبب
      // قص الفاتورة (أي حاجة تحت حافة الشاشة وقت اللقطة كانت بتتقص)
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`فاتورة-${invoiceNumber}.pdf`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button onClick={handlePrint} className="btn-secondary text-sm">
        🖨️ طباعة
      </button>
      <button onClick={handleDownloadPdf} disabled={loading} className="btn-secondary text-sm">
        {loading ? "جاري التحميل..." : "⬇️ تحميل PDF"}
      </button>
    </div>
  );
}
