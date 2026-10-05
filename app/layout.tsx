import type { Metadata } from "next";
import { Courier_Prime, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { UserProvider } from "@/components/user-provider";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Arcade Vault · Portal Retro", template: "%s · Arcade Vault" },
  description: "Juega clásicos arcade y compite por el puntaje más alto.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <UserProvider initialUser={user}>
            <Nav />
            <main className="av-main">{children}</main>
            <Footer />
          </UserProvider>
        </div>
      </body>
    </html>
  );
}
