// Supabase Edge Function: Sync entities to ArangoDB
// Triggered by database webhooks on contact/company/relationship changes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

// Import shared types - Deno supports relative imports!
import type {
  SyncWebhookPayload as SyncPayload,
  ArangoPersonNode,
  ArangoCompanyNode,
  ArangoKnowsEdge,
  GraphEntityType,
} from '../../../lib/supabase/graph-types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization (webhook secret)
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    if (!authHeader || !webhookSecret) {
      console.error('Missing authorization header or webhook secret');
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providedSecret = authHeader.replace('Bearer ', '');
    if (providedSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload
    const payload: SyncPayload = await req.json();
    console.log(`📊 Sync request: ${payload.type} on ${payload.table}`);

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const arangoUrl = Deno.env.get('ARANGO_URL')!;
    const arangoUser = Deno.env.get('ARANGO_USER') || 'root';
    const arangoPassword = Deno.env.get('ARANGO_PASSWORD')!;
    const arangoDatabase = Deno.env.get('ARANGO_DATABASE') || 'crm';

    // Create Supabase client for logging
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Route to appropriate handler
    let result;
    if (payload.table === 'backoffice_contacts') {
      result = await syncContact(payload, {
        arangoUrl,
        arangoUser,
        arangoPassword,
        arangoDatabase,
      });
    } else if (payload.table === 'backoffice_companies') {
      result = await syncCompany(payload, {
        arangoUrl,
        arangoUser,
        arangoPassword,
        arangoDatabase,
      });
    } else if (payload.table === 'backoffice_contact_relationships') {
      result = await syncRelationship(payload, {
        arangoUrl,
        arangoUser,
        arangoPassword,
        arangoDatabase,
      });
    } else {
      throw new Error(`Unknown table: ${payload.table}`);
    }

    // Log sync operation
    await supabase.from('backoffice_graph_sync_log').insert({
      entity_type: getEntityType(payload.table),
      entity_id: payload.record.id,
      operation: payload.type.toLowerCase(),
      status: 'success',
      arango_collection: result.collection,
      arango_key: result.key,
    });

    console.log(`✅ Sync successful: ${result.collection}/${result.key}`);

    return new Response(
      JSON.stringify({
        success: true,
        collection: result.collection,
        key: result.key,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in sync-to-graph function:', error);

    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const payload = await req.json();
      await supabase.from('backoffice_graph_sync_log').insert({
        entity_type: getEntityType(payload.table),
        entity_id: payload.record?.id,
        operation: payload.type?.toLowerCase(),
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Sync contact to ArangoDB persons collection
 */
async function syncContact(
  payload: SyncPayload,
  config: { arangoUrl: string; arangoUser: string; arangoPassword: string; arangoDatabase: string }
): Promise<{ collection: string; key: string }> {
  const { record, type } = payload;

  if (type === 'DELETE') {
    // Delete person node
    await arangoRequest(
      config,
      'DELETE',
      `/_db/${config.arangoDatabase}/_api/document/persons/${record.id}`
    );
    return { collection: 'persons', key: record.id };
  }

  // Create/update person node
  const personNode: ArangoPersonNode = {
    _key: record.id,
    name: [record.first_name, record.last_name].filter(Boolean).join(' '),
    email: record.email || undefined,
    type: 'person',
    source: 'supabase',
    synced_at: new Date().toISOString(),
  };

  await arangoRequest(
    config,
    'PUT',
    `/_db/${config.arangoDatabase}/_api/document/persons/${record.id}`,
    personNode
  );

  // Update Supabase sync status
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase
    .from('backoffice_contacts')
    .update({
      synced_to_graph: true,
      graph_node_key: record.id,
      last_graph_sync_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  return { collection: 'persons', key: record.id };
}

/**
 * Sync company to ArangoDB companies collection
 */
async function syncCompany(
  payload: SyncPayload,
  config: { arangoUrl: string; arangoUser: string; arangoPassword: string; arangoDatabase: string }
): Promise<{ collection: string; key: string }> {
  const { record, type } = payload;

  if (type === 'DELETE') {
    await arangoRequest(
      config,
      'DELETE',
      `/_db/${config.arangoDatabase}/_api/document/companies/${record.id}`
    );
    return { collection: 'companies', key: record.id };
  }

  const companyNode: ArangoCompanyNode = {
    _key: record.id,
    name: record.name,
    domain: record.website || undefined,
    type: 'company',
    source: 'supabase',
    synced_at: new Date().toISOString(),
  };

  await arangoRequest(
    config,
    'PUT',
    `/_db/${config.arangoDatabase}/_api/document/companies/${record.id}`,
    companyNode
  );

  // Update Supabase sync status
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase
    .from('backoffice_companies')
    .update({
      synced_to_graph: true,
      graph_node_key: record.id,
      last_graph_sync_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  return { collection: 'companies', key: record.id };
}

/**
 * Sync relationship to ArangoDB knows collection
 */
async function syncRelationship(
  payload: SyncPayload,
  config: { arangoUrl: string; arangoUser: string; arangoPassword: string; arangoDatabase: string }
): Promise<{ collection: string; key: string }> {
  const { record, type } = payload;

  if (type === 'DELETE') {
    const key = record.arango_edge_key || record.id;
    await arangoRequest(
      config,
      'DELETE',
      `/_db/${config.arangoDatabase}/_api/document/knows/${key}`
    );
    return { collection: 'knows', key };
  }

  const edge: ArangoKnowsEdge = {
    _from: `persons/${record.from_contact_id}`,
    _to: `persons/${record.to_contact_id}`,
    type: record.type,
    strength: record.strength,
    cost: 1 / record.strength, // Lower cost = stronger relationship
    notes: record.notes || undefined,
    since: record.since || undefined,
    introduced_by: record.introduced_by_contact_id
      ? `persons/${record.introduced_by_contact_id}`
      : undefined,
  };

  // Use existing arango_edge_key if available, otherwise use record.id
  const key = record.arango_edge_key || record.id;

  const response = await arangoRequest(
    config,
    'PUT',
    `/_db/${config.arangoDatabase}/_api/document/knows/${key}`,
    edge
  );

  // Update Supabase with arango key
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase
    .from('backoffice_contact_relationships')
    .update({
      synced_to_arango: true,
      arango_edge_key: response._key,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  return { collection: 'knows', key: response._key };
}

/**
 * Make HTTP request to ArangoDB REST API
 */
async function arangoRequest(
  config: { arangoUrl: string; arangoUser: string; arangoPassword: string; arangoDatabase: string },
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const auth = btoa(`${config.arangoUser}:${config.arangoPassword}`);
  const url = `${config.arangoUrl}${path}`;

  console.log(`🔗 ArangoDB ${method} ${path}`);

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ArangoDB error: ${response.status} - ${error}`);
  }

  // DELETE returns 200 with no body sometimes
  if (method === 'DELETE' && response.status === 200) {
    return {};
  }

  return await response.json();
}

/**
 * Get entity type from table name
 */
function getEntityType(table: string): 'contact' | 'company' | 'relationship' {
  if (table === 'backoffice_contacts') return 'contact';
  if (table === 'backoffice_companies') return 'company';
  if (table === 'backoffice_contact_relationships') return 'relationship';
  throw new Error(`Unknown table: ${table}`);
}
