import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    // Show current lessons
    const lessons = await sql`SELECT id, title, unit_id, "order" FROM lessons ORDER BY unit_id, "order"`
    console.log("Current lessons:")
    lessons.forEach(l => console.log(`  id=${l.id} unit=${l.unit_id} order=${l.order} title=${l.title}`))

    // Find the lesson with order=1 in each unit and move it to order=3
    // First: shift existing order-2 to order-4, order-3 to order-5, etc. (to avoid conflicts)
    // Then move order-1 to order-3, order-2 stays, order-3+ shift back

    // Get unit IDs
    const units = await sql`SELECT DISTINCT unit_id FROM lessons`

    for (const { unit_id } of units) {
        const unitLessons = await sql`SELECT id, "order" FROM lessons WHERE unit_id = ${unit_id} ORDER BY "order"`
        console.log(`\nProcessing unit ${unit_id} with ${unitLessons.length} lessons`)

        if (unitLessons.length < 1) continue

        const lesson1 = unitLessons.find(l => l.order === 1)
        if (!lesson1) {
            console.log("  No lesson with order=1 found, skipping")
            continue
        }

        // Temporarily set lesson1 order to 999 to avoid conflicts
        await sql`UPDATE lessons SET "order" = 999 WHERE id = ${lesson1.id}`

        // Shift lessons with order >= 3 up by 1 (to make room for lesson1 at position 3)
        await sql`UPDATE lessons SET "order" = "order" + 1 WHERE unit_id = ${unit_id} AND "order" >= 3 AND "order" < 999`

        // Place lesson1 at order=3
        await sql`UPDATE lessons SET "order" = 3 WHERE id = ${lesson1.id}`

        console.log(`  Moved lesson id=${lesson1.id} from order=1 to order=3`)
    }

    const updated = await sql`SELECT id, title, unit_id, "order" FROM lessons ORDER BY unit_id, "order"`
    console.log("\nUpdated lessons:")
    updated.forEach(l => console.log(`  id=${l.id} unit=${l.unit_id} order=${l.order} title=${l.title}`))

    process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
