import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    await sql`UPDATE lessons SET "order" = 2 WHERE id = 3`
    await sql`UPDATE lessons SET "order" = 4 WHERE id = 4`
    await sql`UPDATE lessons SET "order" = 5 WHERE id = 5`
    const rows = await sql`SELECT id, title, "order" FROM lessons ORDER BY "order"`
    rows.forEach(r => console.log(`order=${r.order} id=${r.id} ${r.title}`))
    process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
