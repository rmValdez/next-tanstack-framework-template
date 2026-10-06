import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Attendance",
  description: "Attendance: signed in through accounts over OpenID Connect",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100 antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster position="top-right" theme="dark" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
