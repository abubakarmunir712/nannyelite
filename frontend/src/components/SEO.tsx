import { Helmet } from "react-helmet-async";

const BASE_URL = "https://nannyelite.ch";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}

const SEO = ({
  title = "NannyElite – Trusted Childcare in Switzerland",
  description = "Find verified, pre-vetted nannies and caregivers in Switzerland. AI-powered matching, multilingual profiles, real reviews.",
  path = "/",
  image = "/images/hero.png",
  type = "website",
  noindex = false,
}: SEOProps) => {
  const url = `${BASE_URL}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${BASE_URL}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="NannyElite" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
};

export default SEO;