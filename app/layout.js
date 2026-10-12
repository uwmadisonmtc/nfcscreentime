import "./globals.css";

export const metadata = {
  title: "MTC Brick",
  description: "Brick your iPhone with an NFC tag.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <main className="wrap">{children}</main>
        <footer className="footer">MTC Brick · built at UW–Madison</footer>
      </body>
    </html>
  );
}
