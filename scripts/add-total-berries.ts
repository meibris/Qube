import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const main = async () => {
    try {
        await sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS total_berries integer NOT NULL DEFAULT 0`
        console.log("Added total_berries column successfully")
    } catch (e) {
        console.error("Migration failed:", e)
        process.exit(1)
    }
}

main()
