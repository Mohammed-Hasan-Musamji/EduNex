import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LearnerProvider } from "@/components/learner/LearnerProvider";
import { ThemeProvider } from "@/contexts/theme-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduNex — Turns Learning Gaps into Personalized Growth",
  description:
    "EduNex is an AI-powered interactive learning platform that adapts lesson presentation to a learner's goals, preferences, and progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>
          <LearnerProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </LearnerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
