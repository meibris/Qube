import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    await sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS character_data text`
    await sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0`
    await sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_streak_date text`
    console.log("Columns added successfully")
    process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
