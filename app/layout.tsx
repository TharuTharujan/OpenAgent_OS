import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenAgentOS Control Tower",
  description: "Human supervision surface for the OpenAgentOS Convex kernel.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
