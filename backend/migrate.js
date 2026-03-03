require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[DOOR] Running migrations...');

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('tenant','owner','broker','admin')),
        full_name     TEXT,
        phone         TEXT,
        ssn_last4     TEXT,
        ssn_hash      TEXT,
        avatar_url    TEXT,
        verified      BOOLEAN DEFAULT false,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS qual_profiles (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        id_type         TEXT,
        id_number       TEXT,
        dob             TEXT,
        annual_income   NUMERIC,
        employer        TEXT,
        employment_type TEXT,
        credit_score    INTEGER,
        credit_tier     TEXT,
        max_rent        NUMERIC,
        min_beds        INTEGER DEFAULT 0,
        min_baths       NUMERIC DEFAULT 1,
        neighborhoods   JSONB DEFAULT '[]',
        move_in_date    DATE,
        pet_friendly    BOOLEAN DEFAULT false,
        income_verified BOOLEAN DEFAULT false,
        id_verified     BOOLEAN DEFAULT false,
        credit_pulled   BOOLEAN DEFAULT false,
        qual_score      NUMERIC DEFAULT 0,
        qual_tier       TEXT DEFAULT 'unqualified',
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS listings (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id      UUID REFERENCES users(id),
        title         TEXT NOT NULL,
        address       TEXT NOT NULL,
        neighborhood  TEXT,
        city          TEXT DEFAULT 'New York',
        state         TEXT DEFAULT 'NY',
        rent          NUMERIC NOT NULL,
        beds          INTEGER NOT NULL,
        baths         NUMERIC NOT NULL,
        sqft          INTEGER,
        available     DATE,
        description   TEXT,
        amenities     JSONB DEFAULT '[]',
        images        JSONB DEFAULT '[]',
        documents     JSONB DEFAULT '[]',
        pet_friendly  BOOLEAN DEFAULT false,
        same_day      BOOLEAN DEFAULT true,
        active        BOOLEAN DEFAULT true,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id    UUID REFERENCES listings(id),
        tenant_id     UUID REFERENCES users(id),
        broker_id     UUID REFERENCES users(id),
        move_in_date  DATE NOT NULL,
        status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
        qr_code       TEXT,
        access_code   TEXT,
        monthly_rent  NUMERIC,
        notes         TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at  TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS documents (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
        listing_id    UUID REFERENCES listings(id) ON DELETE CASCADE,
        booking_id    UUID REFERENCES bookings(id) ON DELETE CASCADE,
        type          TEXT NOT NULL,
        name          TEXT NOT NULL,
        url           TEXT NOT NULL,
        size          INTEGER,
        mime_type     TEXT,
        uploaded_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id     TEXT NOT NULL,
        sender_id   UUID REFERENCES users(id),
        sender_name TEXT,
        text        TEXT NOT NULL,
        type        TEXT DEFAULT 'user',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(active, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
      CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at ASC);
    `);

    // Seed listings if none exist
    const { rows } = await client.query('SELECT COUNT(*) as c FROM listings');
    if (parseInt(rows[0].c) === 0) {
      console.log('[DOOR] Seeding listings...');
      await client.query(`
        INSERT INTO listings (title, address, neighborhood, rent, beds, baths, sqft, available, amenities, images, pet_friendly, same_day, description) VALUES
        ('Modern Studio in Midtown', '245 W 54th St, Apt 12A', 'Midtown', 2200, 0, 1, 480, CURRENT_DATE,
          '["gym","doorman","laundry","elevator"]',
          '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]',
          false, true, 'Sun-drenched studio in the heart of Midtown. Steps from Central Park and world-class dining. Newly renovated with stainless steel appliances and oak floors.'),
        ('1BR in the Heart of Brooklyn', '88 N 6th St, Apt 3B', 'Williamsburg', 2800, 1, 1, 650, CURRENT_DATE,
          '["rooftop","gym","pets ok","concierge","bike storage"]',
          '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]',
          true, true, 'Stunning 1-bedroom in the hippest block in Williamsburg. Exposed brick, chef''s kitchen, floor-to-ceiling windows. Rooftop access included.'),
        ('Luxury 2BR with Skyline Views', '1 Court Square, 22F', 'Long Island City', 3900, 2, 2, 1050, CURRENT_DATE,
          '["pool","gym","doorman","parking","rooftop","concierge","24hr security"]',
          '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"]',
          true, true, 'Resort-style living with panoramic Manhattan skyline views. This corner 2BR features floor-to-ceiling windows and a gourmet kitchen.'),
        ('Cozy 1BR in Astoria', '30-10 31st Ave, Apt 2R', 'Astoria', 2100, 1, 1, 580, CURRENT_DATE,
          '["laundry","storage","garden"]',
          '["https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"]',
          false, true, 'Quiet tree-lined block in the heart of Astoria. Close to N/W trains, parks, and some of the best Greek food in the city.'),
        ('Spacious 3BR in Harlem', '2350 Adam Clayton Powell Jr Blvd', 'Harlem', 3200, 3, 2, 1200, CURRENT_DATE,
          '["laundry","gym","elevator","storage"]',
          '["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"]',
          true, true, 'Exceptional value in Central Harlem. This gut-renovated pre-war building offers classic charm with modern finishes.'),
        ('Chic Studio in Lower East Side', '155 Delancey St, Apt 5C', 'Lower East Side', 2500, 0, 1, 430, CURRENT_DATE,
          '["doorman","gym","package room"]',
          '["https://images.unsplash.com/photo-1555636222-cae831e670b3?w=800"]',
          false, true, 'Trendy studio steps from the Williamsburg Bridge. Perfect for the urban professional. Custom closets and a sleek open kitchen.'),
        ('2BR Brownstone Floor-Thru in Park Slope', '412 Bergen St, Apt 2', 'Park Slope', 4200, 2, 1, 950, CURRENT_DATE,
          '["backyard","laundry","storage","deck"]',
          '["https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800"]',
          true, true, 'Classic Park Slope brownstone floor-thru with original details. Private backyard perfect for entertaining. Steps from Prospect Park.'),
        ('High-Rise Studio in FiDi', '75 Wall St, Apt 18H', 'Financial District', 2600, 0, 1, 500, CURRENT_DATE,
          '["pool","gym","doorman","concierge","rooftop","dry cleaning"]',
          '["https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=800"]',
          false, true, 'Full-service luxury in the Financial District. Hotel-style amenities including a lap pool and rooftop lounge. Steps from Fulton Center.')
        ON CONFLICT DO NOTHING;
      `);
      console.log('[DOOR] Seeded 8 listings');
    }

    console.log('[DOOR] ✅ Migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[DOOR] Migration failed:', err);
  process.exit(1);
});
