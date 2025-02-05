import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { Providers } from "@/providers";
const DepatureMono = localFont({
  src: "./fonts/DepartureMono-Regular.woff",
  variable: "--font-depature-mono",
  weight: "400",
});
export const metadata = {
  title: "Nixora AI",
  description: "Nixora AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${DepatureMono.className} antialiased`}>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
