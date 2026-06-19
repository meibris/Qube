import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    const before = await sql`SELECT id, title, "order" FROM lessons ORDER BY "order"`
    console.log("Before:"); before.forEach(l => console.log(`  ${l.order}. [id=${l.id}] "${l.title}"`))

    const units = await sql`SELECT id FROM units LIMIT 1`
    if (!units.length) { console.error("No units found"); process.exit(1) }
    const unitId = units[0].id

    // Check if lesson 2 already exists
    const existing = await sql`SELECT id FROM lessons WHERE "order" = 2`
    if (existing.length > 0) {
        console.log(`Lesson 2 already exists (id=${existing[0].id}) — skipping insert`)
    } else {
        const [lesson] = await sql`
            INSERT INTO lessons (title, unit_id, "order")
            VALUES ('First Day at Work', ${unitId}, 2)
            RETURNING id, title, "order"
        `
        console.log(`Inserted: id=${lesson.id} order=${lesson.order} "${lesson.title}"`)
    }

    const after = await sql`SELECT id, title, "order" FROM lessons ORDER BY "order"`
    console.log("\nFinal:"); after.forEach(l => console.log(`  ${l.order}. [id=${l.id}] "${l.title}"`))
    process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
