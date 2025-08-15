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
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <BottomNav />
      </body>
    </html>
  );
}
