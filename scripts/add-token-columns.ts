/**
 * Run once to add token columns to user_progress:
 *   npx tsx scripts/add-token-columns.ts
 */
import "dotenv/config"
import { sql } from "drizzle-orm"
import db from "@/db/drizzle"

async function main() {
    await db.execute(sql`
        ALTER TABLE user_progress
        ADD COLUMN IF NOT EXISTS tokens       INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS token_rate   INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS job_started_at TEXT
    `)
    console.log("✅ Token columns added to user_progress")
    process.exit(0)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
