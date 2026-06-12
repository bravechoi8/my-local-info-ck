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
  title: "리얼인포 | 생활 정보 · 혜택 · 지원금 총정리",
  description: "전국의 유용한 생활 정보, 정부 혜택, 축제 행사 및 지원금 소식을 매일 업데이트합니다.",
  openGraph: {
    title: "리얼인포 | 생활 정보 · 혜택 · 지원금 총정리",
    description: "전국의 유용한 생활 정보, 정부 혜택, 축제 행사 및 지원금 소식을 매일 업데이트합니다.",
    url: "https://real-infos.com",
    siteName: "리얼인포",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "리얼인포",
    "url": "https://real-infos.com",
    "description": "전국의 유용한 생활 정보, 정부 혜택, 축제 행사 및 지원금 소식"
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "홈",
        "item": "https://real-infos.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "블로그",
        "item": "https://real-infos.com/blog"
      }
    ]
  };

  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="naver-site-verification" content="1ea075990111c345276e4d99a10f073edb544f40" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        {process.env.NEXT_PUBLIC_ADSENSE_ID &&
          process.env.NEXT_PUBLIC_ADSENSE_ID !== "" &&
          process.env.NEXT_PUBLIC_ADSENSE_ID !== "나중에_입력" && (
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
              crossOrigin="anonymous"
            />
          )}
        {process.env.NEXT_PUBLIC_GA_ID &&
          process.env.NEXT_PUBLIC_GA_ID !== "" &&
          process.env.NEXT_PUBLIC_GA_ID !== "나중에_입력" && (
            <>
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                  `,
                }}
              />
            </>
          )}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
