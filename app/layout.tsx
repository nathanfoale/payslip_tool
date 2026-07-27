import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title: "Payday Plan · Shift pay planner",
    description:
      "A responsive shift and payslip planning tool for estimating hours, premiums, deductions and take-home pay.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      url: origin,
      title: "Payday Plan",
      description: "Plan the roster. See the payday.",
      images: [
        {
          url: socialImage,
          width: 1732,
          height: 909,
          alt: "Payday Plan · Shift pay planner",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Payday Plan",
      description: "Plan the roster. See the payday.",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f3ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
