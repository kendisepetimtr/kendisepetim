import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import OAuthErrorRecovery from "@/components/oauth-error-recovery";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kendisepetim.com"),
  icons: {
    icon: [{ url: "/ks-logo.png", type: "image/png" }],
    apple: [{ url: "/ks-logo.png", type: "image/png" }],
  },
  title: {
    default: "KendiSepetim | Restoran Yönetiminde Dijital Dönüşüm",
    template: "%s | KendiSepetim",
  },
  description:
    "QR menü, masa yönetimi, garson ve kurye panelleri ile restoranınızı tek platformdan yönetin. KendiSepetim ile verimliliği artırın.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} ${manrope.variable} scroll-smooth`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols Outlined is not exposed via next/font/google */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-background font-body text-on-background antialiased selection:bg-primary/20 selection:text-primary">
        <OAuthErrorRecovery />
        {children}
      </body>
    </html>
  );
}
