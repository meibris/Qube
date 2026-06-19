import "dotenv/config"

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

import * as schema from "../db/schema"

const sql = neon(process.env.DATABASE_URL!)
// @ts-ignore
const db = drizzle(sql, { schema })

const main = async () => {
    try {
        console.log("Seeding database")

        await db.delete(schema.courses)
        await db.delete(schema.userProgress)
        await db.delete(schema.units)
        await db.delete(schema.lessons)
        await db.delete(schema.challenges)
        await db.delete(schema.challengeOptions)
        await db.delete(schema.challengeProgress)

        // ── Courses ───────────────────────────────────────────────────────────
        await db.insert(schema.courses).values([
            { id: 1, title: "Income",      imageSrc: "/TaxesSymbol.svg" },
            { id: 2, title: "Budget",      imageSrc: "/BudgetSymbol.svg" },
            { id: 3, title: "Loans",       imageSrc: "/LoanSymbol.svg" },
            { id: 4, title: "Assets",      imageSrc: "/AssetSymbol.svg" },
            { id: 5, title: "Investments", imageSrc: "/InvestmentSymbol.svg" },
        ])

        // ── Units (one per course) ────────────────────────────────────────────
        await db.insert(schema.units).values([
            {
                id: 1, courseId: 1, order: 1,
                title: "Unit 1",
                description: "Where does money come from?",
            },
            {
                id: 2, courseId: 2, order: 1,
                title: "Unit 1",
                description: "Plan where your money goes",
            },
            {
                id: 3, courseId: 3, order: 1,
                title: "Unit 1",
                description: "Borrowing money wisely",
            },
            {
                id: 4, courseId: 4, order: 1,
                title: "Unit 1",
                description: "What you own and what it's worth",
            },
            {
                id: 5, courseId: 5, order: 1,
                title: "Unit 1",
                description: "Making your money grow",
            },
        ])

        // ── Lessons ───────────────────────────────────────────────────────────
        await db.insert(schema.lessons).values([

            // ── Unit 1: Income (9 lessons — custom game pages, no challenges) ───
            { id:  1, unitId: 1, order: 1, title: "A Day on the Island" },        // → /map (game)
            { id:  2, unitId: 1, order: 2, title: "Gross & Net Income" },         // → gross-net-income
            { id:  3, unitId: 1, order: 3, title: "The Shopkeeper's Surprise" },  // → sales-tax-game
            { id:  4, unitId: 1, order: 4, title: "Sales Tax Explained" },          // → sales-tax
            { id:  5, unitId: 1, order: 5, title: "Tax Brackets Island" },          // → map-tax (island game)
            { id:  6, unitId: 1, order: 6, title: "Tax Brackets Explained" },       // → tax-brackets
            { id:  7, unitId: 1, order: 7, title: "Spending Your Paycheck" },     // → disposable-discretionary
            { id:  8, unitId: 1, order: 8, title: "Blank" },
            { id:  9, unitId: 1, order: 9, title: "Blank" },

            // ── Unit 2: Budget (9 lessons) ────────────────────────────────────
            { id: 10, unitId: 2, order: 1, title: "What is a Budget?" },
            { id: 11, unitId: 2, order: 2, title: "Tracking Your Spending" },
            { id: 12, unitId: 2, order: 3, title: "Needs vs Wants" },
            { id: 13, unitId: 2, order: 4, title: "The 50/30/20 Rule" },
            { id: 14, unitId: 2, order: 5, title: "Building an Emergency Fund" },
            { id: 15, unitId: 2, order: 6, title: "Saving Goals" },
            { id: 16, unitId: 2, order: 7, title: "Cutting Expenses" },
            { id: 17, unitId: 2, order: 8, title: "Monthly Budget Review" },
            { id: 18, unitId: 2, order: 9, title: "Budget Challenge" },

            // ── Unit 3: Loans (9 lessons) ─────────────────────────────────────
            { id: 19, unitId: 3, order: 1, title: "What is a Loan?" },
            { id: 20, unitId: 3, order: 2, title: "Types of Loans" },
            { id: 21, unitId: 3, order: 3, title: "Understanding Interest Rates" },
            { id: 22, unitId: 3, order: 4, title: "Credit Scores" },
            { id: 23, unitId: 3, order: 5, title: "Paying Back Debt" },
            { id: 24, unitId: 3, order: 6, title: "Loan Applications" },
            { id: 25, unitId: 3, order: 7, title: "Student Loans" },
            { id: 26, unitId: 3, order: 8, title: "Mortgages" },
            { id: 27, unitId: 3, order: 9, title: "Debt Payoff Strategies" },

            // ── Unit 4: Assets (9 lessons) ────────────────────────────────────
            { id: 28, unitId: 4, order: 1, title: "What are Assets?" },
            { id: 29, unitId: 4, order: 2, title: "Assets vs Liabilities" },
            { id: 30, unitId: 4, order: 3, title: "Appreciating & Depreciating" },
            { id: 31, unitId: 4, order: 4, title: "Net Worth" },
            { id: 32, unitId: 4, order: 5, title: "Protecting What You Own" },
            { id: 33, unitId: 4, order: 6, title: "Real Estate" },
            { id: 34, unitId: 4, order: 7, title: "Vehicle Ownership" },
            { id: 35, unitId: 4, order: 8, title: "Personal Property" },
            { id: 36, unitId: 4, order: 9, title: "Building Your Asset Base" },

            // ── Unit 5: Investments (9 lessons) ───────────────────────────────
            { id: 37, unitId: 5, order: 1, title: "What is Investing?" },
            { id: 38, unitId: 5, order: 2, title: "Stocks & Bonds" },
            { id: 39, unitId: 5, order: 3, title: "Compound Interest" },
            { id: 40, unitId: 5, order: 4, title: "Diversification" },
            { id: 41, unitId: 5, order: 5, title: "Building Long-Term Wealth" },
            { id: 42, unitId: 5, order: 6, title: "Index Funds" },
            { id: 43, unitId: 5, order: 7, title: "Retirement Accounts" },
            { id: 44, unitId: 5, order: 8, title: "Risk vs Return" },
            { id: 45, unitId: 5, order: 9, title: "Investment Strategy" },
        ])
        // All income unit lessons use custom interactive game pages (no challenges).
        // Challenges for units 2-5 will be added separately.

        console.log("Seeding finished")
    } catch (error) {
        console.error(error)
        throw new Error("Failed to seed the database")
    }
}

main()
