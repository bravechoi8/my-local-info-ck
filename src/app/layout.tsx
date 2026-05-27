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
  title: "용인시 생활 정보 | 행사·혜택·지원금 안내",
  description: "용인시 주민을 위한 지역 행사, 축제, 지원금, 혜택 정보를 매일 업데이트합니다.",
  openGraph: {
    title: "용인시 생활 정보 | 행사·혜택·지원금 안내",
    description: "용인시 주민을 위한 지역 행사, 축제, 지원금, 혜택 정보를 매일 업데이트합니다.",
    url: "https://real-infos.com",
    siteName: "용인시 생활 정보",
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
    "name": "용인시 생활 정보",
    "url": "https://real-infos.com",
    "description": "용인시 주민을 위한 지역 행사, 축제, 지원금, 혜택 정보"
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
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
