export interface ExtractedPageData {
  url: string;
  statusCode: number;
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robotsDirectives: {
    noindex: boolean;
    nofollow: boolean;
    raw?: string;
  };
  headings: {
    h1: string[];
    h2: string[];
  };
  internalLinks: string[];
  externalLinks: string[];
  jsonLdSchemas: any[];
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  textSample: string;
  schemaErrors?: string[];
  canonicalErrors?: string[];
}

export interface SchemaValidationResult {
  isValid: boolean;
  type: string;
  missingRequiredFields: string[];
  errors: string[];
  raw: any;
}

export interface LlmsTxtData {
  exists: boolean;
  isValid: boolean;
  title?: string;
  summary?: string;
  sections: {
    title: string;
    links: { title: string; url: string; description?: string }[];
  }[];
  referencedPaths: string[];
  errors: string[];
}
