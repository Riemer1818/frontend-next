// Direct test of Supabase query
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function test() {
  console.log('Testing getAll query...');
  const { data: allData, error: allError } = await supabase
    .from('backoffice_time_entries')
    .select('*')
    .order('date', { ascending: false });

  console.log('getAll result:', { count: allData?.length, error: allError?.message });

  console.log('\nTesting getByDateRange query...');
  const { data: rangeData, error: rangeError } = await supabase
    .from('backoffice_time_entries')
    .select(`
      *,
      projects:project_id(id, name, client_id, companies:client_id(id, name)),
      contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
    `)
    .gte('date', '2026-04-01')
    .lte('date', '2026-04-30')
    .order('date', { ascending: false });

  console.log('getByDateRange result:', { count: rangeData?.length, error: rangeError?.message });

  if (rangeData && rangeData.length > 0) {
    console.log('\nFirst entry:', rangeData[0]);
  }
}

test().catch(console.error);
