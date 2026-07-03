import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { THEME_KEY, THEMES, DEFAULT_THEME, MODE_KEY, DEFAULT_MODE } from "@/lib/themes";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Cortex — your UET semester, in one place",
  description:
    "LMS marks, GPA & CGPA, Google Drive files, notes and schedules for UET students.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Theme is stored in a cookie so we can set data-theme during SSR — no
  // client script, no flash of the wrong accent.
  const jar = await cookies();
  const cookieTheme = jar.get(THEME_KEY)?.value;
  const theme = THEMES.some((t) => t.id === cookieTheme) ? cookieTheme : DEFAULT_THEME;
  const mode = jar.get(MODE_KEY)?.value === "dark" ? "dark" : DEFAULT_MODE;

  return (
    <html
      lang="en"
      data-theme={theme}
      data-mode={mode}
      className={`${bricolage.variable} ${instrument.variable} ${instrumentSerif.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="canvas-grain min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
