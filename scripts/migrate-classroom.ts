import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    console.log("Running classroom migration...")

    await sql`
        CREATE TABLE IF NOT EXISTS classrooms (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '📚',
            school TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            teacher_user_id TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS classroom_members (
            id SERIAL PRIMARY KEY,
            classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            joined_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    await sql`
        ALTER TABLE user_progress
        ADD COLUMN IF NOT EXISTS role TEXT
    `

    console.log("Migration complete.")
}

main().catch(console.error)
