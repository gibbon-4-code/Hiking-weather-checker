import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weekend Summits: where to hike this weekend",
  description:
    "Summit forecasts for Snowdonia, the Lake District, the Brecon Beacons, the Cairngorms and the South Downs, with one recommendation for the weekend.",
};

export const viewport: Viewport = {
  themeColor: "#2f3b22",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
