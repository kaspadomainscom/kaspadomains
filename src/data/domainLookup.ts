// src/data/domainLookup.ts
import { categoriesData } from "./categoriesManifest";
import { Domain } from "./types";

export function findDomainByName(name: string): Domain | undefined {
  for (const category of Object.values(categoriesData)) {
    const domain = category.domains.find((d) => d.name.toLowerCase() === name.toLowerCase());
    if (domain) return domain;
  }
  return undefined;
}
