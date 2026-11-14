import type { Metadata, Viewport } from "next";
import { Caveat, Frank_Ruhl_Libre, Fraunces, Hanken_Grotesk, Inter, Roboto_Flex } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Patient app face, matched to the reference screenshots' rounded grotesk.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

// Owner-facing pages (landing, preview, build screen): serif headlines + a flexible sans,
// chosen by the team on Sat Nov 14 to match the look they liked (both OFL, Google Fonts).
const frank = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
  display: "swap",
});

// Handwritten tag on the welcome gift.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Facet",
    template: "%s · Facet",
  },
  description:
    "A free AI face scan for med spa patients: see what a treatment could look like on your own face, book it, and get reminded when it's time to come back.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${hanken.variable} ${caveat.variable} ${frank.variable} ${robotoFlex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
