import "./globals.css";

export const metadata = {
  title: "Career Fair 2026 — Interview Manager",
  description: "Interview scheduling and management system for Career Fair 2026",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
