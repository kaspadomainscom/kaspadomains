// src/components/pages/domain/DomainTitleSection.tsx
export function DomainTitleSection({
  domainName,
  category,
}: {
  domainName: string;
  category: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{domainName}</h1>
      <p className="text-base md:text-lg text-gray-600">
        Premium KNS domain in <span className="font-medium">{category}</span>
      </p>
    </header>
  );
}
