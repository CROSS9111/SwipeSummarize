import { createBrowserClient } from "@supabase/ssr";
import { UrlRecord, SavedRecord } from "@/types";

export type Database = {
  public: {
    Tables: {
      urls: {
        Row: UrlRecord;
        Insert: Omit<UrlRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UrlRecord, "id" | "created_at" | "updated_at">>;
      };
      saved: {
        Row: SavedRecord;
        Insert: Omit<SavedRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SavedRecord, "id" | "created_at" | "updated_at">>;
      };
    };
  };
};

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}