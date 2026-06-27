import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Google Calendar Clone",
  description: "A high-fidelity Google Calendar clone with Month, Week, and Day views",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Apply theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try {
    var t = localStorage.getItem('cal-theme') || 'system';
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
        ` }} />
      </head>
      <body className={`${inter.className} h-full w-full flex flex-col m-0 p-0 overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
