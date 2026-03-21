import { Barlow, Barlow_Condensed, Public_Sans } from "next/font/google";

export const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["700"],
});
