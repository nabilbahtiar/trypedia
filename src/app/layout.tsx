import { getVerifiedSessionUser } from "@/lib/auth-session";
import type { User } from "@/data/users";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import LoginModal from "@/components/LoginModal";
import NavigationLoader from "@/components/NavigationLoader";

export const metadata: Metadata = {
  title: "TryPedia - Marketplace Sewa ke Beli (Rent to Own) Pertama di Jember",
  description: "Platform marketplace jual beli barang bekas dengan konsep Rent to Own di Jember. Coba dulu sewa barangnya, biaya sewa langsung memotong harga beli!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser=await getVerifiedSessionUser();
  return (
    <html lang="id" data-scroll-behavior="smooth" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#F5F5F5] text-[#212121] font-sans">
        <AuthProvider initialUser={sessionUser as User|null}>
          <NavigationLoader />
          {children}
          <LoginModal />
        </AuthProvider>
      </body>
    </html>
  );
}
