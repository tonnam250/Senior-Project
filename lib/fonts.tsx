import { IBM_Plex_Sans_Thai, Noto_Serif_Thai } from "next/font/google";

export const sans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const serif = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  display: "swap",
});