import { createClient } from '@supabase/supabase-js';
import { Database } from './src/types/supabase';

// Local Supabase (RLS now disabled)
const localSupabase = createClient<Database>(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Remote Supabase
const remoteSupabase = createClient<Database>(
  'https://gpldooeeojaodnzsdmgb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbGRvb2Vlb2phb2RuenNkbWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNzkzNiwiZXhwIjoyMDg5NDAzOTM2fQ.ByBKUwuZSA10dTfWNkzyf3NdH1aX9aXHU3w7WqvQoCw'
);

const tables = [
  'business_info',
  'companies',
  'contacts',
  'contact_associations',
  'projects',
  'time_entries',
  'time_entry_contacts',
  'invoices',
  'invoice_items',
  'invoice_time_entries',
  'invoice_attachments',
  'incoming_invoices',
  'receipts',
  'expense_categories',
  'emails',
  'email_attachments',
  'tax_rates',
  'tax_years',
  'tax_config',
  'tax_benefits',
  'tax_credits',
  'income_tax_brackets',
  'arbeidskorting_brackets',
  'user_tax_settings',
  'user_benefit_selections',
  'user_tax_credit_selections',
  'vat_payments'
];

async function syncTable(tableName: string) {
  console.log(`📦 Syncing ${tableName}...`);

  // Fetch all data from local
  const { data, error } = await localSupabase
    .from(tableName as any)
    .select('*');

  if (error) {
    console.error(`❌ Error fetching ${tableName}:`, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`⏭️  ${tableName}: No data to sync`);
    return;
  }

  console.log(`   Found ${data.length} rows`);

  // Insert into remote (upsert to handle conflicts)
  const { error: insertError } = await remoteSupabase
    .from(tableName as any)
    .upsert(data);

  if (insertError) {
    console.error(`❌ Error inserting ${tableName}:`, insertError);
    return;
  }

  console.log(`✅ ${tableName}: ${data.length} rows synced`);
}

async function main() {
  console.log('🔄 Starting data sync from local to remote Supabase...\n');

  for (const table of tables) {
    await syncTable(table);
  }

  console.log('\n✅ Data sync complete!');
  console.log('\n📦 Now syncing storage buckets...');

  // TODO: Sync storage buckets
}

main().catch(console.error);
