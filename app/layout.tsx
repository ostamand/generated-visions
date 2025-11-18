import type { Metadata } from "next";
import { Oxanium } from "next/font/google";
import "./globals.css";
import { Header } from "./components/Header";
import { FilterProvider } from "./contexts/FilterContext";
import styles from "./layout.module.scss";
import BackToTop from "./components/BackToTop";
import ScrollLock from "./components/ScrollLock";
import FloatingActionsBar from "./components/FloatingActionsBar";
import { DemoProvider } from "./contexts/DemoContext";
import { Toaster } from "@/components/ui/sonner";

const oxaniumSans = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Generated Visions",
  description:
    "An immersive local-first gallery optimized for images generated with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${oxaniumSans.variable} ${styles.body} dark`}>
        <DemoProvider>
          <FilterProvider>
            <ScrollLock />
            <Header />
            <main className={styles.mainContentArea}>{children}</main>
            <BackToTop />
            <FloatingActionsBar />
          </FilterProvider>
        </DemoProvider>
        <Toaster />
      </body>
    </html>
  );
}
