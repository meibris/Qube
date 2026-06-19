import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    // Current state: order 2=Verb, 3=Nouns, 4=Verb, 5=Verb, 6=Verb
    // Target:        order 1=Verb, 2=Verb, 3=Nouns, 4=Verb, 5=Verb
    // Move order-2 down to order-1
    const units = await sql`SELECT DISTINCT unit_id FROM lessons`

    for (const { unit_id } of units) {
        // Get lesson at order 2
        const [lesson2] = await sql`SELECT id FROM lessons WHERE unit_id = ${unit_id} AND "order" = 2`
        if (lesson2) {
            await sql`UPDATE lessons SET "order" = 1 WHERE id = ${lesson2.id}`
            console.log(`  Moved lesson id=${lesson2.id} from order=2 to order=1 in unit ${unit_id}`)
        }
    }

    const updated = await sql`SELECT id, title, unit_id, "order" FROM lessons ORDER BY unit_id, "order"`
    console.log("Updated lessons:")
    updated.forEach(l => console.log(`  id=${l.id} unit=${l.unit_id} order=${l.order} title=${l.title}`))

    process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
