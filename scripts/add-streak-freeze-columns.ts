/**
 * npx tsx scripts/add-streak-freeze-columns.ts
 */
import "dotenv/config"
import { sql } from "drizzle-orm"
import db from "@/db/drizzle"

async function main() {
    await db.execute(sql`
        ALTER TABLE user_progress
        ADD COLUMN IF NOT EXISTS streak_freezes  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS freeze_used_at  TEXT
    `)
    console.log("✅ Streak freeze columns added")
    process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
