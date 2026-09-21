import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizScanner — Business Opportunity Radar",
  description:
    "AI-powered Telegram bot that scans business forums, blogs, and communities to find new opportunities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">📡</span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                BizScanner
              </span>
            </a>
            <div className="flex gap-4 text-sm text-gray-400">
              <a href="/" className="hover:text-white transition">
                Dashboard
              </a>
              <a href="/opportunities" className="hover:text-white transition">
                Opportunities
              </a>
              <a href="/sources" className="hover:text-white transition">
                Sources
              </a>
              <a href="/digests" className="hover:text-white transition">
                Digests
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
