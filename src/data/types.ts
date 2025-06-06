// // src/data/types.ts

export interface Domain {
  name: string;
  listed?: boolean;
  price?: number;
  kaspaLink?: string;
  sellerTelegram?: string;
  sellerTwitter?: string;
  ownerBio?: string;
  linkedWebsite?: string; // ← add this
};