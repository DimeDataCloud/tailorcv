import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Platform } from 'react-native';

/**
 * SEO — drop-in document-head manager for web crawlers.
 *
 * On native (iOS/Android) the Helmet tags are no-ops (react-helmet-async
 * renders nothing outside a browser DOM). On web this writes proper
 * <title>, <meta>, <link>, and JSON-LD <script> tags into <head> so
 * search engines and social scrapers see real metadata.
 *
 * Usage:
 *   <SEO title="..." description="..." path="/welcome" />
 *
 * `path` is the URL path (used to build canonical + OG URLs). The
 * origin is read from window.location.origin on web, falls back to
 * the production domain on native.
 */

const PROD_ORIGIN = 'https://tailorcv.app';

function origin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return PROD_ORIGIN;
}

export interface SEOProps {
  /** Page <title>. "TailorCV" is appended automatically. */
  title: string;
  /** Meta description (≤160 chars recommended). */
  description: string;
  /** URL path beginning with /. Used to build canonical + OG URLs. */
  path: string;
  /** Optional OG image path (default: /og-image.png). */
  image?: string;
  /** Optional JSON-LD structured data object (will be JSON.stringify'd). */
  jsonLd?: object;
  /** Optional additional keywords meta. */
  keywords?: string;
}

export function SEO({ title, description, path, image = '/og-image.png', jsonLd, keywords }: SEOProps) {
  const url = `${origin()}${path}`;
  const fullTitle = title.includes('TailorCV') ? title : `${title} | TailorCV`;
  const ogImage = image.startsWith('http') ? image : `${origin()}${image}`;
  return (
    <Helmet>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        body, html, #root, div, span, p, h1, h2, h3, h4, h5, h6, button, input, textarea, text {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        }
      `}</style>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <link rel="canonical" href={url} />
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="TailorCV" />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {/* Theme color matches brand blood orange */}
      <meta name="theme-color" content="#C8360B" />
      {/* JSON-LD structured data */}
      {jsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      ) : null}
    </Helmet>
  );
}

export default SEO;
