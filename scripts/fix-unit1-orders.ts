/**
 * One-time fix: sets exact orders for all unit 1 lessons by ID.
 * Safe to run multiple times — uses explicit ID-based UPDATEs.
 */
import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
    console.log("Current unit 1 state:")
    const before = await sql`SELECT id, title, "order" FROM lessons WHERE unit_id = 1 ORDER BY "order", id`
    before.forEach(l => console.log(`  order=${l.order}  id=${l.id}  ${l.title}`))

    // Desired layout:
    //  order 1 → id=1   Choose Your Career       (Section 1: The Offer Letter)
    //  order 2 → id=200  Gross vs Net Income      (Section 1)
    //  order 3 → id=201  Earned vs Unearned       (Section 1)
    //  order 4 → id=2    First Day on the Job     (Section 2: The First Day)
    //  order 5 → id=202  Taxability               (Section 2)
    //  order 6 → id=203  Tax Pie Chart            (Section 2)
    //  order 7 → id=204  Disposable vs Discretionary (Section 3: The Paycheck)
    //  order 8 → id=205  Income Sources           (Section 3)
    //  order 9 → id=206  Annual vs Monthly Pay    (Section 3)

    // Park everything at temp values first to avoid order conflicts
    await sql`UPDATE lessons SET "order" = "order" + 100 WHERE unit_id = 1`

    // Set each lesson to its correct order by ID
    await sql`UPDATE lessons SET "order" = 1 WHERE id = 1`
    await sql`UPDATE lessons SET "order" = 2 WHERE id = 200`
    await sql`UPDATE lessons SET "order" = 3 WHERE id = 201`
    await sql`UPDATE lessons SET "order" = 4 WHERE id = 2`
    await sql`UPDATE lessons SET "order" = 5 WHERE id = 202`
    await sql`UPDATE lessons SET "order" = 6 WHERE id = 203`
    await sql`UPDATE lessons SET "order" = 7 WHERE id = 204`
    await sql`UPDATE lessons SET "order" = 8 WHERE id = 205`
    await sql`UPDATE lessons SET "order" = 9 WHERE id = 206`

    // Delete any stray lessons that weren't assigned a final order (still have order 100+)
    const stray = await sql`SELECT id, title, "order" FROM lessons WHERE unit_id = 1 AND "order" > 50`
    if (stray.length) {
        console.log("\nDeleting stray/duplicate lessons:")
        for (const l of stray) {
            console.log(`  Deleting id=${l.id} "${l.title}" (order=${l.order})`)
            await sql`DELETE FROM lessons WHERE id = ${l.id}`
        }
    }

    console.log("\nFixed unit 1 state:")
    const after = await sql`SELECT id, title, "order" FROM lessons WHERE unit_id = 1 ORDER BY "order"`
    after.forEach(l => console.log(`  order=${l.order}  id=${l.id}  ${l.title}`))

    process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
