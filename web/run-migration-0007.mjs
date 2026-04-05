import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
}

const sql = neon(process.env.k10_DATABASE_URL)

// Run statements sequentially using tagged template
async function run() {
  console.log('Running migration 0007_theme_sets...\n')

  // 1. Create theme_sets table
  console.log('  [1/8] Creating theme_sets table...')
  await sql`CREATE TABLE IF NOT EXISTS "theme_sets" (
    "slug" varchar(32) PRIMARY KEY NOT NULL,
    "name" varchar(64) NOT NULL,
    "description" text,
    "livery_image" text,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`
  console.log('       OK')

  // 2. Seed default set
  console.log('  [2/8] Seeding default theme set...')
  await sql`INSERT INTO "theme_sets" ("slug", "name", "description", "sort_order")
    VALUES ('default', 'Default', 'The original K10 Motorsports dark/light theme', 0)
    ON CONFLICT ("slug") DO NOTHING`
  console.log('       OK')

  // 3. Add set_slug to theme_overrides
  console.log('  [3/8] Adding set_slug to theme_overrides...')
  try {
    await sql`ALTER TABLE "theme_overrides" ADD COLUMN "set_slug" varchar(32) NOT NULL DEFAULT 'default'`
    console.log('       OK')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('       Already exists, skipping')
    } else throw e
  }

  // 4. Drop old unique constraint, create new one
  console.log('  [4/8] Updating unique constraint on theme_overrides...')
  try {
    await sql`ALTER TABLE "theme_overrides" DROP CONSTRAINT IF EXISTS "theme_overrides_theme_id_token_path_unique"`
  } catch (e) { /* may not exist */ }
  try {
    await sql`ALTER TABLE "theme_overrides" ADD CONSTRAINT "theme_overrides_set_slug_theme_id_token_path_unique" UNIQUE("set_slug", "theme_id", "token_path")`
    console.log('       OK')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('       Already exists, skipping')
    } else throw e
  }

  // 5. FK from theme_overrides.set_slug → theme_sets.slug
  console.log('  [5/8] Adding FK theme_overrides.set_slug -> theme_sets.slug...')
  try {
    await sql`ALTER TABLE "theme_overrides" ADD CONSTRAINT "theme_overrides_set_slug_theme_sets_slug_fk" FOREIGN KEY ("set_slug") REFERENCES "public"."theme_sets"("slug") ON DELETE cascade ON UPDATE no action`
    console.log('       OK')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('       Already exists, skipping')
    } else throw e
  }

  // 6. Add set_slug to token_builds
  console.log('  [6/8] Adding set_slug to token_builds...')
  try {
    await sql`ALTER TABLE "token_builds" ADD COLUMN "set_slug" varchar(32) NOT NULL DEFAULT 'default'`
    console.log('       OK')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('       Already exists, skipping')
    } else throw e
  }

  // 7. FK from token_builds.set_slug → theme_sets.slug
  console.log('  [7/8] Adding FK token_builds.set_slug -> theme_sets.slug...')
  try {
    await sql`ALTER TABLE "token_builds" ADD CONSTRAINT "token_builds_set_slug_theme_sets_slug_fk" FOREIGN KEY ("set_slug") REFERENCES "public"."theme_sets"("slug") ON DELETE cascade ON UPDATE no action`
    console.log('       OK')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('       Already exists, skipping')
    } else throw e
  }

  // 8. Seed F1 theme sets
  console.log('  [8/8] Seeding F1 team theme sets...')
  const teams = [
    ['red-bull', 'Red Bull Racing', 'Dark navy and yellow — Oracle Red Bull Racing RB20', 1],
    ['ferrari', 'Scuderia Ferrari', 'Rosso corsa and black — Ferrari SF-24', 2],
    ['mclaren', 'McLaren', 'Papaya orange and blue — McLaren MCL38', 3],
    ['mercedes', 'Mercedes-AMG', 'Silver and teal — Mercedes W15', 4],
    ['aston-martin', 'Aston Martin', 'British racing green and lime — AMR24', 5],
    ['alpine', 'Alpine', 'French blue and pink — Alpine A524', 6],
    ['williams', 'Williams', 'Navy blue and light blue — Williams FW46', 7],
    ['rb', 'RB (VCARB)', 'Dark blue and grey — Visa Cash App RB VCARB 01', 8],
    ['haas', 'Haas', 'White, red, and black — Haas VF-24', 9],
    ['kick-sauber', 'Kick Sauber', 'Black and green — Stake F1 Team Kick Sauber C44', 10],
    ['cadillac', 'Cadillac', 'Black and gold — Cadillac F1 (2026 entrant)', 11],
  ]
  for (const [slug, name, desc, order] of teams) {
    await sql`INSERT INTO "theme_sets" ("slug", "name", "description", "sort_order")
      VALUES (${slug}, ${name}, ${desc}, ${order})
      ON CONFLICT ("slug") DO NOTHING`
  }
  console.log('       OK')

  console.log('\nMigration 0007 complete!')
}

run().catch(err => { console.error('FATAL:', err); process.exit(1) })
