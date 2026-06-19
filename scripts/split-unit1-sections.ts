import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    const before = await sql`SELECT id, title, "order" FROM lessons WHERE unit_id = 1 ORDER BY "order"`
    console.log("Before:")
    before.forEach(l => console.log(`  order=${l.order}  id=${l.id}  ${l.title}`))

    // ── Step 1: move "First Day on the Job" from order 2 → order 4 ───────────
    const firstDay = before.find(l => l.order === 2)
    if (firstDay) {
        await sql`UPDATE lessons SET "order" = 4 WHERE id = ${firstDay.id}`
        console.log(`\nMoved "First Day on the Job" (id=${firstDay.id}) from order 2 → 4`)
    }

    // ── Step 2: insert the 7 remaining lessons for unit 1 (safe / idempotent) ─
    // These correspond to the custom game routes already wired in app/lesson/page.tsx.
    // Using high IDs (200-206) to avoid any conflict with other units.
    const newLessons = [
        { id: 200, order: 2, title: "Gross vs Net Income" },
        { id: 201, order: 3, title: "Earned vs Unearned Income" },
        { id: 202, order: 5, title: "Taxability" },
        { id: 203, order: 6, title: "Tax Pie Chart" },
        { id: 204, order: 7, title: "Disposable vs Discretionary" },
        { id: 205, order: 8, title: "Income Sources" },
        { id: 206, order: 9, title: "Annual vs Monthly Pay" },
    ]

    for (const l of newLessons) {
        await sql`
            INSERT INTO lessons (id, unit_id, title, "order")
            VALUES (${l.id}, 1, ${l.title}, ${l.order})
            ON CONFLICT (id) DO NOTHING
        `
        console.log(`  Inserted lesson id=${l.id} order=${l.order} "${l.title}"`)
    }

    const after = await sql`SELECT id, title, "order" FROM lessons WHERE unit_id = 1 ORDER BY "order"`
    console.log("\nAfter:")
    after.forEach(l => console.log(`  order=${l.order}  id=${l.id}  ${l.title}`))

    process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
