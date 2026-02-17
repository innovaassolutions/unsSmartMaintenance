import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://novapredict.innovaas.co'),
  title: 'NovaPredict | AI-Powered Predictive Maintenance Platform',
  description:
    'Prevent equipment failures before they happen. Real-time IoT monitoring, AI-driven predictive analytics, and role-based dashboards for smarter manufacturing maintenance.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'NovaPredict | AI-Powered Predictive Maintenance Platform',
    description:
      'Prevent equipment failures before they happen. Real-time IoT monitoring, AI-driven predictive analytics, and role-based dashboards for smarter manufacturing maintenance.',
    url: 'https://novapredict.innovaas.co',
    siteName: 'NovaPredict',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaPredict | AI-Powered Predictive Maintenance Platform',
    description:
      'Prevent equipment failures before they happen. Real-time IoT monitoring, AI-driven predictive analytics, and role-based dashboards for smarter manufacturing maintenance.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'NovaPredict',
  url: 'https://novapredict.innovaas.co',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI-powered predictive maintenance platform using IoT sensors, MQTT, and machine learning to monitor equipment health, predict failures, and optimize maintenance schedules.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/OnlineOnly',
  },
  featureList: [
    'Real-time IoT machine monitoring',
    'AI-driven predictive analytics',
    'Role-based dashboards',
    'Predictive maintenance alerts',
    'Sensor data analytics',
    'Pipeline health monitoring',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <Script
        id="reb2b-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html:
            '!function(key) {if (window.reb2b) return;window.reb2b = {loaded: true};var s = document.createElement("script");s.async = true;s.src = "https://ddwl4m2hdecbv.cloudfront.net/b/" + key + "/" + key + ".js.gz";document.getElementsByTagName("script")[0].parentNode.insertBefore(s, document.getElementsByTagName("script")[0]);}("GNLKQH7W8R6Q");',
        }}
      />
      <Script
        src="https://analytics.innovaas.co/script.js"
        data-website-id="WEBSITE_ID_FROM_UMAMI"
        strategy="afterInteractive"
      />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
