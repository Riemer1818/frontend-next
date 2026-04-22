-- ============================================
-- GRAPH SYNC WEBHOOKS
-- Database triggers to call sync-to-graph edge function
-- Date: 2026-04-18
-- ============================================

-- ============================================
-- FUNCTION: Call edge function via pg_net
-- ============================================

CREATE OR REPLACE FUNCTION notify_graph_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
  payload JSONB;
BEGIN
  -- Get webhook URL from environment or use default
  -- You'll set this in Supabase Dashboard -> Settings -> Secrets
  webhook_url := current_setting('app.settings.graph_webhook_url', true);
  webhook_secret := current_setting('app.settings.graph_webhook_secret', true);

  -- If not set, use default (replace with your actual URL)
  IF webhook_url IS NULL THEN
    webhook_url := 'https://your-project.supabase.co/functions/v1/sync-to-graph';
  END IF;

  -- Build payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  -- Call edge function via pg_net (Supabase's HTTP extension)
  PERFORM
    net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(webhook_secret, 'change-me')
      ),
      body := payload
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS: Call webhook on data changes
-- ============================================

-- Contact sync trigger
DROP TRIGGER IF EXISTS contact_sync_to_graph ON backoffice_contacts;
CREATE TRIGGER contact_sync_to_graph
  AFTER INSERT OR UPDATE OR DELETE ON backoffice_contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_graph_sync();

-- Company sync trigger
DROP TRIGGER IF EXISTS company_sync_to_graph ON backoffice_companies;
CREATE TRIGGER company_sync_to_graph
  AFTER INSERT OR UPDATE OR DELETE ON backoffice_companies
  FOR EACH ROW
  EXECUTE FUNCTION notify_graph_sync();

-- Relationship sync trigger
DROP TRIGGER IF EXISTS relationship_sync_to_graph ON backoffice_contact_relationships;
CREATE TRIGGER relationship_sync_to_graph
  AFTER INSERT OR UPDATE OR DELETE ON backoffice_contact_relationships
  FOR EACH ROW
  EXECUTE FUNCTION notify_graph_sync();

-- ============================================
-- HELPER: Manual sync function
-- ============================================

-- Function to manually trigger sync for a contact
CREATE OR REPLACE FUNCTION sync_contact_to_graph(contact_id UUID)
RETURNS VOID AS $$
DECLARE
  contact_record RECORD;
BEGIN
  SELECT * INTO contact_record FROM backoffice_contacts WHERE id = contact_id;

  IF contact_record IS NOT NULL THEN
    PERFORM notify_graph_sync();
  ELSE
    RAISE EXCEPTION 'Contact not found: %', contact_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually trigger sync for a company
CREATE OR REPLACE FUNCTION sync_company_to_graph(company_id UUID)
RETURNS VOID AS $$
DECLARE
  company_record RECORD;
BEGIN
  SELECT * INTO company_record FROM backoffice_companies WHERE id = company_id;

  IF company_record IS NOT NULL THEN
    PERFORM notify_graph_sync();
  ELSE
    RAISE EXCEPTION 'Company not found: %', company_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_graph_sync() IS
  'Trigger function that calls sync-to-graph edge function when data changes';

COMMENT ON FUNCTION sync_contact_to_graph(UUID) IS
  'Manually trigger sync for a specific contact to ArangoDB';

COMMENT ON FUNCTION sync_company_to_graph(UUID) IS
  'Manually trigger sync for a specific company to ArangoDB';

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Graph Sync Webhooks Migration Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Deploy edge function:';
  RAISE NOTICE '   cd supabase/functions';
  RAISE NOTICE '   supabase functions deploy sync-to-graph';
  RAISE NOTICE '';
  RAISE NOTICE '2. Set webhook URL in Supabase Dashboard:';
  RAISE NOTICE '   Settings -> Database -> Settings';
  RAISE NOTICE '   Add custom config:';
  RAISE NOTICE '   app.settings.graph_webhook_url = https://your-project.supabase.co/functions/v1/sync-to-graph';
  RAISE NOTICE '';
  RAISE NOTICE '3. Set webhook secret:';
  RAISE NOTICE '   Settings -> Edge Functions -> sync-to-graph';
  RAISE NOTICE '   Add secrets:';
  RAISE NOTICE '   - WEBHOOK_SECRET=<generate-random-string>';
  RAISE NOTICE '   - ARANGO_URL=http://your-scaleway-ip:8529';
  RAISE NOTICE '   - ARANGO_USER=root';
  RAISE NOTICE '   - ARANGO_PASSWORD=<your-password>';
  RAISE NOTICE '   - ARANGO_DATABASE=crm';
  RAISE NOTICE '';
  RAISE NOTICE '4. Test sync:';
  RAISE NOTICE '   INSERT INTO backoffice_contacts (first_name, email)';
  RAISE NOTICE '   VALUES (''Test'', ''test@example.com'');';
  RAISE NOTICE '';
  RAISE NOTICE '5. Check sync log:';
  RAISE NOTICE '   SELECT * FROM backoffice_graph_sync_log ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
