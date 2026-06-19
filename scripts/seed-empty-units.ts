/**
 * Replaces the old quiz-based lessons for courses 2-5 with empty game-style
 * lessons (no challenges), matching unit 1's format.
 *
 * Run with:  npx tsx scripts/seed-empty-units.ts
 *
 * Safe to run multiple times — deletes & re-inserts idempotently.
 */
import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// ─── lesson plan ─────────────────────────────────────────────────────────────

const UNITS = [
    { id: 2, courseId: 2, title: "Unit 1", description: "Making a Budget",     order: 1 },
    { id: 3, courseId: 3, title: "Unit 1", description: "Understanding Loans", order: 1 },
    { id: 4, courseId: 4, title: "Unit 1", description: "Building Assets",     order: 1 },
    { id: 5, courseId: 5, title: "Unit 1", description: "Smart Investing",     order: 1 },
]

// Lessons — IDs 20-26 (Budget), 30-36 (Loans), 40-46 (Assets), 50-56 (Investments)
// No challenges: these are empty placeholders for future interactive game pages.
const LESSONS: { id: number; unitId: number; order: number; title: string }[] = [
    // ── Unit 2: Budget ────────────────────────────────────────────────────────
    { id: 20, unitId: 2, order: 1, title: "Budget Basics" },
    { id: 21, unitId: 2, order: 2, title: "50/30/20 Rule" },
    { id: 22, unitId: 2, order: 3, title: "Fixed vs Variable Expenses" },
    { id: 23, unitId: 2, order: 4, title: "Needs vs Wants" },
    { id: 24, unitId: 2, order: 5, title: "Emergency Fund" },
    { id: 25, unitId: 2, order: 6, title: "Saving Goals" },
    { id: 26, unitId: 2, order: 7, title: "Monthly Budget Builder" },

    // ── Unit 3: Loans ─────────────────────────────────────────────────────────
    { id: 30, unitId: 3, order: 1, title: "What Is a Loan?" },
    { id: 31, unitId: 3, order: 2, title: "Simple vs Compound Interest" },
    { id: 32, unitId: 3, order: 3, title: "Types of Loans" },
    { id: 33, unitId: 3, order: 4, title: "Credit Scores" },
    { id: 34, unitId: 3, order: 5, title: "Good Debt vs Bad Debt" },
    { id: 35, unitId: 3, order: 6, title: "Loan Terms Calculator" },
    { id: 36, unitId: 3, order: 7, title: "Paying Off Debt" },

    // ── Unit 4: Assets ────────────────────────────────────────────────────────
    { id: 40, unitId: 4, order: 1, title: "What Are Assets?" },
    { id: 41, unitId: 4, order: 2, title: "Assets vs Liabilities" },
    { id: 42, unitId: 4, order: 3, title: "Net Worth" },
    { id: 43, unitId: 4, order: 4, title: "Types of Assets" },
    { id: 44, unitId: 4, order: 5, title: "Growing Your Assets" },
    { id: 45, unitId: 4, order: 6, title: "Real Estate Basics" },
    { id: 46, unitId: 4, order: 7, title: "Your Personal Balance Sheet" },

    // ── Unit 5: Investments ───────────────────────────────────────────────────
    { id: 50, unitId: 5, order: 1, title: "Why Invest?" },
    { id: 51, unitId: 5, order: 2, title: "Stock Market Basics" },
    { id: 52, unitId: 5, order: 3, title: "Compound Interest" },
    { id: 53, unitId: 5, order: 4, title: "Diversification" },
    { id: 54, unitId: 5, order: 5, title: "Risk vs Reward" },
    { id: 55, unitId: 5, order: 6, title: "Retirement Accounts" },
    { id: 56, unitId: 5, order: 7, title: "Building Your Portfolio" },
]

// Old lesson IDs from seed-all-units.ts that had quiz challenges
const OLD_LESSON_IDS = [3, 4, 5, 6, 7, 8, 9, 10]

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
    // 1. Remove old quiz data (challenge_progress → challenge_options → challenges → lessons)
    console.log("Removing old quiz-based lesson data…")
    for (const id of OLD_LESSON_IDS) {
        // challenge_progress
        await sql`
            DELETE FROM challenge_progress
            WHERE challenge_id IN (
                SELECT id FROM challenges WHERE lessons_id = ${id}
            )
        `
        // challenge_options
        await sql`
            DELETE FROM challenge_options
            WHERE challenge_id IN (
                SELECT id FROM challenges WHERE lessons_id = ${id}
            )
        `
        // challenges
        await sql`DELETE FROM challenges WHERE lessons_id = ${id}`
        // lesson
        await sql`DELETE FROM lessons WHERE id = ${id}`
    }
    console.log(`Removed ${OLD_LESSON_IDS.length} old lessons and their challenges.`)

    // 2. Upsert units (in case they're missing)
    console.log("Upserting units…")
    for (const u of UNITS) {
        await sql`
            INSERT INTO units (id, course_id, title, description, "order")
            VALUES (${u.id}, ${u.courseId}, ${u.title}, ${u.description}, ${u.order})
            ON CONFLICT (id) DO UPDATE
                SET title = EXCLUDED.title,
                    description = EXCLUDED.description
        `
    }

    // 3. Insert empty lessons
    console.log("Inserting empty lessons…")
    for (const l of LESSONS) {
        await sql`
            INSERT INTO lessons (id, unit_id, title, "order")
            VALUES (${l.id}, ${l.unitId}, ${l.title}, ${l.order})
            ON CONFLICT (id) DO NOTHING
        `
        console.log(`  ✓ [unit ${l.unitId}] ${l.order}. ${l.title}`)
    }

    // 4. Print summary
    console.log("\n── Summary ──────────────────────────────────────────────────")
    for (const u of UNITS) {
        const rows = await sql`
            SELECT "order", title FROM lessons WHERE unit_id = ${u.id} ORDER BY "order"
        `
        console.log(`\nUnit ${u.id} (${u.description}):`)
        rows.forEach(r => console.log(`  ${r.order}. ${r.title}`))
    }

    console.log("\n✅ Done!")
    process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
