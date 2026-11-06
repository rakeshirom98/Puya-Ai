import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "@fontsource/noto-sans-meetei-mayek/meetei-mayek-400.css";
import "./globals.css";

const authLocalization = {
  signIn: {
    start: {
      title: "Sign in to PUYA AI",
      titleCombined: "Sign in to PUYA AI",
    },
  },
  signUp: {
    start: {
      title: "Create your PUYA AI account",
      titleCombined: "Create your PUYA AI account",
    },
  },
};

export const metadata: Metadata = {
  title: "PUYA AI — Intelligence, Without Borders",
  description: "A thoughtful AI companion, with a focus on Manipuri (Meiteilon).",
  icons: { icon: "/puya-logo.png", apple: "/puya-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider localization={authLocalization}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}