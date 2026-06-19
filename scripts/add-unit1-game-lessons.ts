import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    // Unit 1 = income course (courseId 1)
    const units = await sql`SELECT id FROM units WHERE course_id = 1 AND "order" = 1 LIMIT 1`
    if (!units.length) { console.error("Unit 1 not found"); process.exit(1) }
    const unitId = units[0].id
    console.log(`Using unit id=${unitId}`)

    const newLessons = [
        { id: 11, order: 3, title: "Gross vs. Net Income" },
        { id: 12, order: 4, title: "Earned vs. Unearned Income" },
        { id: 13, order: 5, title: "Taxability" },
        { id: 14, order: 6, title: "Tax Breakdown Pie Chart" },
        { id: 15, order: 7, title: "Disposable vs. Discretionary Income" },
        { id: 16, order: 8, title: "Income Sources" },
        { id: 17, order: 9, title: "Annual vs. Monthly" },
    ]

    for (const lesson of newLessons) {
        const existing = await sql`SELECT id FROM lessons WHERE id = ${lesson.id}`
        if (existing.length > 0) {
            console.log(`Lesson id=${lesson.id} "${lesson.title}" already exists — skipping`)
            continue
        }
        await sql`
            INSERT INTO lessons (id, unit_id, "order", title)
            VALUES (${lesson.id}, ${unitId}, ${lesson.order}, ${lesson.title})
        `
        console.log(`Inserted: id=${lesson.id} order=${lesson.order} "${lesson.title}"`)
    }

    const all = await sql`SELECT id, title, "order" FROM lessons WHERE unit_id = ${unitId} ORDER BY "order"`
    console.log("\nUnit 1 lessons:")
    all.forEach(l => console.log(`  ${l.order}. [id=${l.id}] "${l.title}"`))
    process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
