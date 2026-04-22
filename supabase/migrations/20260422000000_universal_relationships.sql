-- ============================================
-- UNIVERSAL RELATIONSHIPS TABLE
-- Replaces backoffice_contact_relationships with a polymorphic design
-- Supports relationships between any entities (contacts, companies, projects)
-- Date: 2026-04-22
-- ============================================

-- ============================================
-- TABLE: backoffice_relationships (NEW UNIVERSAL TABLE)
-- ============================================

CREATE TABLE IF NOT EXISTS backoffice_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic source entity
  from_type TEXT NOT NULL CHECK (from_type IN ('contact', 'company', 'project')),
  from_id UUID NOT NULL,

  -- Polymorphic target entity
  to_type TEXT NOT NULL CHECK (to_type IN ('contact', 'company', 'project')),
  to_id UUID NOT NULL,

  -- Relationship metadata
  type TEXT NOT NULL CHECK (type IN (
    -- Person-to-person relationships
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
    'former_colleague',

    -- Person-to-company relationships
    'works_at',
    'owns',
    'contractor_for',
    'advisor_to',
    'board_member_of',

    -- Company-to-company relationships
    'partner_of',
    'supplier_of',
    'client_of',
    'subsidiary_of',
    'competitor_of',

    -- Project relationships
    'works_on',
    'manages_project',
    'has_project',
    'sponsors',

    -- Generic
    'other'
  )),

  -- Relationship strength (1 = weak, 5 = strong)
  strength INTEGER CHECK (strength BETWEEN 1 AND 5),

  -- Additional context
  notes TEXT,
  since DATE,
  until DATE,
  introduced_by_type TEXT CHECK (introduced_by_type IN ('contact', 'company', 'project')),
  introduced_by_id UUID,

  -- ArangoDB sync status
  synced_to_graph BOOLEAN DEFAULT FALSE,
  graph_edge_key TEXT UNIQUE,
  last_synced_at TIMESTAMPTZ,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_relationship CHECK (
    NOT (from_type = to_type AND from_id = to_id)
  ),
  CONSTRAINT unique_typed_relationship UNIQUE (from_type, from_id, to_type, to_id, type)
);

-- Indexes for performance
CREATE INDEX idx_relationships_from ON backoffice_relationships(from_type, from_id);
CREATE INDEX idx_relationships_to ON backoffice_relationships(to_type, to_id);
CREATE INDEX idx_relationships_type ON backoffice_relationships(type);
CREATE INDEX idx_relationships_strength ON backoffice_relationships(strength);
CREATE INDEX idx_relationships_graph_sync ON backoffice_relationships(synced_to_graph);
CREATE INDEX idx_relationships_graph_key ON backoffice_relationships(graph_edge_key);
CREATE INDEX idx_relationships_dates ON backoffice_relationships(since, until);

-- ============================================
-- ADD PROJECTS TABLE GRAPH SYNC FIELDS
-- ============================================

ALTER TABLE backoffice_projects
  ADD COLUMN IF NOT EXISTS synced_to_graph BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS graph_node_key TEXT,
  ADD COLUMN IF NOT EXISTS last_graph_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_graph_sync ON backoffice_projects(synced_to_graph);
CREATE INDEX IF NOT EXISTS idx_projects_graph_key ON backoffice_projects(graph_node_key);

-- ============================================
-- MIGRATE DATA FROM OLD TABLE
-- ============================================

-- Migrate existing contact-to-contact relationships if old table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backoffice_contact_relationships') THEN
    INSERT INTO backoffice_relationships (
      id,
      from_type,
      from_id,
      to_type,
      to_id,
      type,
      strength,
      notes,
      since,
      introduced_by_type,
      introduced_by_id,
      synced_to_graph,
      graph_edge_key,
      last_synced_at,
      created_by,
      created_at,
      updated_at
    )
    SELECT
      id,
      'contact' as from_type,
      from_contact_id as from_id,
      'contact' as to_type,
      to_contact_id as to_id,
      type,
      strength,
      notes,
      since,
      CASE WHEN introduced_by_contact_id IS NOT NULL THEN 'contact' ELSE NULL END as introduced_by_type,
      introduced_by_contact_id as introduced_by_id,
      synced_to_arango as synced_to_graph,
      arango_edge_key as graph_edge_key,
      last_synced_at,
      created_by,
      created_at,
      updated_at
    FROM backoffice_contact_relationships
    ON CONFLICT (from_type, from_id, to_type, to_id, type) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- POPULATE RELATIONSHIPS FROM EXISTING FOREIGN KEYS
-- ============================================

-- Create works_at relationships from contact.company_id
INSERT INTO backoffice_relationships (from_type, from_id, to_type, to_id, type, strength)
SELECT
  'contact',
  id::text::uuid,
  'company',
  company_id::text::uuid,
  'works_at',
  4 -- Default medium-high strength
FROM backoffice_contacts
WHERE company_id IS NOT NULL
ON CONFLICT (from_type, from_id, to_type, to_id, type) DO NOTHING;

-- Create has_project relationships from project.client_id
INSERT INTO backoffice_relationships (from_type, from_id, to_type, to_id, type, strength, since)
SELECT
  'company',
  client_id::text::uuid,
  'project',
  id::text::uuid,
  'has_project',
  5, -- Projects are strong relationships
  start_date
FROM backoffice_projects
WHERE client_id IS NOT NULL
ON CONFLICT (from_type, from_id, to_type, to_id, type) DO NOTHING;

-- ============================================
-- UPDATE GRAPH ENTITY MAPPING
-- ============================================

ALTER TABLE backoffice_graph_entity_mapping
  DROP CONSTRAINT IF EXISTS backoffice_graph_entity_mapping_supabase_table_check;

ALTER TABLE backoffice_graph_entity_mapping
  ADD CONSTRAINT backoffice_graph_entity_mapping_supabase_table_check
  CHECK (supabase_table IN ('backoffice_contacts', 'backoffice_companies', 'backoffice_projects'));

ALTER TABLE backoffice_graph_entity_mapping
  DROP CONSTRAINT IF EXISTS backoffice_graph_entity_mapping_arango_collection_check;

ALTER TABLE backoffice_graph_entity_mapping
  ADD CONSTRAINT backoffice_graph_entity_mapping_arango_collection_check
  CHECK (arango_collection IN ('persons', 'companies', 'projects'));

-- ============================================
-- UPDATE SYNC LOG
-- ============================================

ALTER TABLE backoffice_graph_sync_log
  DROP CONSTRAINT IF EXISTS backoffice_graph_sync_log_entity_type_check;

ALTER TABLE backoffice_graph_sync_log
  ADD CONSTRAINT backoffice_graph_sync_log_entity_type_check
  CHECK (entity_type IN ('contact', 'company', 'project', 'relationship'));

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE backoffice_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON backoffice_relationships;
CREATE POLICY "Service role full access"
  ON backoffice_relationships FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- TRIGGER FOR updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_relationships_updated_at ON backoffice_relationships;
CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON backoffice_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE backoffice_relationships IS
  'Universal relationships table supporting connections between any entities (contacts, companies, projects)';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Universal relationships migration complete!';
  RAISE NOTICE 'New table: backoffice_relationships';
  RAISE NOTICE 'Total relationships: %', (SELECT COUNT(*) FROM backoffice_relationships);
  RAISE NOTICE 'Added graph sync fields to: backoffice_projects';
END $$;
