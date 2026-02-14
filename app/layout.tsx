import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import Navbar from "@/components/Navbar";
import AccessibilityToolbar from "@/components/AccessibilityToolbar";
import { Toaster } from "@/components/ui/toaster";
import FontSizeWrapper from "@/components/FontSizeWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AccessLearn - Accessible Learning, Your Way",
  description:
    "An accessible learning tool with flashcards and quizzes, featuring voice control, eye tracking, and text-to-speech.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AccessibilityProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Navbar />
          <FontSizeWrapper>
            <main id="main-content" className="min-h-screen pb-24">
              {children}
            </main>
          </FontSizeWrapper>
          <AccessibilityToolbar />
          <Toaster />
        </AccessibilityProvider>
      </body>
    </html>
  );
}
