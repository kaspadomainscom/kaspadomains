// src/components/JsonLd.tsx

type JsonLdData = Record<string, unknown>;

interface JsonLdProps {
  data: JsonLdData;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      key="structured-data"
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
