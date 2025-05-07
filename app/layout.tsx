// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Tacology Survey",
  description: "Customer feedback survey for Tacology Miami",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">

        {/* Main content */}
        <main className="flex-grow max-w-3xl mx-auto py-8 px-4">
          {children}
        </main>

        {/* Footer */}
        <footer>
          <div className="max-w-3xl mx-auto py-4 px-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Tacology. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
