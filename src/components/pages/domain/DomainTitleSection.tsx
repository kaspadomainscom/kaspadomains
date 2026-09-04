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
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{domainName}</h1>
      <p className="text-base md:text-lg text-gray-400">
        Premium KNS domain in <span className="font-medium text-kaspaMint">{category}</span>
      </p>
    </header>
  );
}
