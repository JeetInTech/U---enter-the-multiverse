import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "U — enter the multiverse",
  description:
    "A digital sanctuary where souls become who they truly are — connected not by names or faces, but by energy.",
  applicationName: "U",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // installed on a phone this stops being a web page: no browser chrome, and the
  // status bar is drawn over the app rather than above it
  appleWebApp: {
    title: "U",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#04040a",
  // the sky should run under the notch and the home indicator, not stop at them;
  // globals.css pays that back as safe-area padding on everything you can touch
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // a double-tap zoom in the middle of a planet map is never what anyone meant
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
