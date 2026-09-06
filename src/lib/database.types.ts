// src/lib/database.types.ts

/**
 * The shape of the Supabase schema, as TypeScript sees it.
 *
 * Hand-written to match `supabase/schema.sql` rather than generated, because
 * generation needs a live project and network access to the Supabase CLI --
 * neither of which is available in CI or to a contributor who has only cloned
 * the repo. The trade-off is that this file has to be updated alongside the SQL;
 * `npm run db:check` compares them against a live project and reports drift.
 *
 * The point of having it at all: every query in `supabaseSource.ts` used to hand
 * back `any`, so a renamed column produced `undefined` at runtime and a page
 * that rendered blanks instead of failing. With the client typed, that becomes a
 * compile error.
 *
 * Row / Insert / Update are separate on purpose: columns with defaults are
 * required when reading and optional when inserting.
 */

/** A Postgres `text`-typed numeric. Used where a uint256 overflows `bigint`. */
type Numeric = string;

export type Database = {
  public: {
    Tables: {
      payment_receipts: {
        Row: {
          tx_id: string;
          purpose: 'list-domain' | 'vote';
          payer: string;
          amount_sompi: Numeric;
          created_at: string;
        };
        Insert: {
          tx_id: string;
          purpose: 'list-domain' | 'vote';
          payer: string;
          amount_sompi: Numeric;
          created_at?: string;
        };
        Update: {
          tx_id?: string;
          purpose?: 'list-domain' | 'vote';
          payer?: string;
          amount_sompi?: Numeric;
          created_at?: string;
        };
        Relationships: [];
      };
      domains: {
        Row: {
          id: number;
          domain_hash: Numeric;
          name: string;
          owner: string;
          fee_paid: Numeric;
          is_active: boolean;
          submitted_by: string | null;
          ownership_verified: boolean;
          payment_tx_id: string | null;
          tx_hash: string | null;
          created_at: string;
          updated_at: string;
          profile_revision: number;
        };
        Insert: {
          id?: number;
          domain_hash: Numeric;
          name: string;
          owner: string;
          fee_paid?: Numeric;
          is_active?: boolean;
          submitted_by?: string | null;
          ownership_verified?: boolean;
          payment_tx_id?: string | null;
          tx_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          profile_revision?: number;
        };
        Update: {
          id?: number;
          domain_hash?: Numeric;
          name?: string;
          owner?: string;
          fee_paid?: Numeric;
          is_active?: boolean;
          submitted_by?: string | null;
          ownership_verified?: boolean;
          payment_tx_id?: string | null;
          tx_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          profile_revision?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: { key: string; title: string; is_allowed: boolean; sort_order: number };
        Insert: { key: string; title: string; is_allowed?: boolean; sort_order?: number };
        Update: { key?: string; title?: string; is_allowed?: boolean; sort_order?: number };
        Relationships: [];
      };
      domain_categories: {
        Row: { domain_id: number; category_key: string };
        Insert: { domain_id: number; category_key: string };
        Update: { domain_id?: number; category_key?: string };
        Relationships: [
          {
            foreignKeyName: 'domain_categories_domain_id_fkey';
            columns: ['domain_id'];
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'domain_categories_category_key_fkey';
            columns: ['category_key'];
            referencedRelation: 'categories';
            referencedColumns: ['key'];
          },
        ];
      };
      votes: {
        Row: {
          id: number;
          domain_id: number;
          voter: string;
          payment_tx_id: string | null;
          fee_paid: Numeric;
          tx_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          domain_id: number;
          voter: string;
          payment_tx_id?: string | null;
          fee_paid?: Numeric;
          tx_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          domain_id?: number;
          voter?: string;
          payment_tx_id?: string | null;
          fee_paid?: Numeric;
          tx_hash?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'votes_domain_id_fkey';
            columns: ['domain_id'];
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
        ];
      };
      domain_links: {
        Row: {
          id: number;
          domain_id: number;
          name: string;
          url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          domain_id: number;
          name: string;
          url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          domain_id?: number;
          name?: string;
          url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'domain_links_domain_id_fkey';
            columns: ['domain_id'];
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
        ];
      };
      /** Server-only, short-lived capabilities for bulk profile replacements. */
      profile_write_nonces: {
        Row: {
          nonce: string;
          domain_id: number;
          action: 'update-links' | 'update-categories';
          signer: string;
          profile_revision: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          nonce: string;
          domain_id: number;
          action: 'update-links' | 'update-categories';
          signer: string;
          profile_revision: number;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          nonce?: string;
          domain_id?: number;
          action?: 'update-links' | 'update-categories';
          signer?: string;
          profile_revision?: number;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_write_nonces_domain_id_fkey';
            columns: ['domain_id'];
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      domain_vote_counts: {
        Row: {
          domain_id: number | null;
          domain_hash: Numeric | null;
          name: string | null;
          votes: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      /**
       * Which migration has been applied. Called before a payment is requested
       * so a database that predates the atomic write functions is refused
       * *before* the wallet is asked, rather than at the write -- which is
       * after the money has gone.
       */
      kaspadomains_schema_version: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      /** Receipt + listing + categories, all-or-nothing. Returns the new id. */
      create_listing: {
        Args: {
          p_domain_hash: string;
          p_name: string;
          p_owner: string;
          p_submitted_by: string;
          p_fee_paid: string;
          p_payment_tx_id: string;
          p_payer: string;
          p_categories: string[];
        };
        Returns: number;
      };
      /** Receipt + vote, all-or-nothing. Returns the new vote count. */
      record_vote: {
        Args: {
          p_name: string;
          p_voter: string;
          p_fee_paid: string;
          p_payment_tx_id: string;
        };
        Returns: number;
      };
      replace_domain_categories: {
        Args: {
          p_name: string;
          p_categories: string[];
          p_nonce: string;
          p_expected_revision: number;
          p_signer: string;
        };
        Returns: number;
      };
      replace_domain_links: {
        Args: {
          p_name: string;
          p_links: { name: string; url: string }[];
          p_nonce: string;
          p_expected_revision: number;
          p_signer: string;
        };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** Convenience aliases, so callers don't spell out the full path each time. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];

/**
 * The migration this code requires.
 *
 * Compared against `kaspadomains_schema_version()` before any payment is taken.
 * Bump it in the same commit as the migration that raises it, or the check
 * passes against a database that is missing what the code needs.
 */
export const REQUIRED_SCHEMA_VERSION = 4;

/** Every table name, for the schema-drift check in `scripts/db-check.mjs`. */
export const TABLE_NAMES = [
  'payment_receipts',
  'domains',
  'categories',
  'domain_categories',
  'votes',
  'domain_links',
  'profile_write_nonces',
] as const;
