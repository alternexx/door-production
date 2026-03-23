import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../db";
import { sql } from "drizzle-orm";

type AppDeal = { id: string; address: string; application_price: string | null };
type RentalMatch = { price: number };

async function backfill() {
  // Fetch all application deals
  const apps = await db.execute<AppDeal>(sql`
    SELECT id, address, application_price FROM deals WHERE deal_type = 'application'
  `);

  let updated = 0;
  let skipped = 0;

  for (const app of apps.rows) {
    // Find matching rental by address
    const rentals = await db.execute<RentalMatch>(sql`
      SELECT price FROM deals
      WHERE deal_type = 'rental' AND LOWER(TRIM(address)) = LOWER(TRIM(${app.address}))
      LIMIT 1
    `);

    const rentalPrice = rentals.rows[0]?.price;
    if (rentalPrice != null) {
      await db.execute(sql`
        UPDATE deals SET application_price = ${rentalPrice} WHERE id = ${app.id}
      `);
      console.log(`Updated ${app.address} → $${rentalPrice}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (no match): ${skipped}, Total: ${apps.rows.length}`);
  process.exit(0);
}

backfill();
