import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frps Web-UI",
  description: "A beautiful Anime style Web UI for Fast Reverse Proxy Server",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 
        利用 fixed 和 object-cover 实现全屏动态背景 
        z-[-1] 保证背景图在最底层
      */}
      <body className="min-h-full flex flex-col relative text-white">
        <div 
          className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: "url('https://t.alcy.cc/ycy')" }}
        >
          {/* 添加一层轻微的暗色遮罩，保证即使壁纸过亮，前台白色毛玻璃卡片也有可读性 */}
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        {children}
      </body>
    </html>
  );
}
