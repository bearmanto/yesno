import "./globals.css";
import "@/styles/tokens.css";
import type { Metadata } from "next";
import ToastProvider from "@/components/toast/ToastProvider";
import BottomNav from "@/components/navigation/BottomNav";

export const metadata: Metadata = {
  title: "YesNo",
  description: "Simple, fast, Yes/No surveys.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <BottomNav />
      </body>
    </html>
  );
}
