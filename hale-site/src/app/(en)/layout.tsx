import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3217"),
  title: "HALE — The Autumn Rail",
  description:
    "A clothing store on a hanging rail: drag the rail, take a piece off, turn it around, pick a size and add it to the bag. A SmartDuke Studio template.",
  alternates: { canonical: "/", languages: { en: "/", fr: "/fr", "x-default": "/" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
