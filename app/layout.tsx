import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ToastProvider from "@/components/toast/ToastProvider";
import ToastContainer from "@/components/toast/ToastContainer";

export const metadata: Metadata = {
  title: "Yes/No Survey",
  description: "Simple yes/no survey platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
          <BottomNav />
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
