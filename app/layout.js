import "./globals.css";

export const metadata = {
  title: "MTC Brick",
  description: "Brick your iPhone with an NFC tag. Free, no app install.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="wrap">{children}</main>
        <footer className="footer">MTC Brick · built at UW–Madison</footer>
      </body>
    </html>
  );
}
