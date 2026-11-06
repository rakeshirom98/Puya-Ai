import Image from "next/image";
import type { ReactNode } from "react";

export const puyaAuthAppearance = {
  variables: {
    colorPrimary: "#7669d8",
    colorBackground: "#080808",
    colorText: "#f5f5f5",
    colorInputBackground: "#111111",
    colorInputText: "#f5f5f5",
    borderRadius: "0.75rem",
  },
  options: {
    logoLinkUrl: "/",
    privacyPageUrl: "/privacy-policy",
  },
  elements: {
    logoBox: "hidden",
  },
};

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <header className="auth-brand">
        <Image src="/puya-logo.png" alt="" width={42} height={42} priority />
      </header>
      {children}
    </main>
  );
}
