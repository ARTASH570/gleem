import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Gleem Clinic",
  description: "Gleem Clinic - جليم كلينك لطب الأسنان",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        {/* بنطبّق الثيم المحفوظ (لو موجود) قبل ما المتصفح يرسم أي حاجة،
            عشان مايحصلش وميض شاشة بيضا لحظة قبل ما React يشتغل */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem("theme");
              if (t === "dark") document.documentElement.classList.add("dark");
            } catch (e) {}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
