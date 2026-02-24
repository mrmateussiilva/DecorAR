import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DecorAR",
  description: "SaaS foundation for image-to-3D preview and future WebXR experiences."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
