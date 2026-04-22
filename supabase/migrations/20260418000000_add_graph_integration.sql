-- ============================================
-- GRAPH DATABASE INTEGRATION
-- Add tables to support ArangoDB sync and relationship management
-- Date: 2026-04-18
-- ============================================

-- ============================================
-- TABLE: backoffice_contact_relationships
-- Stores person-to-person relationships (synced to ArangoDB)
-- ============================================

CREATE TABLE IF NOT EXISTS backoffice_contact_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship participants (both must be contacts)
  from_contact_id UUID NOT NULL,
  to_contact_id UUID NOT NULL,

  -- Relationship metadata
  type TEXT NOT NULL CHECK (type IN (
    'colleague',
    'friend',
    'mentor',
    'mentee',
    'client',
    'investor',
    'partner',
    'acquaintance',
    'collaborator',
    'reports_to',
    'family',
    'other'
  )),

  -- Relationship strength (1 = weak, 5 = strong)
  strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 5),

  -- Additional context
  notes TEXT,
  since DATE,
  introduced_by_contact_id UUID, -- Who introduced them

  -- ArangoDB sync status
  synced_to_arango BOOLEAN DEFAULT FALSE,
  arango_edge_key TEXT UNIQUE, -- The _key from ArangoDB knows collection
  last_synced_at TIMESTAMPTZ,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_relationship CHECK (from_contact_id != to_contact_id),
  CONSTRAINT unique_relationship UNIQUE (from_contact_id, to_contact_id, type)
);

-- Indexes for performance
CREATE INDEX idx_contact_relationships_from ON backoffice_contact_relationships(from_contact_id);
CREATE INDEX idx_contact_relationships_to ON backoffice_contact_relationships(to_contact_id);
CREATE INDEX idx_contact_relationships_type ON backoffice_contact_relationships(type);
CREATE INDEX idx_contact_relationships_strength ON backoffice_contact_relationships(strength);
CREATE INDEX idx_contact_relationships_arango_sync ON backoffice_contact_relationships(synced_to_arango);
CREATE INDEX idx_contact_relationships_arango_key ON backoffice_contact_relationships(arango_edge_key);

-- ============================================
-- TABLE: backoffice_graph_sync_log
-- Tracks sync operations to ArangoDB
-- ============================================

CREATE TABLE IF NOT EXISTS backoffice_graph_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was synced
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'relationship')),
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),

  -- Sync result
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,

  -- ArangoDB reference
  arango_collection TEXT, -- persons, companies, knows
  arango_key TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_graph_sync_log_entity ON backoffice_graph_sync_log(entity_type, entity_id);
CREATE INDEX idx_graph_sync_log_status ON backoffice_graph_sync_log(status);
CREATE INDEX idx_graph_sync_log_created ON backoffice_graph_sync_log(created_at);

-- ============================================
-- TABLE: backoffice_graph_entity_mapping
-- Maps Supabase entities to ArangoDB nodes
-- ============================================

CREATE TABLE IF NOT EXISTS backoffice_graph_entity_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Supabase entity
  supabase_table TEXT NOT NULL CHECK (supabase_table IN ('backoffice_contacts', 'backoffice_companies')),
  supabase_id UUID NOT NULL,

  -- ArangoDB node
  arango_collection TEXT NOT NULL CHECK (arango_collection IN ('persons', 'companies')),
  arango_key TEXT NOT NULL,

  -- Sync metadata
  first_synced_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_count INTEGER DEFAULT 1,

  -- Constraints
  CONSTRAINT unique_supabase_entity UNIQUE (supabase_table, supabase_id),
  CONSTRAINT unique_arango_node UNIQUE (arango_collection, arango_key)
);

-- Indexes
CREATE INDEX idx_graph_mapping_supabase ON backoffice_graph_entity_mapping(supabase_table, supabase_id);
CREATE INDEX idx_graph_mapping_arango ON backoffice_graph_entity_mapping(arango_collection, arango_key);

-- ============================================
-- ADD GRAPH-RELATED FIELDS TO EXISTING TABLES
-- ============================================

-- Add graph sync fields to contacts table
ALTER TABLE backoffice_contacts
  ADD COLUMN IF NOT EXISTS synced_to_graph BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS graph_node_key TEXT,
  ADD COLUMN IF NOT EXISTS last_graph_sync_at TIMESTAMPTZ;

-- Add graph sync fields to companies table
ALTER TABLE backoffice_companies
  ADD COLUMN IF NOT EXISTS synced_to_graph BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS graph_node_key TEXT,
  ADD COLUMN IF NOT EXISTS last_graph_sync_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_graph_sync ON backoffice_contacts(synced_to_graph);
CREATE INDEX IF NOT EXISTS idx_contacts_graph_key ON backoffice_contacts(graph_node_key);
CREATE INDEX IF NOT EXISTS idx_companies_graph_sync ON backoffice_companies(synced_to_graph);
CREATE INDEX IF NOT EXISTS idx_companies_graph_key ON backoffice_companies(graph_node_key);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contact_relationships
DROP TRIGGER IF EXISTS update_contact_relationships_updated_at ON backoffice_contact_relationships;
CREATE TRIGGER update_contact_relationships_updated_at
  BEFORE UPDATE ON backoffice_contact_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE backoffice_contact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_graph_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_graph_entity_mapping ENABLE ROW LEVEL SECURITY;

-- Service role only (backend manages sync)
DROP POLICY IF EXISTS "Service role only" ON backoffice_contact_relationships;
CREATE POLICY "Service role only"
  ON backoffice_contact_relationships FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON backoffice_graph_sync_log;
CREATE POLICY "Service role only"
  ON backoffice_graph_sync_log FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON backoffice_graph_entity_mapping;
CREATE POLICY "Service role only"
  ON backoffice_graph_entity_mapping FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View: Contact network summary
CREATE OR REPLACE VIEW backoffice_contact_network_stats AS
SELECT
  c.id,
  c.first_name,
  c.last_name,
  COUNT(DISTINCT r1.id) as outbound_connections,
  COUNT(DISTINCT r2.id) as inbound_connections,
  COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as total_connections,
  ROUND(AVG(r1.strength)::numeric, 2) as avg_outbound_strength,
  ROUND(AVG(r2.strength)::numeric, 2) as avg_inbound_strength,
  COUNT(DISTINCT CASE WHEN r1.strength >= 4 THEN r1.id END) as strong_connections,
  c.synced_to_graph,
  c.last_graph_sync_at
FROM backoffice_contacts c
LEFT JOIN backoffice_contact_relationships r1 ON c.id = r1.from_contact_id
LEFT JOIN backoffice_contact_relationships r2 ON c.id = r2.to_contact_id
GROUP BY c.id, c.first_name, c.last_name, c.synced_to_graph, c.last_graph_sync_at;

-- View: Relationship types breakdown
CREATE OR REPLACE VIEW backoffice_relationship_type_stats AS
SELECT
  type,
  COUNT(*) as count,
  ROUND(AVG(strength)::numeric, 2) as avg_strength,
  COUNT(CASE WHEN synced_to_arango THEN 1 END) as synced_count,
  COUNT(CASE WHEN NOT synced_to_arango THEN 1 END) as pending_sync_count
FROM backoffice_contact_relationships
GROUP BY type
ORDER BY count DESC;

-- View: Graph sync health
CREATE OR REPLACE VIEW backoffice_graph_sync_health AS
SELECT
  entity_type,
  COUNT(*) as total_operations,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  ROUND(
    COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric /
    NULLIF(COUNT(*)::numeric, 0) * 100,
    2
  ) as success_rate,
  MAX(created_at) as last_sync_attempt
FROM backoffice_graph_sync_log
GROUP BY entity_type;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE backoffice_contact_relationships IS
  'Person-to-person relationships synced to ArangoDB graph database';

COMMENT ON TABLE backoffice_graph_sync_log IS
  'Audit log of all sync operations to ArangoDB';

COMMENT ON TABLE backoffice_graph_entity_mapping IS
  'Maps Supabase entities (contacts, companies) to ArangoDB nodes (persons, companies)';

COMMENT ON VIEW backoffice_contact_network_stats IS
  'Summary statistics of each contact''s network';

COMMENT ON VIEW backoffice_relationship_type_stats IS
  'Breakdown of relationships by type';

COMMENT ON VIEW backoffice_graph_sync_health IS
  'Health metrics for graph synchronization';

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to add sample relationships
/*
INSERT INTO backoffice_contact_relationships (from_contact_id, to_contact_id, type, strength, notes, since)
VALUES
  ('contact-uuid-1', 'contact-uuid-2', 'colleague', 5, 'Work together closely', '2020-01-15'),
  ('contact-uuid-1', 'contact-uuid-3', 'mentor', 4, 'Mentoring relationship', '2021-03-10'),
  ('contact-uuid-2', 'contact-uuid-3', 'friend', 3, 'Friends from college', '2015-09-01');
*/

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Graph integration migration complete!';
  RAISE NOTICE 'New tables: backoffice_contact_relationships, backoffice_graph_sync_log, backoffice_graph_entity_mapping';
  RAISE NOTICE 'New views: backoffice_contact_network_stats, backoffice_relationship_type_stats, backoffice_graph_sync_health';
  RAISE NOTICE 'Added graph sync fields to: backoffice_contacts, backoffice_companies';
END $$;
