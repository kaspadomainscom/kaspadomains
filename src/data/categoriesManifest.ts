// src/data/categoriesManifest.ts
import { club100k } from "./categories/100kclub";
import { club10k } from "./categories/10kclub";
import { club999 } from "./categories/999club";
import { brandablesDomains } from "./categories/brandables";
import { businessDomains } from "./categories/business";
import { charactersDomains } from "./categories/characters";
import { finance } from "./categories/finance";
import { gamingDomains } from "./categories/gaming";
import { geoDomains } from "./categories/geo";
import { memeDomains } from "./categories/meme";
import { otherDomains } from "./categories/other";
import { realWordsDomains } from "./categories/realWords";
import { shortNamesDomains } from "./categories/short";
import { techDomains } from "./categories/tech";
import { trendingDomains } from "./categories/trending";
import { web3Domains } from "./categories/web3";
import { Domain } from "./types";

export const categoriesData: Record<
  string,
  {
    title: string;
    domains: Domain[];
  }
> = {
  "10kclub": {
    title: "10k club",
    domains: club10k,
  },
  "100kclub": {
    title: "100k club",
    domains: club100k,
  },
  "999club": {
    title: "999 club",
    domains: club999,
  },
  finance: {
    title: "Finance Domains",
    domains: finance,
  },
  gaming: {
    title: "Gaming Domains",
    domains: gamingDomains,
  },
  web3: {
    title: "Web 3 Domains",
    domains: web3Domains,
  },
  characters: {
    title: "Known Characters",
    domains: charactersDomains,
  },
  memes: {
    title: "Memes & Internet Culture",
    domains: memeDomains,
  },
  short: {
    title: "Short Names",
    domains: shortNamesDomains,
  },
  brandables: {
    title: "Brandables",
    domains: brandablesDomains,
  },
  "ai-tech": {
    title: "Ai & Tech",
    domains: techDomains,
  },
  "real-words": {
    title: "Real Words",
    domains: realWordsDomains,
  },
  business: {
    title: "Business",
    domains: businessDomains,
  },
  trending: {
    title: "Trending",
    domains: trendingDomains,
  },
  geo: {
    title: "Geo", // Countries, cities
    domains: geoDomains,
  },
  other: {
    title: "other", // Countries, cities
    domains: otherDomains,
  }
};
