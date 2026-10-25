import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "PreVisit | AI Patient Clinical Intake",
  description:
    "AI-powered adaptive patient intake that prepares clinical summaries for your doctor — secure, structured, and physician-ready.",
  keywords: ["clinical intake", "patient intake", "AI health", "medical assistant"],
  openGraph: {
    title: "PreVisit | AI Patient Clinical Intake",
    description: "AI-powered pre-visit intake that prepares your doctor before you arrive.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
