/**
 * Database types generated from Supabase schema
 * You can generate this with: supabase gen types typescript --local > src/types/database.ts
 */

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: number;
          name: string;
          btw_number: string | null;
          kvk_number: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          country: string | null;
          email: string | null;
          phone: string | null;
          is_client: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      projects: {
        Row: {
          id: number;
          company_id: number;
          name: string;
          description: string | null;
          status: string;
          hourly_rate: number | null;
          estimated_hours: number | null;
          start_date: string | null;
          end_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      invoices: {
        Row: {
          id: number;
          company_id: number;
          project_id: number | null;
          invoice_number: string;
          date: string;
          due_date: string;
          status: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      expenses: {
        Row: {
          id: number;
          company_id: number | null;
          project_id: number | null;
          category_id: number | null;
          date: string;
          amount: number;
          description: string;
          notes: string | null;
          attachment_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      expense_categories: {
        Row: {
          id: number;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expense_categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['expense_categories']['Insert']>;
      };
      contacts: {
        Row: {
          id: number;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          role: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      contact_associations: {
        Row: {
          id: number;
          contact_id: number;
          company_id: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contact_associations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['contact_associations']['Insert']>;
      };
      time_entries: {
        Row: {
          id: number;
          project_id: number;
          date: string;
          hours: number;
          description: string;
          billable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['time_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['time_entries']['Insert']>;
      };
      emails: {
        Row: {
          id: number;
          message_id: string;
          subject: string;
          from_address: string;
          to_address: string;
          date: string;
          body_text: string | null;
          body_html: string | null;
          has_attachments: boolean;
          is_read: boolean;
          label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['emails']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['emails']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
