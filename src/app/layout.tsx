import type { Metadata } from "next";
import { Poppins, Fredoka } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { ProposalBanner } from "@/components/ProposalBanner";
import { SetupGuard } from "@/components/SetupGuard";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Leon - Your Health Mascot",
  description: "A friendly health coach prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${fredoka.variable} antialiased bg-gray-100 flex justify-center items-center min-h-screen relative overflow-x-hidden`}
      >
        {/* Left Side Text */}
        <div className="hidden lg:block absolute left-[8%] top-1/2 -translate-y-1/2 pointer-events-none">
          <h1 className="text-[#39a62d] text-7xl font-bold font-fredoka whitespace-nowrap">
            This is Leon
          </h1>
        </div>

        {/* Right Side Image */}
        <div className="hidden lg:block absolute right-[5%] top-1/2 -translate-y-1/2 pointer-events-none">
          <Image 
            src="/images/len_thumbsup.png" 
            alt="Leon Thumbs Up" 
            width={450} 
            height={450} 
            className="object-contain"
          />
        </div>

        <Providers>
          <div className="w-[430px] h-[932px] bg-[#fffff0] relative overflow-hidden rounded-[20px] shadow-2xl z-10">
            <SetupGuard>
              <ProposalBanner />
              <main className="h-full overflow-y-auto pb-24">
                {children}
              </main>
              <Navbar />
            </SetupGuard>
          </div>
        </Providers>
      </body>
    </html>
  );
}
