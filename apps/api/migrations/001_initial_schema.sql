CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  prestige_rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  power INTEGER NOT NULL DEFAULT 100,
  map_name TEXT NOT NULL DEFAULT 'Sunfall Causeway',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  bonded_pet_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  affinity TEXT NOT NULL,
  role TEXT NOT NULL,
  base_power INTEGER NOT NULL DEFAULT 100,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES pet_templates(id),
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  bond_level INTEGER NOT NULL DEFAULT 1,
  evolution_stage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slot TEXT NOT NULL,
  rarity TEXT NOT NULL,
  effect_text TEXT NOT NULL,
  stack_limit INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES item_templates(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pvp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  winner_character_id UUID REFERENCES characters(id),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_account_id ON characters(account_id);
CREATE INDEX IF NOT EXISTS idx_pets_character_id ON pets(character_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_character_id ON inventory_items(character_id);

INSERT INTO pet_templates (slug, name, affinity, role, base_power, skills)
VALUES
  ('pet-ember-lynx', 'Ember Lynx', 'ember', 'assassin companion', 140, '["Cinder Pounce", "Solar Fang", "Heat Mirage"]'::jsonb),
  ('pet-tide-seraph', 'Tide Seraph', 'tide', 'support companion', 125, '["Foam Guard", "Moonwake", "Harbor Pulse"]'::jsonb),
  ('pet-verdant-drake', 'Verdant Drake', 'verdant', 'bruiser companion', 150, '["Bramble Crash", "Sporespike", "Wild Resurgence"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO item_templates (slug, name, slot, rarity, effect_text, stack_limit)
VALUES
  ('loot-aurora-blade', 'Aurora Blade', 'weapon', 'mythic', 'Critical hits accelerate pet ultimate charge by 12%.', 1),
  ('loot-citadel-mantle', 'Citadel Mantle', 'chest', 'epic', 'Reduces crowd control duration while contesting relic objectives.', 1),
  ('loot-rift-ring', 'Rift Ring', 'accessory', 'legendary', 'PvP takedowns open a short blink portal for bonded companions.', 1)
ON CONFLICT (slug) DO NOTHING;
