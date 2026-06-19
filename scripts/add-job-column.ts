import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    await sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS job_data text`
    console.log("job_data column added successfully")
    process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
