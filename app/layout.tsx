import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { DealProvider } from "@/lib/deal-context";
import { AgentDisplayProvider } from "@/context/agent-display-context";
import { ThemeInitializer } from "@/components/theme-initializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "FM — Real Estate Operations",
  description: "Real estate team operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark h-full overflow-hidden">
      <body className="antialiased h-full overflow-hidden">
        <ClerkProvider>
          <ThemeInitializer />
          <DealProvider>
            <AgentDisplayProvider>
              {children}
              <Toaster />
            </AgentDisplayProvider>
          </DealProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
