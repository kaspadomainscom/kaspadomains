// src/types/db.ts
export interface Domain {
  id: string;               // UUID
  name: string;
  listed: boolean;
  price: number;
  seller_telegram: string | null;
  kaspa_link: string;
}
