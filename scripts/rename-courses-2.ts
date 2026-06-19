/**
 * Rename course titles in the DB.
 * Run with: npx tsx scripts/rename-courses-2.ts
 */
import "dotenv/config"
import { eq } from "drizzle-orm"
import db from "@/db/drizzle"
import { courses } from "@/db/schema"

const RENAMES: Record<string, string> = {
    "Adventure":     "Income",
    "Goals":         "Budgeting",
    "Net Worth":     "Loans",
    "Stock Market":  "Assets",
    "Tools":         "Investments",
}

async function main() {
    const all = await db.query.courses.findMany()
    for (const course of all) {
        const newTitle = RENAMES[course.title]
        if (newTitle) {
            await db.update(courses).set({ title: newTitle }).where(eq(courses.id, course.id))
            console.log(`  ✅ "${course.title}" → "${newTitle}"`)
        }
    }
    console.log("Done!")
    process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
